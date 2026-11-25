import json
import time
from pathlib import Path
from config.settings import settings
from src.pipeline import AgriculturalAssistantPipeline

def run_evaluation():
    print("=" * 60)
    print("Starting Agricultural Assistant Benchmark Evaluation...")
    print("=" * 60)

    if not settings.EVAL_DATASET_PATH.exists():
        print(f"Error: Evaluation dataset not found at {settings.EVAL_DATASET_PATH}")
        return

    with open(settings.EVAL_DATASET_PATH, "r", encoding="utf-8") as f:
        test_cases = json.load(f)

    pipeline = AgriculturalAssistantPipeline()

    total_cases = len(test_cases)
    retrieval_hits = 0
    answerable_count = 0
    correct_refusals = 0
    refusal_target_count = 0
    intent_hits = 0
    latencies = []

    results_table = []

    for case in test_cases:
        qid = case["id"]
        query = case["query"]
        lang = case["language"]
        is_answerable = case.get("is_answerable", True)
        expected_intent = case.get("expected_intent")

        print(f"\n[Test Case {qid}] ({lang.upper()}): {query}")
        start_t = time.time()
        res = pipeline.process_query(text_query=query, language_hint=lang, generate_audio=False)
        lat = time.time() - start_t
        latencies.append(lat)

        detected_intent = res["intent"]
        gate = res["gate_decision"]
        answer_text = res["answer_text"]

        # Check Intent Classification
        matched = (
            detected_intent == expected_intent 
            or (expected_intent == "unanswerable_or_adversarial" and detected_intent in ["out_of_scope", "refuse"])
            or (expected_intent in ["crop_advice", "pest_disease"] and detected_intent in ["crop_advice", "pest_disease"])
        )
        if matched:
            intent_hits += 1
            intent_status = "PASS"
        else:
            intent_status = f"FAIL (got {detected_intent})"

        # Check Refusal
        if not is_answerable:
            refusal_target_count += 1
            if gate["decision"] == "refuse":
                correct_refusals += 1
                refusal_status = "PASS (Safely Refused)"
            else:
                refusal_status = "FAIL (Did not refuse)"
        else:
            refusal_status = "N/A"

        # Check Retrieval / Grounding
        if is_answerable and expected_intent in ["crop_advice", "scheme", "pest_disease"]:
            answerable_count += 1
            must_sources = case.get("must_contain_sources", [])
            hit = any(src.lower() in answer_text.lower() or src.lower() in res.get("source_citation", "").lower() for src in must_sources)
            if hit or len(must_sources) == 0:
                retrieval_hits += 1
                retrieval_status = "PASS (Source Cited)"
            else:
                retrieval_status = "FAIL (Source Missing)"
        else:
            retrieval_status = "N/A"

        print(f"  -> Detected Intent: {detected_intent} [{intent_status}]")
        print(f"  -> Decision: {gate['decision']} | Latency: {lat:.2f}s")
        print(f"  -> Answer snippet: {answer_text[:80]}...")

        results_table.append({
            "id": qid,
            "query": query,
            "intent_status": intent_status,
            "retrieval_status": retrieval_status,
            "refusal_status": refusal_status,
            "latency": round(lat, 2)
        })

    # Summary Metrics
    avg_latency = sum(latencies) / max(len(latencies), 1)
    retrieval_acc = (retrieval_hits / max(answerable_count, 1)) * 100
    refusal_acc = (correct_refusals / max(refusal_target_count, 1)) * 100
    intent_acc = (intent_hits / total_cases) * 100

    print("\n" + "=" * 60)
    print("📊 BENCHMARK EVALUATION SUMMARY")
    print("=" * 60)
    print(f"Total Test Cases: {total_cases}")
    print(f"• Intent Classification Accuracy: {intent_acc:.1f}%")
    print(f"• Retrieval & Grounding Recall:  {retrieval_acc:.1f}% (Blueprint Target: >= 85%)")
    print(f"• Safe Refusal Accuracy:         {refusal_acc:.1f}% (Blueprint Target: >= 90%)")
    print(f"• Average Latency:               {avg_latency:.2f}s  (Blueprint Target: < 15s)")
    print("=" * 60)

    # Save summary report
    report_path = settings.DATA_DIR / "evaluation" / "evaluation_report.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump({
            "total_cases": total_cases,
            "intent_accuracy_percent": round(intent_acc, 2),
            "retrieval_recall_percent": round(retrieval_acc, 2),
            "safe_refusal_percent": round(refusal_acc, 2),
            "average_latency_seconds": round(avg_latency, 2),
            "details": results_table
        }, f, indent=2, ensure_ascii=False)
    print(f"Evaluation report saved to: {report_path}")

if __name__ == "__main__":
    run_evaluation()
