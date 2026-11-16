import os
import fitz  # PyMuPDF
from typing import List, Dict, Any
from backend.app.core.config import settings
from backend.app.core.security import sanitize_text

class DocumentProcessor:
    """Extracts, cleans, and semantically chunks technical industrial manuals and SOPs."""

    def __init__(self, chunk_size: int = None, chunk_overlap: int = None):
        self.chunk_size = chunk_size or settings.CHUNK_SIZE
        self.chunk_overlap = chunk_overlap or settings.CHUNK_OVERLAP

    def extract_from_pdf(self, file_path: str) -> List[Dict[str, Any]]:
        """Extract text page by page from PDF using PyMuPDF (fitz)."""
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"PDF file not found at: {file_path}")

        pages_data = []
        doc = fitz.open(file_path)
        try:
            for page_num in range(len(doc)):
                page = doc[page_num]
                text = page.get_text("text")
                cleaned_text = sanitize_text(text)
                if cleaned_text:
                    pages_data.append({
                        "page_number": page_num + 1,
                        "text": cleaned_text
                    })
        finally:
            doc.close()
        return pages_data

    def extract_from_text(self, file_path: str) -> List[Dict[str, Any]]:
        """Extract text from plain text or markdown files."""
        with open(file_path, "r", encoding="utf-8", errors="replace") as f:
            content = f.read()
        cleaned_text = sanitize_text(content)
        return [{"page_number": 1, "text": cleaned_text}]

    def chunk_document(self, filename: str, pages_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Divide extracted page texts into semantic overlapping chunks with complete metadata."""
        chunks = []
        chunk_index = 0

        for page in pages_data:
            page_num = page["page_number"]
            text = page["text"]

            # Split by paragraphs or double newlines first to preserve semantic cohesion
            paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
            current_chunk = ""

            for p in paragraphs:
                if len(current_chunk) + len(p) + 2 <= self.chunk_size:
                    current_chunk = (current_chunk + "\n\n" + p).strip()
                else:
                    if current_chunk:
                        chunks.append({
                            "chunk_index": chunk_index,
                            "page_number": page_num,
                            "document_name": filename,
                            "content": current_chunk
                        })
                        chunk_index += 1
                        # Retain overlap from end of current chunk
                        words = current_chunk.split()
                        overlap_words = words[-max(1, self.chunk_overlap // 5):]
                        current_chunk = " ".join(overlap_words) + "\n\n" + p
                    else:
                        # Single paragraph exceeds chunk size, split by sentences or slice
                        words = p.split()
                        start = 0
                        while start < len(words):
                            end = start + (self.chunk_size // 6)
                            chunk_str = " ".join(words[start:end])
                            chunks.append({
                                "chunk_index": chunk_index,
                                "page_number": page_num,
                                "document_name": filename,
                                "content": chunk_str
                            })
                            chunk_index += 1
                            start = end - (self.chunk_overlap // 6) if end < len(words) else end

            if current_chunk:
                chunks.append({
                    "chunk_index": chunk_index,
                    "page_number": page_num,
                    "document_name": filename,
                    "content": current_chunk
                })
                chunk_index += 1

        return chunks

    def process_file(self, file_path: str, filename: str) -> List[Dict[str, Any]]:
        """Main pipeline to extract and chunk an uploaded document."""
        ext = os.path.splitext(file_path)[1].lower()
        if ext == ".pdf":
            pages_data = self.extract_from_pdf(file_path)
        else:
            pages_data = self.extract_from_text(file_path)

        if not pages_data:
            return []

        return self.chunk_document(filename, pages_data)
