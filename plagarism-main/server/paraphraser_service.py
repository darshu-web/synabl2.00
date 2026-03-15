import json
import os
import sys
import torch
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
from sentence_transformers import SentenceTransformer, util

# Set model names
PARAPHRASE_MODEL = "Vamsi/T5_Paraphrase_Paws"
SIMILARITY_MODEL = "sentence-transformers/all-MiniLM-L6-v2"

def emit(payload):
    sys.stdout.write(json.dumps(payload, ensure_ascii=True) + "\n")
    sys.stdout.flush()

import difflib
import re

def get_word_diff(text1, text2):
    # Normalize and split into words
    words1 = re.findall(r'\w+|[^\w\s]', text1)
    words2 = re.findall(r'\w+|[^\w\s]', text2)
    
    matcher = difflib.SequenceMatcher(None, words1, words2)
    
    diff_data = {
        "original_tagged": [],
        "generated_tagged": [],
        "metrics": {
            "original_words": len(words1),
            "generated_words": len(words2),
            "changed": 0,
            "unchanged": 0
        },
        "substitutions": []
    }
    
    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        orig_part = words1[i1:i2]
        gen_part = words2[j1:j2]
        
        if tag == 'equal':
            chunk = " ".join(orig_part)
            diff_data["original_tagged"].append({"type": "equal", "text": chunk})
            diff_data["generated_tagged"].append({"type": "equal", "text": chunk})
            diff_data["metrics"]["unchanged"] += len(orig_part)
        elif tag == 'replace':
            diff_data["original_tagged"].append({"type": "removed", "text": " ".join(orig_part)})
            diff_data["generated_tagged"].append({"type": "added", "text": " ".join(gen_part)})
            diff_data["metrics"]["changed"] += max(len(orig_part), len(gen_part))
            if len(orig_part) == 1 and len(gen_part) == 1:
                diff_data["substitutions"].append(f"{orig_part[0]} \u2192 {gen_part[0]}")
        elif tag == 'delete':
            diff_data["original_tagged"].append({"type": "removed", "text": " ".join(orig_part)})
            diff_data["metrics"]["changed"] += len(orig_part)
        elif tag == 'insert':
            diff_data["generated_tagged"].append({"type": "added", "text": " ".join(gen_part)})
            diff_data["metrics"]["changed"] += len(gen_part)

    # Calculate rate
    total = diff_data["metrics"]["unchanged"] + diff_data["metrics"]["changed"]
    diff_data["metrics"]["modification_rate"] = round((diff_data["metrics"]["changed"] / total * 100), 1) if total > 0 else 0
    
    return diff_data

class ParaphraserService:
    def __init__(self):
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.tokenizer = None
        self.model = None
        self.sim_model = None

    def load_models(self):
        try:
            emit({"type": "status", "message": f"Loading {PARAPHRASE_MODEL}..."})
            self.tokenizer = AutoTokenizer.from_pretrained(PARAPHRASE_MODEL)
            self.model = AutoModelForSeq2SeqLM.from_pretrained(PARAPHRASE_MODEL).to(self.device)
            
            emit({"type": "status", "message": f"Loading {SIMILARITY_MODEL}..."})
            self.sim_model = SentenceTransformer(SIMILARITY_MODEL).to(self.device)
            
            emit({"type": "ready"})
        except Exception as e:
            emit({"type": "fatal", "error": str(e)})
            sys.exit(1)

    def process_text(self, text, mode="paraphrase", num_return_sequences=1):
        if not text:
            return ""

        # Prepare for T5
        if mode == "expand":
            input_text = f"Expand the following text with more details and context: {text}"
            max_length = 256
        else:
            input_text = f"paraphrase: {text} </s>"
            max_length = 128

        encoding = self.tokenizer.encode_plus(
            input_text, 
            pad_to_max_length=True, 
            return_tensors="pt"
        )
        
        input_ids = encoding["input_ids"].to(self.device)
        attention_masks = encoding["attention_mask"].to(self.device)

        outputs = self.model.generate(
            input_ids=input_ids, 
            attention_mask=attention_masks,
            do_sample=True,
            max_length=max_length,
            top_k=120,
            top_p=0.95,
            early_stopping=True,
            num_return_sequences=num_return_sequences
        )

        results = []
        for output in outputs:
            line = self.tokenizer.decode(output, skip_special_tokens=True, clean_up_tokenization_spaces=True)
            results.append(line)

        # Calculate similarity for the first result
        original_embedding = self.sim_model.encode(text, convert_to_tensor=True)
        paraphrased_embedding = self.sim_model.encode(results[0], convert_to_tensor=True)
        similarity = util.cos_sim(original_embedding, paraphrased_embedding).item()

        # Generate Diff Data
        diff_info = get_word_diff(text, results[0])

        return {
            "original": text,
            "result": results[0],
            "alternatives": results[1:] if len(results) > 1 else [],
            "similarity": round(similarity * 100, 2),
            "diff": diff_info,
            "mode": mode
        }

def main():
    service = ParaphraserService()
    service.load_models()

    for line in sys.stdin:
        try:
            raw = line.strip()
            if not raw: continue
            
            payload = json.loads(raw)
            req_id = payload.get("id")
            text = payload.get("text", "")
            mode = payload.get("mode", "paraphrase")
            
            result = service.process_text(text, mode=mode)
            emit({
                "type": "result",
                "id": req_id,
                "ok": True,
                "data": result
            })
        except Exception as e:
            emit({
                "type": "result",
                "id": req_id if 'req_id' in locals() else None,
                "ok": False,
                "error": str(e)
            })

if __name__ == "__main__":
    main()
