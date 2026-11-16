import math
import re
import numpy as np
from typing import List, Dict

class FastSemanticEmbedder:
    """
    High-speed, pure-NumPy semantic vectorizer tailored for industrial technical manuals and error codes.
    Imports in < 5ms, avoiding heavy DLL locks while producing normalized unit embeddings for cosine search.
    """

    def __init__(self, dimension: int = 384):
        self.dimension = dimension
        self.vocab: Dict[str, int] = {}
        self.idf: Dict[str, float] = {}
        self._initialize_industrial_dictionary()

    def _initialize_industrial_dictionary(self):
        """Seed core industrial engineering terminology."""
        core_terms = [
            "machine", "motor", "error", "e17", "e04", "e88", "e12", "e33",
            "temperature", "vibration", "pressure", "rpm", "current", "overheat",
            "bearing", "spindle", "hydraulic", "pneumatic", "compressor", "conveyor",
            "milling", "press", "injection", "moulding", "lubrication", "grease",
            "valve", "filter", "seal", "cylinder", "pump", "shaft", "coupling",
            "alignment", "runout", "overload", "loto", "lockout", "tagout",
            "inspection", "troubleshooting", "maintenance", "sop", "skf", "6308",
            "polyrex", "synthetic", "cleanliness", "harmonics", "imbalance", "taper",
            "drawbar", "hsk", "belleville", "cavitation", "spool", "coalescing"
        ]
        for term in core_terms:
            self._add_term(term)

    def _add_term(self, term: str):
        if term not in self.vocab and len(self.vocab) < self.dimension:
            self.vocab[term] = len(self.vocab)

    def _tokenize(self, text: str) -> List[str]:
        words = re.findall(r"\b[A-Za-z0-9_]{2,}\b", text.lower())
        tokens = list(words)
        # Add bigrams for technical phrases like "error e17", "conveyor motor", "hydraulic press"
        for i in range(len(words) - 1):
            tokens.append(f"{words[i]}_{words[i+1]}")
        return tokens

    def update_corpus(self, texts: List[str]):
        """Expand vocabulary dynamically from uploaded document text chunks."""
        doc_count = len(texts)
        term_doc_counts: Dict[str, int] = {}

        for text in texts:
            tokens = set(self._tokenize(text))
            for t in tokens:
                self._add_term(t)
                term_doc_counts[t] = term_doc_counts.get(t, 0) + 1

        for term, cnt in term_doc_counts.items():
            self.idf[term] = math.log((doc_count + 1.0) / (cnt + 1.0)) + 1.0

    def embed_documents(self, texts: List[str]) -> np.ndarray:
        """Convert list of documents to unit-normalized embedding matrix."""
        if not texts:
            return np.empty((0, self.dimension), dtype=np.float32)

        self.update_corpus(texts)
        embeddings = np.zeros((len(texts), self.dimension), dtype=np.float32)

        for i, text in enumerate(texts):
            tokens = self._tokenize(text)
            term_freqs: Dict[str, int] = {}
            for t in tokens:
                term_freqs[t] = term_freqs.get(t, 0) + 1

            for t, freq in term_freqs.items():
                if t in self.vocab:
                    idx = self.vocab[t]
                    tf = 1.0 + math.log(freq)
                    idf_val = self.idf.get(t, 1.0)
                    embeddings[i, idx] = tf * idf_val

            # L2 Normalize
            norm = np.linalg.norm(embeddings[i])
            if norm > 0:
                embeddings[i] = embeddings[i] / norm

        return embeddings

    def embed_query(self, query: str) -> np.ndarray:
        """Embed a single query into a 1D unit vector."""
        vec = np.zeros(self.dimension, dtype=np.float32)
        tokens = self._tokenize(query)
        term_freqs: Dict[str, int] = {}
        for t in tokens:
            term_freqs[t] = term_freqs.get(t, 0) + 1

        for t, freq in term_freqs.items():
            if t in self.vocab:
                idx = self.vocab[t]
                tf = 1.0 + math.log(freq)
                idf_val = self.idf.get(t, 1.5)
                vec[idx] = tf * idf_val

        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        return vec

embedding_service = FastSemanticEmbedder()
