import os
import json
import logging
import numpy as np
from typing import List, Dict, Any, Tuple
from backend.app.core.config import settings

logger = logging.getLogger(__name__)

# Check if FAISS is loadable
FAISS_AVAILABLE = False
# Note: On Windows with NumPy 2.x, faiss C-extension has an ABI mismatch with numpy.core.multiarray.
# We utilize the exact mathematical equivalent: normalized NumPy Flat Cosine Vector Store (Q @ V.T),
# which persists to disk and performs exact inner-product cosine similarity retrieval without external DLL crashes.

class VectorStore:
    """Production-grade Vector Database with disk persistence and cosine similarity retrieval."""

    def __init__(self, storage_dir: str = None):
        self.storage_dir = storage_dir or settings.VECTOR_STORE_DIR
        os.makedirs(self.storage_dir, exist_ok=True)
        self.vectors_file = os.path.join(self.storage_dir, "vectors.npy")
        self.metadata_file = os.path.join(self.storage_dir, "metadata.json")
        
        self.vectors: np.ndarray = np.empty((0, 384), dtype=np.float32)
        self.chunks_metadata: List[Dict[str, Any]] = []
        self.faiss_index = None

        self.load()

    def add_chunks(self, vectors: np.ndarray, metadata_list: List[Dict[str, Any]]):
        """Add newly embedded vectors and their associated chunk metadata to the store."""
        if len(vectors) == 0:
            return

        if len(self.vectors) == 0:
            self.vectors = vectors
        else:
            self.vectors = np.vstack([self.vectors, vectors])

        self.chunks_metadata.extend(metadata_list)

        # Re-initialize FAISS if available
        if FAISS_AVAILABLE:
            try:
                d = self.vectors.shape[1]
                self.faiss_index = faiss.IndexFlatIP(d)
                self.faiss_index.add(self.vectors.astype(np.float32))
            except Exception as e:
                logger.warning(f"FAISS sync error: {e}. Defaulting to NumPy index.")
                self.faiss_index = None

        self.save()

    def search(self, query_vector: np.ndarray, top_k: int = 4, threshold: float = 0.15) -> List[Tuple[Dict[str, Any], float]]:
        """Search for top_k most similar chunks using cosine similarity."""
        if len(self.vectors) == 0:
            return []

        # Ensure query vector is 2D
        q = query_vector.reshape(1, -1).astype(np.float32)

        # Method 1: FAISS IndexFlatIP
        if FAISS_AVAILABLE and self.faiss_index is not None:
            try:
                scores, indices = self.faiss_index.search(q, min(top_k * 2, len(self.chunks_metadata)))
                results = []
                for score, idx in zip(scores[0], indices[0]):
                    if idx >= 0 and idx < len(self.chunks_metadata):
                        sim = float(score)
                        if sim >= threshold:
                            results.append((self.chunks_metadata[idx], sim))
                if results:
                    return results[:top_k]
            except Exception as e:
                logger.warning(f"FAISS search fallback: {e}")

        # Method 2: High-Performance NumPy Cosine Inner-Product (exact equivalent)
        # Cosine similarity for normalized vectors is simply the dot product
        similarities = np.dot(self.vectors, query_vector.flatten())
        ranked_indices = np.argsort(similarities)[::-1]

        results = []
        for idx in ranked_indices:
            score = float(similarities[idx])
            if score < threshold and len(results) > 0:
                break
            results.append((self.chunks_metadata[idx], score))
            if len(results) >= top_k:
                break

        return results

    def save(self):
        """Persist vector embeddings and metadata to disk."""
        try:
            np.save(self.vectors_file, self.vectors)
            with open(self.metadata_file, "w", encoding="utf-8") as f:
                json.dump(self.chunks_metadata, f, indent=2, ensure_ascii=False)
        except Exception as e:
            logger.error(f"Failed to persist vector store: {e}")

    def load(self):
        """Load persisted vector embeddings and metadata from disk."""
        if os.path.exists(self.vectors_file) and os.path.exists(self.metadata_file):
            try:
                self.vectors = np.load(self.vectors_file).astype(np.float32)
                with open(self.metadata_file, "r", encoding="utf-8") as f:
                    self.chunks_metadata = json.load(f)

                if FAISS_AVAILABLE and len(self.vectors) > 0:
                    d = self.vectors.shape[1]
                    self.faiss_index = faiss.IndexFlatIP(d)
                    self.faiss_index.add(self.vectors)
            except Exception as e:
                logger.error(f"Failed to load vector store from disk: {e}")

    def clear(self):
        """Clear all indexed vectors and metadata."""
        self.vectors = np.empty((0, 384), dtype=np.float32)
        self.chunks_metadata = []
        self.faiss_index = None
        self.save()

    def get_stats(self) -> Dict[str, Any]:
        """Return vector database metrics."""
        return {
            "total_chunks": len(self.chunks_metadata),
            "vector_dimension": self.vectors.shape[1] if len(self.vectors) > 0 else 384,
            "engine": "FAISS IndexFlatIP" if (FAISS_AVAILABLE and self.faiss_index is not None) else "NumPy Flat Cosine Vector Store",
            "storage_path": self.storage_dir
        }

vector_store = VectorStore()
