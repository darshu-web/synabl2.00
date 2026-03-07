import json
import os
import sys
import warnings

import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer

os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS_WARNING", "1")
os.environ.setdefault("TRANSFORMERS_NO_ADVISORY_WARNINGS", "1")
warnings.filterwarnings("ignore")

MODEL_ID = os.environ.get(
    "AI_LOCAL_MODEL_ID", "Hello-SimpleAI/chatgpt-detector-roberta"
)
MAX_LENGTH = int(os.environ.get("AI_LOCAL_MODEL_MAX_LENGTH", "512"))


def emit(payload):
    sys.stdout.write(json.dumps(payload, ensure_ascii=True) + "\n")
    sys.stdout.flush()


def pick_probabilities(probabilities, id2label):
    entries = []
    for idx, prob in enumerate(probabilities):
        label = str(id2label.get(idx, idx)).lower()
        entries.append((idx, label, float(prob)))

    fake_candidates = [
        prob
        for _, label, prob in entries
        if ("fake" in label) or ("generated" in label) or (label == "ai")
    ]
    real_candidates = [
        prob for _, label, prob in entries if ("real" in label) or ("human" in label)
    ]

    if fake_candidates and real_candidates:
        return max(fake_candidates), max(real_candidates)

    if len(entries) == 2:
        return float(entries[0][2]), float(entries[1][2])

    max_prob = max((prob for _, _, prob in entries), default=0.0)
    return max_prob, 1.0 - max_prob


def load_model():
    tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
    model = AutoModelForSequenceClassification.from_pretrained(MODEL_ID)
    model.eval()
    id2label = getattr(model.config, "id2label", {}) or {}
    normalized_labels = {}
    for key, value in id2label.items():
        normalized_labels[int(key)] = str(value)
    return tokenizer, model, normalized_labels


def main():
    try:
        tokenizer, model, id2label = load_model()
        emit({"type": "ready", "model": MODEL_ID})
    except Exception as error:
        emit({"type": "fatal", "error": str(error), "model": MODEL_ID})
        return 1

    for line in sys.stdin:
        raw = line.strip()
        if not raw:
            continue

        req_id = None
        try:
            payload = json.loads(raw)
            req_id = payload.get("id")
            text = payload.get("text", "")
            if not isinstance(text, str):
                text = str(text)

            if not text.strip():
                emit(
                    {
                        "type": "result",
                        "id": req_id,
                        "ok": True,
                        "fake_probability": 0.0,
                        "real_probability": 1.0,
                        "labels": id2label,
                    }
                )
                continue

            inputs = tokenizer(
                text,
                return_tensors="pt",
                truncation=True,
                max_length=MAX_LENGTH,
            )
            with torch.no_grad():
                logits = model(**inputs).logits
                probs = torch.softmax(logits, dim=-1)[0].tolist()

            fake_prob, real_prob = pick_probabilities(probs, id2label)
            emit(
                {
                    "type": "result",
                    "id": req_id,
                    "ok": True,
                    "fake_probability": float(fake_prob),
                    "real_probability": float(real_prob),
                    "labels": id2label,
                }
            )
        except Exception as error:
            emit(
                {
                    "type": "result",
                    "id": req_id,
                    "ok": False,
                    "error": str(error),
                }
            )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
