import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env if present (override system defaults)
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env", override=True)

class Settings:
    PROJECT_NAME = "Voice-First Multilingual Agricultural Assistant"
    VERSION = "1.0.0"
    
    # Paths
    BASE_DIR = BASE_DIR
    DATA_DIR = BASE_DIR / "data"
    DOCS_DIR = DATA_DIR / "raw_docs"
    VECTOR_DB_DIR = DATA_DIR / "vector_store"
    AUDIO_DIR = DATA_DIR / "audio_temp"
    GLOSSARY_PATH = DATA_DIR / "glossary" / "agri_glossary.json"
    EVAL_DATASET_PATH = DATA_DIR / "evaluation" / "benchmark_dataset.json"

    # API Keys
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
    DATA_GOV_IN_API_KEY = os.getenv("DATA_GOV_IN_API_KEY", "")
    OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY", "")

    # Sync environment variables for google-genai SDK
    if GEMINI_API_KEY:
        os.environ["GOOGLE_API_KEY"] = GEMINI_API_KEY
        os.environ["GEMINI_API_KEY"] = GEMINI_API_KEY

    # WhatsApp Cloud API
    WHATSAPP_TOKEN = os.getenv("WHATSAPP_TOKEN", "")
    WHATSAPP_PHONE_NUMBER_ID = os.getenv("WHATSAPP_PHONE_NUMBER_ID", "")
    WHATSAPP_VERIFY_TOKEN = os.getenv("WHATSAPP_VERIFY_TOKEN", "agri_assistant_secret_token_123")
    PUBLIC_BASE_URL = os.getenv("PUBLIC_BASE_URL", "")

    # Supported Languages
    SUPPORTED_LANGUAGES = {
        "hi": {"name": "Hindi", "tts_voice": "hi-IN-MadhurNeural"},
        "mr": {"name": "Marathi", "tts_voice": "mr-IN-AarohiNeural"},
        "en": {"name": "English", "tts_voice": "en-IN-PrabhatNeural"}
    }
    DEFAULT_LANGUAGE = os.getenv("DEFAULT_LANGUAGE", "hi")

    # Confidence Thresholds
    MIN_ASR_CONFIDENCE = 0.55
    MIN_RETRIEVAL_SCORE = 0.40

    # Ensure directories exist
    @classmethod
    def initialize_dirs(cls):
        for p in [cls.DATA_DIR, cls.DOCS_DIR, cls.VECTOR_DB_DIR, cls.AUDIO_DIR, 
                  cls.DATA_DIR / "glossary", cls.DATA_DIR / "evaluation"]:
            p.mkdir(parents=True, exist_ok=True)

settings = Settings()
settings.initialize_dirs()

if settings.GEMINI_API_KEY:
    os.environ["GOOGLE_API_KEY"] = settings.GEMINI_API_KEY
    os.environ["GEMINI_API_KEY"] = settings.GEMINI_API_KEY
