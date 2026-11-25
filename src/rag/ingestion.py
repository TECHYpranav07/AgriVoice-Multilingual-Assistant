import os
import re
from pathlib import Path
from typing import List, Dict
from config.settings import settings

class DocumentIngestion:
    """
    Parses agricultural advisories and scheme documents,
    extracts metadata, performs structure-aware chunking,
    and returns verified chunk objects for indexing.
    """

    def __init__(self, docs_dir: Path = None):
        self.docs_dir = docs_dir or settings.DOCS_DIR

    def parse_markdown_file(self, file_path: Path) -> List[Dict]:
        """Parses a markdown document with header metadata and sections."""
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Extract metadata from header lines
        metadata = {
            "source_file": file_path.name,
            "publisher": "Unknown",
            "crop": "general",
            "region": "all",
            "category": "general",
            "approval_status": "unverified"
        }

        meta_patterns = {
            "publisher": r'\*\*Publisher\*\*:\s*([^\n]+)',
            "crop": r'\*\*Crop\*\*:\s*([^\n]+)',
            "region": r'\*\*Region\*\*:\s*([^\n]+)',
            "category": r'\*\*Category\*\*:\s*([^\n]+)',
            "season": r'\*\*Season\*\*:\s*([^\n]+)',
            "publication_date": r'\*\*Publication Date\*\*:\s*([^\n]+)',
            "approval_status": r'\*\*Approval Status\*\*:\s*([^\n]+)'
        }

        for key, pat in meta_patterns.items():
            m = re.search(pat, content)
            if m:
                metadata[key] = m.group(1).strip()

        # Split content into structured sections based on markdown headings
        sections = re.split(r'\n(?=###?\s+)', content)
        chunks = []

        title_match = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
        doc_title = title_match.group(1).strip() if title_match else file_path.stem

        for idx, sec in enumerate(sections):
            clean_sec = sec.strip()
            if not clean_sec or len(clean_sec) < 40:
                continue

            # First section might only be metadata header; skip if no substantive text
            if idx == 0 and "###" not in clean_sec:
                continue

            chunk_id = f"{file_path.stem}_chunk_{idx}"
            chunks.append({
                "chunk_id": chunk_id,
                "document_title": doc_title,
                "text": clean_sec,
                "metadata": metadata.copy()
            })

        return chunks

    def ingest_all(self) -> List[Dict]:
        """Ingests all files in the docs directory."""
        all_chunks = []
        for file in self.docs_dir.glob("*.md"):
            chunks = self.parse_markdown_file(file)
            all_chunks.extend(chunks)
        return all_chunks
