import os
import re
import requests
from typing import Dict, List, Any
from config.settings import settings

class AnswerGenerator:
    """
    Generates short, conversational, source-grounded answers in the farmer's language
    (Hindi, Marathi, or English) using Gemini, Groq, or an extractive template engine.
    """

    SYSTEM_PROMPT = """You are a trusted, voice-first agricultural assistant for Indian farmers.
Follow these mandatory rules:
1. Grounding: Answer strictly and only from the supplied Evidence. Never guess or hallucinate.
2. Spoken style: Keep answers short, conversational, and direct (2 to 4 simple sentences), suitable for spoken audio playback under 30 seconds.
3. Language: Reply strictly in the user's requested language ({lang_name}).
4. Citations: Explicitly mention the source name at the end (e.g. 'स्रोत: ICAR' or 'स्त्रोत: कृषी विज्ञान केंद्र').
5. Safety: If chemical sprays or dosages are mentioned, state the exact recommended dose and include a brief safety reminder to wear protective gear.
"""

    def generate(
        self,
        query: str,
        language: str,
        intent: str,
        evidence_passages: List[Dict] = None,
        tool_data: Dict[str, Any] = None
    ) -> Dict[str, str]:
        """
        Generates grounded response.
        Returns: {
            "answer_text": str,
            "source_citation": str,
            "engine": str
        }
        """
        lang_names = {"hi": "Hindi (हिंदी)", "mr": "Marathi (मराठी)", "en": "English"}
        lang_name = lang_names.get(language, "Hindi (हिंदी)")

        # Prepare Evidence Context
        evidence_text = ""
        primary_source = "ICAR / Agriculture Advisory"

        if tool_data and intent == "market_price":
            primary_source = tool_data.get("source", "Agmarknet APMC")
            evidence_text = (
                f"Mandi Data: Commodity={tool_data.get('commodity')}, Market={tool_data.get('market')}, "
                f"Modal Price={tool_data.get('modal_price')} {tool_data.get('unit')}, "
                f"Min={tool_data.get('min_price')}, Max={tool_data.get('max_price')}, "
                f"Date as of={tool_data.get('data_as_of')}."
            )
        elif tool_data and intent == "weather":
            primary_source = tool_data.get("source", "Open-Meteo Agromet")
            evidence_text = (
                f"Weather Data: Location={tool_data.get('location')}, Temp={tool_data.get('temperature_c')}°C, "
                f"Humidity={tool_data.get('humidity_percent')}%, Rain={tool_data.get('rain_mm')}mm, "
                f"Wind={tool_data.get('wind_speed_kmh')} km/h, Spray Advisory={tool_data.get('spray_advisory')}."
            )
        elif evidence_passages:
            top_doc = evidence_passages[0]
            primary_source = top_doc.get("metadata", {}).get("publisher", "ICAR Advisory")
            evidence_text = "\n\n".join([f"[{p.get('document_title')}]: {p['text']}" for p in evidence_passages[:4]])

        # 1. Try Google Gemini API
        if settings.GEMINI_API_KEY and len(settings.GEMINI_API_KEY) > 20:
            try:
                res = self._generate_gemini(query, evidence_text, lang_name, primary_source)
                if res:
                    return {"answer_text": res, "source_citation": primary_source, "engine": "gemini-2.5-flash"}
            except Exception as e:
                print(f"Gemini generation notice: {e}, falling back...")

        # 2. Try Groq API (only if valid non-empty key)
        if settings.GROQ_API_KEY and len(settings.GROQ_API_KEY) > 40 and settings.GROQ_API_KEY.startswith("gsk_"):
            try:
                res = self._generate_groq(query, evidence_text, lang_name, primary_source)
                if res:
                    return {"answer_text": res, "source_citation": primary_source, "engine": "groq_llama"}
            except Exception:
                pass

        # 3. Built-in Deterministic Extractive Generator (100% Free, Zero Key Required)
        return self._generate_extractive(query, language, intent, evidence_passages, tool_data, primary_source)

    def _generate_extractive(self, query, language, intent, evidence_passages, tool_data, primary_source):
        """High quality zero-key extractive answer composer."""
        if intent == "market_price" and tool_data:
            if language == "mr":
                text = (
                    f"{tool_data.get('market')} मध्ये {tool_data.get('commodity')} चा सरासरी बाजारभाव "
                    f"{tool_data.get('modal_price')} रुपये प्रति क्विंटल आहे. किमान दर {tool_data.get('min_price')} "
                    f"आणि कमाल दर {tool_data.get('max_price')} रुपये नोंदवला गेला आहे. "
                    f"(माहिती दिनांक: {tool_data.get('data_as_of')}, स्त्रोत: {primary_source})"
                )
            else:
                text = (
                    f"{tool_data.get('market')} में {tool_data.get('commodity')} का औसत मंडी भाव "
                    f"{tool_data.get('modal_price')} रुपये प्रति क्विंटल है। न्यूनतम भाव {tool_data.get('min_price')} "
                    f"और उच्चतम भाव {tool_data.get('max_price')} रुपये दर्ज किया गया है। "
                    f"(दिनांक: {tool_data.get('data_as_of')}, स्रोत: {primary_source})"
                )
            return {"answer_text": text, "source_citation": primary_source, "engine": "deterministic_tool_composer"}

        if intent == "weather" and tool_data:
            if language == "mr":
                text = (
                    f"{tool_data.get('location')} येथे आजचे तापमान {tool_data.get('temperature_c')} अंश सेल्सिअस "
                    f"आणि आर्द्रता {tool_data.get('humidity_percent')}% आहे. {tool_data.get('spray_advisory')} "
                    f"(स्त्रोत: {primary_source})"
                )
            else:
                text = (
                    f"{tool_data.get('location')} में आज का तापमान {tool_data.get('temperature_c')}°C "
                    f"और नमी {tool_data.get('humidity_percent')}% है। {tool_data.get('spray_advisory')} "
                    f"(स्रोत: {primary_source})"
                )
            return {"answer_text": text, "source_citation": primary_source, "engine": "deterministic_tool_composer"}

        if evidence_passages:
            chunk = evidence_passages[0]
            text_lines = [l.strip() for l in chunk["text"].split("\n") if l.strip() and not l.startswith("#")]
            
            # Prioritize sentences in the requested language
            lang_specific_lines = []
            if language == "mr":
                lang_specific_lines = [l for l in text_lines if "In Marathi:" in l or any(c in l for c in ["आहे", "करावे", "कापूस", "बोंडअळी", "शेतकरी", "सापळे", "फवारणी", "तास", "विमा"])]
            elif language == "hi":
                lang_specific_lines = [l for l in text_lines if "In Hindi:" in l or any(c in l for c in ["है", "करें", "कपास", "सुंडी", "किसान", "उपाय", "छिड़काव", "घंटे", "बीमा"])]

            if lang_specific_lines:
                # Clean prefix tags like "In Marathi:" or "In Hindi:"
                cleaned_lines = [re.sub(r'^-?\s*In (Marathi|Hindi):\s*', '', l) for l in lang_specific_lines]
                summary = " ".join(cleaned_lines[:2])
            else:
                # Fallback to general lines
                summary = " ".join(text_lines[:2])

            citation = chunk.get("metadata", {}).get("publisher", primary_source)
            if language == "mr":
                text = f"{summary}\n(स्त्रोत: {citation})"
            elif language == "hi":
                text = f"{summary}\n(स्रोत: {citation})"
            else:
                text = f"{summary}\n(Source: {citation})"

            return {"answer_text": text, "source_citation": citation, "engine": "extractive_rag_composer"}

        return {
            "answer_text": "अधिक माहितीसाठी कृपया जवळच्या कृषी विज्ञान केंद्राशी संपर्क साधावा.",
            "source_citation": primary_source,
            "engine": "fallback"
        }

    GEMINI_GEN_MODELS = [
        "gemini-3.5-flash",
        "gemini-3.5-flash-lite",
        "gemini-3.1-flash-lite",
        "gemini-2.5-flash",
    ]

    def _generate_gemini(self, query: str, evidence: str, lang_name: str, source: str) -> str:
        from google import genai
        api_key = settings.GEMINI_API_KEY
        client = genai.Client(api_key=api_key)
        prompt = (
            f"{self.SYSTEM_PROMPT.format(lang_name=lang_name)}\n\n"
            f"Evidence from Official Sources:\n{evidence}\n\n"
            f"Farmer Question: {query}\n\n"
            f"Short Spoken Answer in {lang_name} (2 to 4 simple, conversational sentences, cite source at the end):"
        )
        last_err = None
        for model_name in self.GEMINI_GEN_MODELS:
            try:
                res = client.models.generate_content(
                    model=model_name,
                    contents=prompt
                )
                if res.text:
                    return res.text.strip()
            except Exception as e:
                last_err = e
                continue
        if last_err:
            raise last_err
        return ""

    def _generate_groq(self, query: str, evidence: str, lang_name: str, source: str) -> str:
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Authorization": f"Bearer {settings.GROQ_API_KEY}",
            "Content-Type": "application/json"
        }
        prompt = (
            f"Evidence:\n{evidence}\n\n"
            f"User Question: {query}\n\n"
            f"Short Spoken Answer in {lang_name}:"
        )
        body = {
            "model": "llama-3.3-70b-versatile",
            "messages": [
                {"role": "system", "content": self.SYSTEM_PROMPT.format(lang_name=lang_name)},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.2
        }
        resp = requests.post(url, headers=headers, json=body, timeout=20)
        resp.raise_for_status()
        data = resp.json()
        return data["choices"][0]["message"]["content"].strip()
