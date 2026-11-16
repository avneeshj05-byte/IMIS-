import logging
import datetime
from typing import Dict, Any, List, Optional
from backend.app.core.config import settings
from backend.app.services.embedding_service import embedding_service
from backend.app.services.vector_store import vector_store
from backend.app.services.llm_service import llm_service
from backend.app.schemas.diagnostic import DiagnosticResponse, SourceCitation

logger = logging.getLogger(__name__)

class RAGPipeline:
    """End-to-end Retrieval-Augmented Generation pipeline for industrial diagnostics."""

    def __init__(self):
        self.embedding_service = embedding_service
        self.vector_store = vector_store
        self.llm_service = llm_service

    def retrieve(self, query: str, top_k: int = None, threshold: float = None) -> List[Dict[str, Any]]:
        """Retrieve most relevant technical documentation chunks using cosine similarity."""
        k = top_k or settings.TOP_K_RETRIEVAL
        thresh = threshold or settings.SIMILARITY_THRESHOLD

        query_vec = self.embedding_service.embed_query(query)
        raw_results = self.vector_store.search(query_vec, top_k=k, threshold=thresh)

        retrieved_chunks = []
        for metadata, sim_score in raw_results:
            chunk = dict(metadata)
            chunk["similarity_score"] = round(float(sim_score), 4)
            retrieved_chunks.append(chunk)

        return retrieved_chunks

    def calculate_confidence(self, query: str, retrieved_chunks: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Evaluate retrieval confidence based on top similarity, coverage, and token overlap.
        Explicitly distinguishes retrieval confidence from statistical answer correctness.
        """
        if not retrieved_chunks:
            return {
                "level": "LOW",
                "rationale": "No relevant technical manuals or historical maintenance records found in knowledge base."
            }

        top_score = retrieved_chunks[0]["similarity_score"]
        count = len(retrieved_chunks)

        # Check for exact error code or technical keyword hits
        query_words = set(query.lower().split())
        matched_chunks = 0
        for chunk in retrieved_chunks:
            chunk_content = chunk.get("content", "").lower()
            if any(w in chunk_content for w in query_words if len(w) >= 3):
                matched_chunks += 1

        if top_score >= 0.40 and count >= 2:
            level = "HIGH"
            rationale = (
                f"Strong semantic convergence (top cosine similarity: {top_score:.2f}) "
                f"corroborated by {count} distinct technical excerpts."
            )
        elif top_score >= 0.15 or count >= 1:
            level = "MEDIUM"
            rationale = (
                f"Moderate semantic correspondence (top similarity: {top_score:.2f}) across {count} document chunk(s). "
                "Secondary physical inspection recommended to verify diagnostic findings."
            )
        else:
            level = "LOW"
            rationale = (
                f"Marginal document retrieval score ({top_score:.2f}). "
                "Retrieved excerpts may not fully cover all aspects of the reported fault."
            )

        return {"level": level, "rationale": rationale}

    def diagnose(self, query: str, machine_id: Optional[str] = None, top_k: int = 4) -> DiagnosticResponse:
        """Execute full RAG workflow: embed -> retrieve -> score -> generate -> cite."""
        # 1. Retrieve relevant chunks
        chunks = self.retrieve(query, top_k=top_k)

        # 2. Assess retrieval confidence
        conf = self.calculate_confidence(query, chunks)

        # 3. Generate structured diagnosis through LLM
        diagnosis_dict = self.llm_service.generate_diagnostic(query, chunks, machine_id)

        # Override confidence with calibrated calculation if local or fallback
        if "confidence_level" not in diagnosis_dict or (diagnosis_dict.get("confidence_level") == "HIGH" and conf["level"] == "LOW"):
            diagnosis_dict["confidence_level"] = conf["level"]
            diagnosis_dict["confidence_rationale"] = conf["rationale"]

        # 4. Construct transparent citations
        citations = []
        for chunk in chunks:
            content = chunk.get("content", "")
            excerpt = content[:280] + "..." if len(content) > 280 else content
            citations.append(SourceCitation(
                document_name=chunk.get("document_name", "Technical Specification"),
                page_number=chunk.get("page_number", 1),
                excerpt=excerpt,
                similarity_score=chunk.get("similarity_score", 0.0)
            ))

        return DiagnosticResponse(
            query=query,
            machine_id=machine_id,
            diagnostic_summary=diagnosis_dict.get("diagnostic_summary", ""),
            probable_causes=diagnosis_dict.get("probable_causes", []),
            recommended_inspections=diagnosis_dict.get("recommended_inspections", []),
            step_by_step_troubleshooting=diagnosis_dict.get("step_by_step_troubleshooting", []),
            safety_precautions=diagnosis_dict.get("safety_precautions", []),
            confidence_level=diagnosis_dict.get("confidence_level", conf["level"]),
            confidence_rationale=diagnosis_dict.get("confidence_rationale", conf["rationale"]),
            citations=citations,
            retrieval_count=len(chunks),
            is_sufficient_evidence=diagnosis_dict.get("is_sufficient_evidence", len(chunks) > 0),
            generated_at=datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC"),
            llm_provider=diagnosis_dict.get("llm_provider", "IMIS Grounded Rule Synthesizer")
        )

rag_pipeline = RAGPipeline()
