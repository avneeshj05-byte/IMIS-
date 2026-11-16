from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

class SourceCitation(BaseModel):
    document_name: str
    page_number: int
    excerpt: str
    similarity_score: float

class DiagnosticQuery(BaseModel):
    query: str = Field(..., example="Machine M204 is showing error E17. What should I check?")
    machine_id: Optional[str] = Field(None, example="M204")
    include_maintenance_history: bool = True
    top_k: int = 4

class DiagnosticResponse(BaseModel):
    query: str
    machine_id: Optional[str] = None
    diagnostic_summary: str
    probable_causes: List[str]
    recommended_inspections: List[str]
    step_by_step_troubleshooting: List[str]
    safety_precautions: List[str]
    confidence_level: str = Field("HIGH", example="HIGH") # HIGH, MEDIUM, LOW
    confidence_rationale: str
    citations: List[SourceCitation]
    retrieval_count: int
    is_sufficient_evidence: bool = True
    generated_at: str
    llm_provider: str

class IntelligentRecommendationRequest(BaseModel):
    machine_id: str
    observed_condition: str
    deviating_parameters: List[str]
    anomaly_score: float
    alert_code: Optional[str] = None
