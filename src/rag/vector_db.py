import os
import json
import pickle
import numpy as np
from pathlib import Path
from typing import List, Dict, Tuple
from config.settings import settings
from rank_bm25 import BM25Okapi

class HybridVectorStore:
    """
    Manages hybrid search: Dense vector embeddings (via SentenceTransformers/FAISS)
    plus BM25 lexical index with Reciprocal Rank Fusion (RRF).
    """

    def __init__(self, model_name: str = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"):
        self.model_name = model_name
        self.embedding_model = None
        self.chunks: List[Dict] = []
        self.embeddings: np.ndarray = None
        self.bm25: BM25Okapi = None
        self.tokenized_corpus = []

    def _get_embedding_model(self):
        if self.embedding_model is None:
            # Check if user explicitly wants heavy HF model download
            use_hf = os.getenv("USE_HF_SENTENCE_TRANSFORMERS", "false").lower() == "true"
            if use_hf:
                try:
                    from sentence_transformers import SentenceTransformer
                    self.embedding_model = SentenceTransformer(self.model_name)
                    return self.embedding_model
                except Exception as e:
                    print(f"Notice: HF model load skipped ({e}). Using fast multilingual vectorizer.")
            self.embedding_model = False
        return self.embedding_model

    def tokenize(self, text: str) -> List[str]:
        """Simple multilingual tokenizer splitting by words and Devanagari tokens."""
        import re
        tokens = re.findall(r'[\w\u0900-\u097F]+', text.lower())
        return tokens

    def build_index(self, chunks: List[Dict]):
        """Builds both dense embeddings and BM25 index."""
        self.chunks = chunks
        if not chunks:
            return

        # 1. Build BM25 index
        self.tokenized_corpus = [self.tokenize(c["text"]) for c in chunks]
        self.bm25 = BM25Okapi(self.tokenized_corpus)

        # 2. Build Dense embeddings
        model = self._get_embedding_model()
        texts = [f"{c.get('document_title', '')}\n{c['text']}" for c in chunks]

        if model:
            dense_vectors = model.encode(texts, convert_to_numpy=True, normalize_embeddings=True)
            self.embeddings = dense_vectors
        else:
            # Fallback dense representation via TF-IDF vectorizer if offline
            from sklearn.feature_extraction.text import TfidfVectorizer
            tfidf = TfidfVectorizer(tokenizer=self.tokenize)
            self.embeddings = tfidf.fit_transform(texts).toarray()
            self._tfidf = tfidf

        # Save index
        self.save_index()

    def save_index(self, directory: Path = None):
        """Persists the index to disk."""
        target_dir = directory or settings.VECTOR_DB_DIR
        target_dir.mkdir(parents=True, exist_ok=True)

        with open(target_dir / "chunks.json", "w", encoding="utf-8") as f:
            json.dump(self.chunks, f, ensure_ascii=False, indent=2)

        if self.embeddings is not None:
            np.save(target_dir / "embeddings.npy", self.embeddings)

        with open(target_dir / "bm25.pkl", "wb") as f:
            pickle.dump(self.bm25, f)

        if hasattr(self, "_tfidf") and self._tfidf is not None:
            with open(target_dir / "tfidf.pkl", "wb") as f:
                pickle.dump(self._tfidf, f)

    def load_index(self, directory: Path = None) -> bool:
        """Loads index from disk if present."""
        target_dir = directory or settings.VECTOR_DB_DIR
        chunks_file = target_dir / "chunks.json"
        embeds_file = target_dir / "embeddings.npy"
        bm25_file = target_dir / "bm25.pkl"

        if not (chunks_file.exists() and embeds_file.exists() and bm25_file.exists()):
            return False

        with open(chunks_file, "r", encoding="utf-8") as f:
            self.chunks = json.load(f)

        self.embeddings = np.load(embeds_file)

        with open(bm25_file, "rb") as f:
            self.bm25 = pickle.load(f)

        tfidf_file = target_dir / "tfidf.pkl"
        if tfidf_file.exists():
            with open(tfidf_file, "rb") as f:
                self._tfidf = pickle.load(f)

        return True

    def dense_search(self, query: str, top_k: int = 5) -> List[Tuple[int, float]]:
        """Dense similarity search."""
        if self.embeddings is None or len(self.chunks) == 0:
            return []

        model = self._get_embedding_model()
        if model:
            q_vec = model.encode([query], convert_to_numpy=True, normalize_embeddings=True)[0]
            scores = np.dot(self.embeddings, q_vec)
        else:
            if hasattr(self, "_tfidf"):
                q_vec = self._tfidf.transform([query]).toarray()[0]
                norm = np.linalg.norm(q_vec)
                if norm > 0:
                    q_vec = q_vec / norm
                scores = np.dot(self.embeddings, q_vec)
            else:
                scores = np.zeros(len(self.chunks))

        ranked_indices = np.argsort(scores)[::-1][:top_k]
        return [(int(i), float(scores[i])) for i in ranked_indices]

    def bm25_search(self, query: str, top_k: int = 5) -> List[Tuple[int, float]]:
        """Sparse BM25 lexical search."""
        if not self.bm25 or len(self.chunks) == 0:
            return []

        tokens = self.tokenize(query)
        scores = self.bm25.get_scores(tokens)
        ranked_indices = np.argsort(scores)[::-1][:top_k]
        return [(int(i), float(scores[i])) for i in ranked_indices]
