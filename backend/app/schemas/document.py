from pydantic import BaseModel, Field
from typing import Optional, List
import datetime

class DocumentChunkResponse(BaseModel):
    id: int
    chunk_index: int
    page_number: int
    content: str
    metadata_json: Optional[str] = "{}"

    class Config:
        from_attributes = True

class DocumentResponse(BaseModel):
    id: int
    filename: str
    original_name: str
    file_size: int
    page_count: int
    chunk_count: int
    document_type: str
    upload_timestamp: datetime.datetime
    status: str
    summary: Optional[str] = ""

    class Config:
        from_attributes = True

class DocumentUploadResponse(BaseModel):
    message: str
    document_id: int
    filename: str
    page_count: int
    chunk_count: int
    status: str
