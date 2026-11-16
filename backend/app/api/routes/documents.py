import os
import shutil
import json
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from backend.app.database.connection import get_db
from backend.app.models.database import Document, DocumentChunk
from backend.app.schemas.document import DocumentResponse, DocumentChunkResponse, DocumentUploadResponse
from backend.app.core.config import settings
from backend.app.core.security import validate_uploaded_file
from backend.app.services.document_processor import DocumentProcessor
from backend.app.services.embedding_service import embedding_service
from backend.app.services.vector_store import vector_store

router = APIRouter(prefix="/documents", tags=["Document Knowledge Base"])

doc_processor = DocumentProcessor()

@router.get("", response_model=List[DocumentResponse])
def get_documents(db: Session = Depends(get_db)):
    """List all indexed technical manuals, SOPs, and error code specifications."""
    docs = db.query(Document).order_by(Document.upload_timestamp.desc()).all()
    return docs

@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    file: UploadFile = File(...),
    document_type: str = Form("TECHNICAL_MANUAL"),
    db: Session = Depends(get_db)
):
    """Upload a PDF or text manual, extract pages, chunk content, generate embeddings, and index into FAISS."""
    # Read file content into memory to check size
    content = await file.read()
    file_size = len(content)

    valid, msg = validate_uploaded_file(file.filename, file_size)
    if not valid:
        raise HTTPException(status_code=400, detail=msg)

    # Save to uploads directory
    safe_name = os.path.basename(file.filename)
    dest_path = os.path.join(settings.UPLOAD_DIR, safe_name)
    with open(dest_path, "wb") as f:
        f.write(content)

    # Process and chunk document
    try:
        chunks = doc_processor.process_file(dest_path, safe_name)
    except Exception as e:
        if os.path.exists(dest_path):
            os.remove(dest_path)
        raise HTTPException(status_code=500, detail=f"Failed to process document: {str(e)}")

    if not chunks:
        raise HTTPException(status_code=400, detail="No readable text could be extracted from the uploaded document.")

    # Save document record
    doc_record = Document(
        filename=safe_name,
        original_name=file.filename,
        file_path=dest_path,
        file_size=file_size,
        page_count=max([c.get("page_number", 1) for c in chunks]),
        chunk_count=len(chunks),
        document_type=document_type,
        status="INDEXED",
        summary=f"Technical documentation containing {len(chunks)} chunks across {max([c.get('page_number', 1) for c in chunks])} pages."
    )
    db.add(doc_record)
    db.flush()

    # Save chunks to database & prepare for vector store
    all_chunks_metadata = []
    all_chunks_text = []

    for c in chunks:
        chunk_obj = DocumentChunk(
            document_id=doc_record.id,
            chunk_index=c["chunk_index"],
            page_number=c["page_number"],
            content=c["content"],
            metadata_json=json.dumps({"document_name": safe_name, "page": c["page_number"]})
        )
        db.add(chunk_obj)

        meta = {
            "document_id": doc_record.id,
            "document_name": safe_name,
            "page_number": c["page_number"],
            "chunk_index": c["chunk_index"],
            "content": c["content"]
        }
        all_chunks_metadata.append(meta)
        all_chunks_text.append(c["content"])

    # Embed and add to Vector Store (FAISS)
    vectors = embedding_service.embed_documents(all_chunks_text)
    vector_store.add_chunks(vectors, all_chunks_metadata)

    db.commit()

    return DocumentUploadResponse(
        message=f"Successfully indexed document '{safe_name}' into FAISS vector database.",
        document_id=doc_record.id,
        filename=safe_name,
        page_count=doc_record.page_count,
        chunk_count=doc_record.chunk_count,
        status="INDEXED"
    )

@router.get("/{document_id}/chunks", response_model=List[DocumentChunkResponse])
def get_document_chunks(document_id: int, db: Session = Depends(get_db)):
    """Inspect all semantic chunks and page mappings for an indexed document."""
    chunks = db.query(DocumentChunk).filter(DocumentChunk.document_id == document_id).order_by(DocumentChunk.chunk_index.asc()).all()
    if not chunks:
        raise HTTPException(status_code=404, detail="No chunks found for this document.")
    return chunks

@router.delete("/{document_id}")
def delete_document(document_id: int, db: Session = Depends(get_db)):
    """Delete a document and refresh vector store."""
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")

    if os.path.exists(doc.file_path):
        try:
            os.remove(doc.file_path)
        except Exception:
            pass

    db.delete(doc)
    db.commit()

    # Rebuild vector store from remaining database chunks
    all_chunks = db.query(DocumentChunk, Document.filename).join(Document).all()
    vector_store.clear()
    if all_chunks:
        meta_list = []
        text_list = []
        for chunk, filename in all_chunks:
            meta = {
                "document_id": chunk.document_id,
                "document_name": filename,
                "page_number": chunk.page_number,
                "chunk_index": chunk.chunk_index,
                "content": chunk.content
            }
            meta_list.append(meta)
            text_list.append(chunk.content)
        vectors = embedding_service.embed_documents(text_list)
        vector_store.add_chunks(vectors, meta_list)

    return {"message": f"Document ID {document_id} and its indexed vector chunks deleted successfully."}
