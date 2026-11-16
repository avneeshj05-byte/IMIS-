import os
from pydantic_settings import BaseSettings
from typing import List

# Compatibility shim for Starlette 1.10+ / FastAPI 0.111+ APIRouter
import starlette.routing
_orig_router_init = starlette.routing.Router.__init__
def _compat_router_init(self, *args, **kwargs):
    kwargs.pop("on_startup", None)
    kwargs.pop("on_shutdown", None)
    _orig_router_init(self, *args, **kwargs)
    if not hasattr(self, "on_startup"):
        self.on_startup = []
    if not hasattr(self, "on_shutdown"):
        self.on_shutdown = []
starlette.routing.Router.__init__ = _compat_router_init

class Settings(BaseSettings):
    PROJECT_NAME: str = "INDUSTRIAL MAINTENANCE INTELLIGENCE SYSTEM (IMIS)"
    PROJECT_TAGLINE: str = "Intelligent Diagnostics. Predictive Maintenance. Operational Reliability."
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Storage Paths
    BASE_DIR: str = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    DATABASE_URL: str = f"sqlite:///{os.path.join(BASE_DIR, 'imis.db')}"
    UPLOAD_DIR: str = os.path.join(BASE_DIR, "uploads")
    VECTOR_STORE_DIR: str = os.path.join(BASE_DIR, "vector_store")
    SAMPLE_DOCS_DIR: str = os.path.join(BASE_DIR, "sample_docs")
    
    # LLM Settings
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "GEMINI")  # GEMINI, HUGGINGFACE, OPENAI, LOCAL_GROUNDED
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    HUGGINGFACE_API_KEY: str = os.getenv("HUGGINGFACE_API_KEY", "")
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_BASE_URL: str = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
    LLM_MODEL_NAME: str = os.getenv("LLM_MODEL_NAME", "gemini-1.5-flash")
    
    # RAG Settings
    EMBEDDING_MODEL_NAME: str = "sentence-transformers/all-MiniLM-L6-v2"
    CHUNK_SIZE: int = 500
    CHUNK_OVERLAP: int = 50
    TOP_K_RETRIEVAL: int = 4
    SIMILARITY_THRESHOLD: float = 0.25
    
    # ML & Simulation Settings
    SIMULATION_INTERVAL_SEC: float = 2.0
    ISOLATION_FOREST_CONTAMINATION: float = 0.05
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8000",
        "*"
    ]

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()

# Ensure directories exist
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.VECTOR_STORE_DIR, exist_ok=True)
os.makedirs(settings.SAMPLE_DOCS_DIR, exist_ok=True)
