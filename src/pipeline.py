import time
from typing import Dict, Any, Optional
from pathlib import Path
from config.settings import settings
from src.speech.asr import SpeechToTextService
from src.speech.tts import TextToSpeechService
from src.nlu.intent_classifier import IntentClassifier
from src.nlu.translator import AgriTranslator
from src.rag.ingestion import DocumentIngestion
from src.rag.vector_db import HybridVectorStore
from src.rag.retriever import HybridRetriever
from src.tools.weather_tool import WeatherTool
from src.tools.mandi_tool import MandiPriceTool
from src.generation.confidence_gate import ConfidenceGate
from src.generation.generator import AnswerGenerator

class AgriculturalAssistantPipeline:
    """
    End-to-End Orchestrator for the Voice-First Multilingual Agricultural Assistant.
    """

    def __init__(self):
        self.asr = SpeechToTextService()
        self.nlu = IntentClassifier()
        self.translator = AgriTranslator()
        
        # Knowledge Base Initialization
        self.vector_store = HybridVectorStore()
        if not self.vector_store.load_index():
            print("Indexing agricultural documents...")
            ingestion = DocumentIngestion()
            chunks = ingestion.ingest_all()
            self.vector_store.build_index(chunks)
        
        self.retriever = HybridRetriever(self.vector_store)
        self.generator = AnswerGenerator()

    def process_query(
        self,
        text_query: Optional[str] = None,
        audio_file_path: Optional[str] = None,
        language_hint: Optional[str] = None,
        generate_audio: bool = True
    ) -> Dict[str, Any]:
        """
        Executes the full pipeline for either voice or text input.
        """
        start_time = time.time()
        logs = []

        # Step 1 & 2: ASR Transcription
        if audio_file_path:
            asr_res = self.asr.transcribe(audio_file_path, language_hint)
            query = asr_res["transcript"]
            asr_confidence = asr_res["confidence"]
            detected_lang = asr_res["language"]
            logs.append(f"ASR transcribed ({asr_res['engine']}): '{query}' [confidence={asr_confidence:.2f}]")
        else:
            query = text_query or ""
            asr_confidence = 1.0
            detected_lang = language_hint or self.nlu.detect_language(query)
            logs.append(f"Text query received: '{query}'")

        if not query.strip():
            lang_out = detected_lang or language_hint or "hi"
            repeat_msgs = {
                "mr": "माफ करा, तुमचा आवाज स्पष्ट ऐकू आला नाही. कृपया पुन्हा मोठ्याने बोला किंवा टाईप करा.",
                "hi": "माफ़ कीजिए, आपकी आवाज़ स्पष्ट नहीं सुनाई दी। कृपया दोबारा बोलें या लिखकर पूछें।",
                "en": "Sorry, I could not hear that clearly. Please tap the mic and speak again or type your question.",
            }
            repeat_text = repeat_msgs.get(lang_out, repeat_msgs["hi"])
            audio_reply_path = None
            if generate_audio:
                try:
                    audio_reply_path = TextToSpeechService.synthesize(text=repeat_text, language=lang_out)
                except Exception:
                    pass
            return {
                "success": True,
                "query": "",
                "language": lang_out,
                "intent": "clarification",
                "entities": {},
                "answer_text": repeat_text,
                "source_citation": "ASR Confidence Gate",
                "audio_reply_path": audio_reply_path,
                "latency_seconds": round(time.time() - start_time, 2),
                "gate_decision": {"decision": "ask_to_repeat", "reason_code": "LOW_ASR_CONFIDENCE", "message": repeat_text},
                "engine": "confidence_gate",
                "logs": logs
            }

        # Step 3: NLU - Language, Intent & Entity Extraction
        nlu_res = self.nlu.analyze(query)
        intent = nlu_res["intent"]
        entities = nlu_res["entities"]
        lang = detected_lang or nlu_res["language"]
        logs.append(f"NLU Analysis: intent='{intent}', lang='{lang}', entities={entities}")

        # Step 4: Route Query (Tools vs Knowledge Retrieval)
        tool_data = None
        retrieved_passages = []

        if intent == "market_price":
            crop = entities.get("crop", "cotton")
            loc = entities.get("location", "nagpur")
            tool_data = MandiPriceTool.get_price(commodity=crop, location=loc)
            logs.append(f"Tool executed: Mandi price for {crop} at {loc}")

        elif intent == "weather":
            loc = entities.get("location", "nagpur")
            tool_data = WeatherTool.get_weather(location_name=loc)
            logs.append(f"Tool executed: Weather for {loc}")

        elif intent in ["crop_advice", "pest_disease", "scheme", "general_query"]:
            crop_filter = entities.get("crop")
            # Query expansion via domain glossary
            enriched_q = self.translator.translate_query_for_retrieval(query, lang)
            retrieved_passages = self.retriever.retrieve(enriched_q, crop_filter=crop_filter, top_k=3)
            logs.append(f"Retrieved {len(retrieved_passages)} evidence passages from verified knowledge base")

        # Step 5: Confidence Gate & Safety Evaluation
        gate_decision = ConfidenceGate.evaluate(
            asr_confidence=asr_confidence,
            nlu_result=nlu_res,
            retrieved_passages=retrieved_passages
        )
        logs.append(f"Confidence Gate: decision='{gate_decision['decision']}', reason='{gate_decision['reason_code']}'")

        if gate_decision["decision"] != "proceed":
            answer_text = gate_decision["message"]
            source_citation = "Kisan Helpline / Advisory Safety Gate"
            engine_used = "safety_confidence_gate"
        else:
            # Step 6: Grounded Answer Generation
            gen_res = self.generator.generate(
                query=query,
                language=lang,
                intent=intent,
                evidence_passages=retrieved_passages,
                tool_data=tool_data
            )
            answer_text = gen_res["answer_text"]
            source_citation = gen_res["source_citation"]
            engine_used = gen_res["engine"]

        # Step 7: Text-to-Speech (TTS) Voice Synthesis
        audio_reply_path = None
        if generate_audio and answer_text:
            try:
                audio_reply_path = TextToSpeechService.synthesize(
                    text=answer_text,
                    language=lang
                )
                logs.append(f"TTS generated audio reply at: {audio_reply_path}")
            except Exception as e:
                logs.append(f"TTS synthesis notice: {e}")

        total_latency = time.time() - start_time
        logs.append(f"Pipeline completed in {total_latency:.2f}s")

        return {
            "success": True,
            "query": query,
            "language": lang,
            "intent": intent,
            "entities": entities,
            "answer_text": answer_text,
            "source_citation": source_citation,
            "audio_reply_path": audio_reply_path,
            "latency_seconds": round(total_latency, 2),
            "gate_decision": gate_decision,
            "engine": engine_used,
            "logs": logs
        }
