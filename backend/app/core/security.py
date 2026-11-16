import re
import html
from typing import Tuple

ALLOWED_EXTENSIONS = {".pdf", ".txt", ".md", ".json"}
MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024  # 25 MB limit

# Industrial safety patterns: prevent instruction hijacking from untrusted uploaded PDFs
INJECTION_PATTERNS = [
    r"ignore (all )?previous instructions",
    r"disregard the above",
    r"system override",
    r"you are now a",
    r"execute arbitrary code",
    r"admin command",
    r"<script.*?>",
    r"javascript:"
]

def validate_uploaded_file(filename: str, file_size: int) -> Tuple[bool, str]:
    """Validate uploaded document file size and extension."""
    if not filename:
        return False, "File name cannot be empty."
    
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in ALLOWED_EXTENSIONS:
        return False, f"Unsupported file format '{ext}'. Allowed formats: {', '.join(ALLOWED_EXTENSIONS)}"
    
    if file_size > MAX_FILE_SIZE_BYTES:
        return False, f"File size exceeds maximum allowable limit of {MAX_FILE_SIZE_BYTES // (1024 * 1024)} MB."
    
    return True, "Valid"

def sanitize_text(text: str) -> str:
    """Sanitize raw text extracted from documents or user queries."""
    if not text:
        return ""
    # Strip null bytes and non-printable control characters (except newline, tab)
    cleaned = "".join(ch for ch in text if ch.isprintable() or ch in "\n\r\t")
    return cleaned.strip()

def sanitize_for_rag(context: str) -> str:
    """Neutralize potential prompt-injection prompts in retrieved excerpts."""
    sanitized = context
    for pattern in INJECTION_PATTERNS:
        sanitized = re.sub(pattern, "[FILTERED_SECURITY_DIRECTIVE]", sanitized, flags=re.IGNORECASE)
    return sanitized
