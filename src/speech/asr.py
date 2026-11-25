import os
from pathlib import Path
from config.settings import settings
from src.channel.audio_converter import AudioConverter

class SpeechToTextService:
    """
    Speech-to-Text service supporting Groq Whisper Cloud API,
    Gemini Audio ASR, Google Web Speech (SpeechRecognition), and local Whisper.
    """

    GEMINI_ASR_MODELS = [
        "gemini-3.5-flash-lite",
        "gemini-3.5-flash",
        "gemini-3.1-flash-lite",
        "gemini-2.5-flash",
    ]

    LOCALE_MAP = {
        "mr": "mr-IN",
        "hi": "hi-IN",
        "en": "en-IN",
    }

    def __init__(self, groq_api_key: str = None, gemini_api_key: str = None):
        self.groq_api_key = groq_api_key or settings.GROQ_API_KEY
        self.gemini_api_key = gemini_api_key or settings.GEMINI_API_KEY

    def transcribe(self, audio_file_path: str, language_hint: str = None) -> dict:
        """
        Transcribes audio to text.
        Returns: {
            "transcript": str,
            "language": str,
            "confidence": float,
            "engine": str
        }
        """
        # Ensure 16kHz WAV format
        clean_wav = AudioConverter.to_16khz_wav(audio_file_path)

        # 1. Try Groq Whisper (free, high-speed, high accuracy in Indic languages)
        if self.groq_api_key:
            try:
                result = self._transcribe_groq(clean_wav, language_hint)
                if result.get("transcript"):
                    return result
            except Exception as e:
                print(f"Groq Whisper transcription failed ({e}), attempting Gemini ASR...")

        # 2. Try Gemini Multimodal Audio Transcription (rotates across available Flash models)
        if self.gemini_api_key and len(self.gemini_api_key) > 20:
            try:
                result = self._transcribe_gemini(clean_wav, language_hint)
                if result.get("transcript"):
                    return result
            except Exception as e:
                print(f"Gemini ASR transcription failed ({e}), attempting SpeechRecognition fallback...")

        # 3. Try Google SpeechRecognition (free, no daily quota limit, Hindi/Marathi/English)
        try:
            result = self._transcribe_speech_recognition(clean_wav, language_hint)
            if result.get("transcript"):
                return result
        except Exception as e:
            print(f"SpeechRecognition fallback notice: {e}")

        # 4. Try local Whisper if installed
        try:
            import whisper
            model = whisper.load_model("base")
            res = model.transcribe(clean_wav, language=language_hint)
            return {
                "transcript": res.get("text", "").strip(),
                "language": res.get("language", language_hint or "hi"),
                "confidence": 0.88,
                "engine": "local_whisper_base"
            }
        except Exception:
            pass

        # 5. Honest low-confidence signal so ConfidenceGate asks the user to repeat
        # instead of hallucinating an unrelated topic.
        return {
            "transcript": "",
            "language": language_hint or "hi",
            "confidence": 0.0,
            "engine": "asr_no_speech_detected"
        }

    def _transcribe_gemini(self, wav_path: str, language_hint: str = None) -> dict:
        import json
        import re
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=self.gemini_api_key)
        with open(wav_path, "rb") as f:
            wav_bytes = f.read()

        hint_clause = f" Expected language hint: {language_hint}." if language_hint else ""
        prompt = (
            "Transcribe this agricultural farmer voice query verbatim in its spoken language and native script "
            "(Devanagari for Hindi/Marathi, Latin for English). Do not translate or answer the question."
            f"{hint_clause} Return JSON with keys: 'transcript' (string) and 'language' ('hi', 'mr', or 'en')."
        )
        audio_part = types.Part.from_bytes(data=wav_bytes, mime_type="audio/wav")

        last_err = None
        for model_name in self.GEMINI_ASR_MODELS:
            try:
                res = client.models.generate_content(
                    model=model_name,
                    contents=[prompt, audio_part],
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        temperature=0.0
                    )
                )
                raw_text = (res.text or "").strip()
                raw_text = re.sub(r"^```(?:json)?\s*|\s*```$", "", raw_text, flags=re.DOTALL).strip()
                parsed = json.loads(raw_text)

                transcript = str(parsed.get("transcript", "")).strip()
                detected_lang = parsed.get("language") or language_hint or "hi"
                if detected_lang not in ("hi", "mr", "en"):
                    detected_lang = language_hint or "hi"

                return {
                    "transcript": transcript,
                    "language": detected_lang,
                    "confidence": 0.93,
                    "engine": f"{model_name}-asr"
                }
            except Exception as e:
                last_err = e
                continue

        if last_err:
            raise last_err
        return {"transcript": "", "language": language_hint or "hi", "confidence": 0.0, "engine": "gemini-asr-empty"}

    def _transcribe_speech_recognition(self, wav_path: str, language_hint: str = None) -> dict:
        import speech_recognition as sr

        recognizer = sr.Recognizer()
        with sr.AudioFile(wav_path) as source:
            audio_data = recognizer.record(source)

        primary = language_hint if language_hint in self.LOCALE_MAP else "hi"
        candidates = [primary] + [l for l in ("hi", "mr", "en") if l != primary]

        for lang_code in candidates:
            locale = self.LOCALE_MAP[lang_code]
            try:
                text = recognizer.recognize_google(audio_data, language=locale).strip()
                if text:
                    return {
                        "transcript": text,
                        "language": lang_code,
                        "confidence": 0.90,
                        "engine": f"google_web_speech_{locale}"
                    }
            except sr.UnknownValueError:
                continue

        return {"transcript": "", "language": primary, "confidence": 0.0, "engine": "google_web_speech_empty"}

    def _transcribe_groq(self, wav_path: str, language_hint: str = None) -> dict:
        import requests
        url = "https://api.groq.com/openai/v1/audio/transcriptions"
        headers = {"Authorization": f"Bearer {self.groq_api_key}"}

        with open(wav_path, "rb") as audio_file:
            files = {"file": (os.path.basename(wav_path), audio_file, "audio/wav")}
            data = {
                "model": "whisper-large-v3-turbo",
                "response_format": "verbose_json"
            }
            if language_hint:
                data["language"] = language_hint

            resp = requests.post(url, headers=headers, files=files, data=data, timeout=30)
            resp.raise_for_status()
            res_json = resp.json()

            return {
                "transcript": res_json.get("text", "").strip(),
                "language": res_json.get("language", language_hint or "hi"),
                "confidence": 0.92,
                "engine": "groq_whisper_turbo"
            }
