from typing import Dict, List, Optional
from config.settings import settings

class ConfidenceGate:
    """
    Evaluates pipeline signals (ASR confidence, intent validity, retrieval score,
    and chemical safety) to decide whether to answer, ask to repeat, or safely refuse.
    """

    KISAN_CALL_CENTRE = "1800-180-1551"

    @classmethod
    def evaluate(
        cls,
        asr_confidence: float,
        nlu_result: Dict,
        retrieved_passages: Optional[List[Dict]] = None
    ) -> Dict:
        """
        Returns: {
            "decision": "proceed" | "ask_repeat" | "refuse",
            "reason_code": str,
            "refusal_message": Optional[Dict[str, str]],
            "safety_note": Optional[str]
        }
        """
        lang = nlu_result.get("language", "hi")

        # 1. Check ASR Confidence
        if asr_confidence < settings.MIN_ASR_CONFIDENCE:
            messages = {
                "mr": "माफ करा, तुमचा आवाज स्पष्ट ऐकू आला नाही. कृपया तुमचा प्रश्न शांत जागेवरून पुन्हा सांगा.",
                "hi": "माफ़ कीजिए, आपकी आवाज़ साफ़ सुनाई नहीं दी। कृपया अपना सवाल किसी शांत जगह से दोबारा बोलें।",
                "en": "Sorry, could not hear your voice clearly. Please repeat your question from a quiet place."
            }
            return {
                "decision": "ask_repeat",
                "reason_code": "LOW_ASR_CONFIDENCE",
                "message": messages.get(lang, messages["hi"])
            }

        # 2. Check Chemical Overdose / Hazardous Advice
        if nlu_result.get("intent") == "adversarial_chemical_overdose":
            messages = {
                "mr": f"धोकादायक सूचना: कीटकनाशकाचा डोस कधीही वाढवू किंवा दुप्पट करू नका! यामुळे पिकाचे नुकसान, विषबाधा व जमिनीचा पोत खराब होऊ शकतो. फक्त कृषी विद्यापीठाने शिफारस केलेला डोस वापरा किंवा किसान कॉल सेंटर ({cls.KISAN_CALL_CENTRE}) वर संपर्क साधा.",
                "hi": f"चेतावनी: कीटनाशक की मात्रा कभी भी दोगुनी न करें! इससे फसल जल सकती है और विषाक्तता का खतरा होता है। हमेशा प्रमाणित मात्रा का ही उपयोग करें या किसान कॉल सेंटर ({cls.KISAN_CALL_CENTRE}) पर संपर्क करें।",
                "en": f"Warning: Never double pesticide dosages! It can cause severe crop burning and health hazards. Consult Kisan Call Centre ({cls.KISAN_CALL_CENTRE})."
            }
            return {
                "decision": "refuse",
                "reason_code": "HAZARDOUS_OVERDOSE_REQUEST",
                "message": messages.get(lang, messages["hi"])
            }

        # 3. Check Out-of-Scope
        if nlu_result.get("intent") == "out_of_scope":
            messages = {
                "mr": f"माफ करा, मी फक्त शेती, पीक सल्ला, बाजारभाव, हवामान आणि सरकारी योजनांसंबंधी प्रश्नांची उत्तरे देऊ शकतो. इतर माहितीसाठी कृपया किसान कॉल सेंटर ({cls.KISAN_CALL_CENTRE}) वर संपर्क साधावा.",
                "hi": f"माफ़ कीजिए, मैं केवल खेती, फसल सलाह, मंडी भाव, मौसम और सरकारी योजनाओं से संबंधित सवालों के जवाब दे सकता हूँ। सहायता के लिए किसान कॉल सेंटर ({cls.KISAN_CALL_CENTRE}) से संपर्क करें।",
                "en": f"I can only assist with agriculture, crops, market prices, weather, and government schemes. For other queries, call Kisan Call Centre ({cls.KISAN_CALL_CENTRE})."
            }
            return {
                "decision": "refuse",
                "reason_code": "OUT_OF_SCOPE",
                "message": messages.get(lang, messages["hi"])
            }

        # 4. Check Retrieval Evidence (for knowledge-based queries)
        intent = nlu_result.get("intent")
        if intent in ["crop_advice", "pest_disease", "scheme"]:
            if not retrieved_passages or len(retrieved_passages) == 0:
                messages = {
                    "mr": f"माफ करा, आमच्या प्रमाणित दस्तऐवजांमध्ये याबद्दल पुरेशी माहिती उपलब्ध नाही. चुकीचा सल्ला देण्यापेक्षा कृपया आपल्या जवळच्या कृषी विज्ञान केंद्राशी (KVK) किंवा किसान कॉल सेंटर ({cls.KISAN_CALL_CENTRE}) शी संपर्क साधावा.",
                    "hi": f"माफ़ कीजिए, हमारे प्रमाणित दस्तावेजों में इस संबंध में पर्याप्त जानकारी नहीं मिली। गलत अनुमान लगाने के बजाय कृपया अपने नजदीकी कृषि विज्ञान केंद्र (KVK) या किसान कॉल सेंटर ({cls.KISAN_CALL_CENTRE}) से संपर्क करें।",
                    "en": f"Verified information not found. Rather than guessing, please consult your local Krishi Vigyan Kendra or Kisan Call Centre ({cls.KISAN_CALL_CENTRE})."
                }
                return {
                    "decision": "refuse",
                    "reason_code": "INSUFFICIENT_RETRIEVAL_EVIDENCE",
                    "message": messages.get(lang, messages["hi"])
                }

        return {
            "decision": "proceed",
            "reason_code": "HIGH_CONFIDENCE",
            "message": None
        }
