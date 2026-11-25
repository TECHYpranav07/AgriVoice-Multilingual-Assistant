import json
import re
from pathlib import Path
from config.settings import settings

class IntentClassifier:
    """
    Classifies user agricultural queries into intents and extracts entities
    (crop, pest, location, scheme) with support for Hindi, Marathi, and English.
    """

    def __init__(self):
        self.glossary = self._load_glossary()

    def _load_glossary(self) -> dict:
        if settings.GLOSSARY_PATH.exists():
            with open(settings.GLOSSARY_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        return {}

    def detect_language(self, text: str) -> str:
        """
        Detects primary language: Hindi (hi), Marathi (mr), or English (en).
        Uses Devanagari character ranges and Marathi-specific words (आहे, करावं, भाव, पीक).
        """
        if not text:
            return "hi"

        # Check for Devanagari script range \u0900-\u097F
        devanagari_chars = len(re.findall(r'[\u0900-\u097F]', text))
        total_chars = len(re.findall(r'\w', text))

        if total_chars == 0 or (devanagari_chars / max(total_chars, 1)) < 0.2:
            return "en"

        # Distinguish Marathi from Hindi using common Marathi stopwords and markers
        marathi_markers = [
            r'\bआहे\b', r'\bनाही\b', r'\bकरावे\b', r'\bकसा\b', r'\bकशी\b', 
            r'\bपाहिजे\b', r'\bकापूस\b', r'\bगहू\b', r'\bशेतकरी\b', r'\bहवामान\b', 
            r'\bबाजारभाव\b', r'\bअळी\b', r'\bबोंडअळी\b', r'\bतासात\b', r'\bमिळेल\b'
        ]
        for marker in marathi_markers:
            if re.search(marker, text):
                return "mr"

        return "hi"

    def analyze(self, text: str) -> dict:
        """
        Analyzes query text: returns intent, entities, language, and normalized query.
        """
        clean_text = text.strip()
        lang = self.detect_language(clean_text)
        lower_text = clean_text.lower()

        # 1. Detect Adversarial Chemical Overdose
        overdose_patterns = [
            r'डोस दुप्पट', r'डबल डोज', r'double dose', r'दवा ज्यादा', 
            r'ज्यादा कीटनाशक', r'जास्त औषध'
        ]
        if any(re.search(p, clean_text, re.IGNORECASE) for p in overdose_patterns):
            return {
                "intent": "adversarial_chemical_overdose",
                "entities": {"risk": "chemical_overdose"},
                "language": lang,
                "normalized_query": clean_text,
                "is_safe": False
            }

        # 2. Extract Entities (Crop, Location, Scheme)
        entities = {}
        
        # Crops
        for crop_key, names in self.glossary.get("crops", {}).items():
            for l_key, name_val in names.items():
                if name_val.lower() in lower_text or crop_key in lower_text:
                    entities["crop"] = crop_key
                    break
            if "crop" in entities:
                break

        # Common Locations in Maharashtra/MP/North
        locations = ["Nagpur", "Pune", "Nashik", "Indore", "Amravati", "Aurangabad", 
                     "Chhatrapati Sambhajinagar", "Delhi", "Bhopal", "Solapur", "Akola"]
        for loc in locations:
            if loc.lower() in lower_text:
                entities["location"] = loc
                break
        
        # Devanagari locations
        devanagari_locs = {
            "नागपूर": "Nagpur", "नागपुर": "Nagpur", "पुणे": "Pune", "पुण्या": "Pune",
            "नाशिक": "Nashik", "इंदूर": "Indore", "अमरावती": "Amravati", "अकोला": "Akola"
        }
        for dev_name, standard_name in devanagari_locs.items():
            if dev_name in clean_text:
                entities["location"] = standard_name
                break

        # 3. Intent Classification
        intent = "general_query"

        price_keywords = ["भाव", "बाजारभाव", "मंडी", "दाम", "rate", "price", "mandi", "रेट"]
        weather_keywords = ["हवामान", "मौसम", "बारिश", "पाऊस", "weather", "rain", "तापमान"]
        scheme_keywords = ["योजना", "पीएम किसान", "सन्मान निधी", "सम्मान निधि", "विमा", "बीमा", "पीक विमा", "नुकसान",
                           "subsidy", "scheme", "pm-kisan", "pmfby", "किस्त", "हप्ता", "kyc"]
        pest_keywords = ["अळी", "रोग", "कीड", "सुंडी", "कीड़ा", "फवारणी", "छिड़काव", 
                         "पिवळे", "पीला", "स्प्रे", "pest", "spray", "disease"]
        out_of_scope_keywords = ["चांद", "क्रिकेट", "सिनेमा", "फिल्म", "गाना", "moon", "movie", "president"]

        if any(kw in lower_text for kw in out_of_scope_keywords):
            intent = "out_of_scope"
        elif any(kw in lower_text for kw in price_keywords):
            intent = "market_price"
        elif any(kw in lower_text for kw in weather_keywords):
            intent = "weather"
        elif any(kw in lower_text for kw in scheme_keywords):
            intent = "scheme"
        elif any(kw in lower_text for kw in pest_keywords):
            intent = "crop_advice"
        elif entities.get("crop"):
            intent = "crop_advice"

        return {
            "intent": intent,
            "entities": entities,
            "language": lang,
            "normalized_query": clean_text,
            "is_safe": True
        }
