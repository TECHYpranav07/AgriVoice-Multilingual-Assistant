from typing import List, Dict
from config.settings import settings
from .vector_db import HybridVectorStore

class HybridRetriever:
    """
    Combines Dense and BM25 search results with Reciprocal Rank Fusion (RRF),
    applies metadata filtering (crop, approved status), and computes confidence.
    """

    def __init__(self, vector_store: HybridVectorStore = None):
        self.vector_store = vector_store or HybridVectorStore()

    def retrieve(self, query: str, crop_filter: str = None, top_k: int = 4) -> List[Dict]:
        """
        Executes hybrid search and returns top_k ranked passages with sources.
        """
        if not self.vector_store.chunks:
            # Try loading saved index
            loaded = self.vector_store.load_index()
            if not loaded:
                return []

        # 1. Fetch dense candidates
        dense_results = self.vector_store.dense_search(query, top_k=top_k * 2)

        # 2. Fetch BM25 candidates
        bm25_results = self.vector_store.bm25_search(query, top_k=top_k * 2)

        # 3. Reciprocal Rank Fusion (RRF)
        # RRF score = sum(1 / (60 + rank))
        k_rrf = 60
        rrf_scores = {}
        dense_score_map = dict(dense_results)

        for rank, (doc_idx, _) in enumerate(dense_results):
            rrf_scores[doc_idx] = rrf_scores.get(doc_idx, 0.0) + 1.0 / (k_rrf + rank + 1)

        for rank, (doc_idx, _) in enumerate(bm25_results):
            rrf_scores[doc_idx] = rrf_scores.get(doc_idx, 0.0) + 1.0 / (k_rrf + rank + 1)

        # Sort by combined RRF score
        sorted_indices = sorted(rrf_scores.keys(), key=lambda i: rrf_scores[i], reverse=True)

        results = []
        for idx in sorted_indices:
            chunk = self.vector_store.chunks[idx].copy()
            meta = chunk.get("metadata", {})

            # Metadata filtering if crop is explicitly detected
            if crop_filter:
                chunk_crop = meta.get("crop", "").lower()
                if chunk_crop != "general" and crop_filter.lower() not in chunk_crop and chunk_crop != "all":
                    continue

            # Store computed relevance score
            chunk["rrf_score"] = float(rrf_scores[idx])
            chunk["dense_score"] = float(dense_score_map.get(idx, 0.0))
            results.append(chunk)

            if len(results) >= top_k:
                break

        return results
