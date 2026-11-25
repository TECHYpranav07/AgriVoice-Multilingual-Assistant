import json
import re
from config.settings import settings

class AgriTranslator:
    """
    Handles translation and agricultural domain glossary preservation
    between Hindi, Marathi, and English.
    """

    def __init__(self):
        self.glossary = self._load_glossary()

    def _load_glossary(self) -> dict:
        if settings.GLOSSARY_PATH.exists():
            with open(settings.GLOSSARY_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        return {}

    def apply_glossary_preservation(self, text: str, target_lang: str) -> str:
        """
        Replaces standard terms with exact agricultural translations from the glossary
        so critical terms (e.g. 'pink bollworm', 'yellow mosaic', chemical names)
        are not distorted.
        """
        result = text
        for category, items in self.glossary.items():
            if not isinstance(items, dict):
                continue
            for term_key, lang_map in items.items():
                if not isinstance(lang_map, dict):
                    continue
                target_term = lang_map.get(target_lang)
                if not target_term:
                    continue
                
                # Check all source variations
                for src_lang, src_term in lang_map.items():
                    if src_lang != target_lang and src_term:
                        pattern = re.compile(re.escape(src_term), re.IGNORECASE)
                        result = pattern.sub(target_term, result)

        return result

    def translate_query_for_retrieval(self, query: str, source_lang: str) -> str:
        """
        Generates enriched bilingual / English query terms for higher recall across RAG documents.
        """
        enriched = query
        for category in ["crops", "pests_and_diseases", "schemes"]:
            items = self.glossary.get(category, {})
            for key, l_map in items.items():
                src_val = l_map.get(source_lang, "")
                en_val = l_map.get("en", "")
                if src_val and src_val in query and en_val not in enriched:
                    enriched += f" ({en_val})"
        return enriched
