from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import Optional
from backend.app.core.config import settings
from backend.app.services.llm_service import llm_service
from backend.app.services.vector_store import vector_store

router = APIRouter(prefix="/settings", tags=["Settings & System Health"])

class SettingsUpdate(BaseModel):
    model_config = {"protected_namespaces": ()}
    llm_provider: str = Field(..., example="GEMINI")
    api_key: Optional[str] = Field(None, example="AIzaSy...")
    model_name: Optional[str] = Field(None, example="gemini-1.5-flash")

@router.get("")
def get_system_settings():
    """Get active system configuration, LLM provider state, and vector database statistics."""
    has_gemini = bool(llm_service.gemini_key)
    has_openai = bool(llm_service.openai_key)
    has_hf = bool(llm_service.hf_key)

    v_stats = vector_store.get_stats()

    return {
        "project_name": settings.PROJECT_NAME,
        "tagline": settings.PROJECT_TAGLINE,
        "version": settings.VERSION,
        "llm_provider": llm_service.provider,
        "model_name": llm_service.model_name,
        "api_keys_configured": {
            "gemini": has_gemini,
            "openai": has_openai,
            "huggingface": has_hf
        },
        "vector_store": v_stats,
        "simulation_mode": True,
        "supported_providers": ["GEMINI", "HUGGINGFACE", "OPENAI", "LOCAL_GROUNDED"]
    }

@router.post("")
def update_system_settings(req: SettingsUpdate):
    """Update active LLM provider and credentials dynamically."""
    llm_service.update_config(
        provider=req.llm_provider,
        api_key=req.api_key or "",
        model_name=req.model_name
    )
    return {
        "message": f"LLM settings updated to provider '{req.llm_provider}' ({req.model_name or llm_service.model_name}).",
        "provider": llm_service.provider,
        "model": llm_service.model_name
    }
