import logging
import datetime
from typing import Dict, Any, List, Optional
from backend.app.services.rag_pipeline import rag_pipeline
from backend.app.schemas.diagnostic import DiagnosticResponse

logger = logging.getLogger(__name__)

class MaintenanceRecommendationEngine:
    """
    Intelligent Maintenance Recommendation Bridge.
    Seamlessly links ML Anomaly Detection events to the RAG Retrieval Pipeline
    to generate machine-specific troubleshooting recommendations with transparent citations.
    """

    def __init__(self):
        self.rag_pipeline = rag_pipeline

    def generate_alert_recommendation(
        self,
        machine_id: str,
        observed_condition: str,
        deviating_parameters: List[str],
        anomaly_score: float,
        alert_code: Optional[str] = None
    ) -> DiagnosticResponse:
        """
        Formulates a domain-specific diagnostic query from the detected anomaly,
        retrieves machine technical manuals and past repair history, and generates structured recommendations.
        """
        params_str = ", ".join(deviating_parameters) if deviating_parameters else "multivariate operating drift"
        
        inquiry = (
            f"Machine {machine_id} triggered an anomaly alert (Score: {anomaly_score:.2f}). "
            f"Observed condition: {observed_condition}. Abnormal sensor parameters: {params_str}. "
            f"What are the probable mechanical/electrical causes, recommended inspections, and SOP corrective actions?"
        )

        logger.info(f"Triggering automated maintenance recommendation for {machine_id} on condition: {observed_condition}")
        diagnostic_response = self.rag_pipeline.diagnose(
            query=inquiry,
            machine_id=machine_id,
            top_k=4
        )

        return diagnostic_response

maintenance_engine = MaintenanceRecommendationEngine()
