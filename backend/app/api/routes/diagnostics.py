from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
from backend.app.database.connection import get_db
from backend.app.models.database import MaintenanceRecord, Machine
from backend.app.schemas.diagnostic import DiagnosticQuery, DiagnosticResponse, IntelligentRecommendationRequest
from backend.app.services.rag_pipeline import rag_pipeline
from backend.app.services.maintenance_engine import maintenance_engine

router = APIRouter(prefix="/diagnostics", tags=["AI Diagnostics (RAG)"])

@router.post("/query", response_model=DiagnosticResponse)
def query_diagnostics(query_data: DiagnosticQuery, db: Session = Depends(get_db)):
    """
    Main RAG Diagnostic Query Endpoint.
    Searches FAISS vector store for relevant technical documentation and SOPs,
    retrieves corroborating excerpts, and generates structured troubleshooting recommendations with citations.
    """
    augmented_query = query_data.query

    # If machine_id provided, fetch machine context and past maintenance logs to enrich retrieval
    if query_data.machine_id and query_data.include_maintenance_history:
        past_records = (
            db.query(MaintenanceRecord)
            .filter(MaintenanceRecord.machine_id == query_data.machine_id)
            .order_by(MaintenanceRecord.id.desc())
            .limit(3)
            .all()
        )
        if past_records:
            history_summary = " ".join([
                f"[Past Log {r.maintenance_date}: Error {r.error_code} - {r.reported_issue} -> Action: {r.corrective_action}]"
                for r in past_records
            ])
            augmented_query = f"{query_data.query} (Past Machine Logs: {history_summary})"

    response = rag_pipeline.diagnose(
        query=augmented_query,
        machine_id=query_data.machine_id,
        top_k=query_data.top_k
    )
    response.query = query_data.query
    return response

@router.post("/recommend", response_model=DiagnosticResponse)
def automated_recommendation(data: IntelligentRecommendationRequest):
    """
    Automated Bridge: Connects an ML Anomaly Detection or Alert event directly to RAG.
    Produces structured maintenance recommendations based on observed sensor deviations.
    """
    response = maintenance_engine.generate_alert_recommendation(
        machine_id=data.machine_id,
        observed_condition=data.observed_condition,
        deviating_parameters=data.deviating_parameters,
        anomaly_score=data.anomaly_score,
        alert_code=data.alert_code
    )
    return response
