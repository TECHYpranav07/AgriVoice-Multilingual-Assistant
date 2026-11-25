import asyncio
import os
import tempfile
from pathlib import Path
from config.settings import settings

class TextToSpeechService:
    """
    Synthesizes speech in Indic languages (Hindi, Marathi, English)
    using Edge-TTS (100% free neural voices) with fallback options.
    """

    VOICES = {
        "hi": "hi-IN-MadhurNeural",
        "mr": "mr-IN-AarohiNeural",
        "en": "en-IN-PrabhatNeural"
    }

    @staticmethod
    def clean_text_for_speech(text: str) -> str:
        """Removes markdown symbols, bullets, asterisks, and Latin tags before speaking."""
        import re
        # Remove markdown bold/italics/symbols
        clean = re.sub(r'[*_#`~]', '', text)
        # Remove scientific/English names inside parentheses like (*Pectinophora gossypiella*)
        clean = re.sub(r'\([a-zA-Z\s*.]+\)', '', clean)
        # Remove bullet markers
        clean = re.sub(r'^\s*[-•]\s*', '', clean, flags=re.MULTILINE)
        # Remove excessive whitespace
        clean = re.sub(r'\s+', ' ', clean).strip()
        return clean

    @classmethod
    async def synthesize_async(cls, text: str, language: str = "hi", output_path: str = None) -> str:
        """Asynchronously synthesizes speech using edge-tts."""
        import edge_tts

        voice = cls.VOICES.get(language, cls.VOICES["hi"])
        spoken_text = cls.clean_text_for_speech(text)

        if not output_path:
            settings.AUDIO_DIR.mkdir(parents=True, exist_ok=True)
            fd, output_path = tempfile.mkstemp(suffix=".mp3", dir=settings.AUDIO_DIR)
            os.close(fd)

        communicate = edge_tts.Communicate(text=spoken_text, voice=voice)
        await communicate.save(output_path)
        return output_path

    @classmethod
    def synthesize(cls, text: str, language: str = "hi", output_path: str = None) -> str:
        """Synchronous wrapper for synthesize_async (safe inside or outside event loops)."""
        import concurrent.futures
        try:
            try:
                asyncio.get_running_loop()
                with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
                    return pool.submit(asyncio.run, cls.synthesize_async(text, language, output_path)).result()
            except RuntimeError:
                return asyncio.run(cls.synthesize_async(text, language, output_path))
        except Exception as e:
            print(f"Warning: edge-tts synthesis failed ({e}).")
            return ""
