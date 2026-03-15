import json
import math
import os
import sys
from pathlib import Path
from statistics import mean


def emit(payload):
    sys.stdout.write(json.dumps(payload, ensure_ascii=True) + "\n")
    sys.stdout.flush()


def clamp(value, minimum, maximum):
    return max(minimum, min(maximum, value))


def resolve_zippy_repo():
    env_path = os.environ.get("ZIPPY_REPO_PATH")
    candidates = []
    if env_path:
        candidates.append(Path(env_path))

    script_path = Path(__file__).resolve()
    # server/ai_model_service.py -> plagarism-main -> synabl2.00 -> workspace root
    if len(script_path.parents) >= 4:
        workspace_root = script_path.parents[3]
        candidates.append(workspace_root / "zippy")

    # Additional fallbacks if layout changes.
    candidates.append(script_path.parents[1] / "zippy")
    candidates.append(Path.cwd() / "zippy")

    for candidate in candidates:
        if candidate and (candidate / "zippy" / "zippy.py").exists():
            return candidate.resolve()

    return None


def resolve_prelude_file(repo_path):
    env_path = os.environ.get("ZIPPY_PRELUDE_FILE")
    if env_path:
        candidate = Path(env_path)
        if candidate.exists():
            return candidate.resolve()
    default_file = repo_path / "zippy" / "ai-generated.txt"
    return default_file.resolve()


def signed_to_ai_probability(signed_score, scale):
    # ZipPy signed score: negative => AI, positive => Human.
    x = clamp(signed_score * scale, -60.0, 60.0)
    return 1.0 / (1.0 + math.exp(x))


def estimate_confidence(signed_score, votes, text):
    ai_votes = int(votes.get("ai", 0))
    human_votes = int(votes.get("human", 0))
    total_votes = max(1, ai_votes + human_votes)

    consensus = max(ai_votes, human_votes) / total_votes
    margin = clamp(abs(signed_score) / 1.5, 0.0, 1.0)
    text_density = clamp(len(text.split()) / 220.0, 0.0, 1.0)

    confidence = (consensus * 0.45) + (margin * 0.35) + (text_density * 0.2)
    return int(round(clamp(confidence * 100, 0.0, 100.0)))


def load_zippy_detectors():
    repo_path = resolve_zippy_repo()
    if not repo_path:
        raise RuntimeError(
            "Could not locate cloned thinkst/zippy repo. Set ZIPPY_REPO_PATH."
        )

    if str(repo_path) not in sys.path:
        sys.path.insert(0, str(repo_path))

    from zippy.zippy import CompressionEngine, Zippy  # type: ignore

    prelude_file = resolve_prelude_file(repo_path)
    if not prelude_file.exists():
        raise RuntimeError(
            f"ZipPy prelude file missing: {prelude_file}. Set ZIPPY_PRELUDE_FILE."
        )

    preset_env = os.environ.get("ZIPPY_PRESET")
    preset = int(preset_env) if preset_env else None

    engine_specs = [
        ("lzma", CompressionEngine.LZMA),
        ("brotli", CompressionEngine.BROTLI),
        ("zlib", CompressionEngine.ZLIB),
    ]

    detectors = []
    for engine_name, engine in engine_specs:
        kwargs = {"prelude_file": str(prelude_file)}
        if preset is not None:
            kwargs["preset"] = preset
        detectors.append((engine_name, Zippy(engine, **kwargs)))

    return {
        "repo_path": str(repo_path),
        "prelude_file": str(prelude_file),
        "detectors": detectors,
    }


def score_text(detectors, text, sigmoid_scale):
    engine_results = []
    signed_scores = []
    votes = {"ai": 0, "human": 0}
    # Force one chunk to avoid multiprocessing restrictions in constrained environments.
    chunk_size = max(1, len(text) + 1)

    for engine_name, detector in detectors:
        determination, raw_delta = detector.run_on_text_chunked(
            text,
            chunk_size=chunk_size,
        )

        raw_delta = float(raw_delta)
        signed = -raw_delta if str(determination).lower() == "ai" else raw_delta
        ai_probability = signed_to_ai_probability(signed, sigmoid_scale)

        if str(determination).lower() == "ai":
            votes["ai"] += 1
        else:
            votes["human"] += 1

        signed_scores.append(signed)
        engine_results.append(
            {
                "engine": engine_name,
                "determination": determination,
                "score": raw_delta,
                "signed_score": signed,
                "ai_probability": ai_probability,
            }
        )

    aggregate_signed = mean(signed_scores) if signed_scores else 0.0
    fake_probability = signed_to_ai_probability(aggregate_signed, sigmoid_scale)
    confidence = estimate_confidence(aggregate_signed, votes, text)

    return {
        "fake_probability": fake_probability,
        "real_probability": 1.0 - fake_probability,
        "confidence": confidence,
        "signed_score": aggregate_signed,
        "votes": votes,
        "engines": engine_results,
    }


def main():
    sigmoid_scale = float(os.environ.get("ZIPPY_SIGMOID_SCALE", "2.5"))

    try:
        model_context = load_zippy_detectors()
        emit(
            {
                "type": "ready",
                "model": "thinkst/zippy",
                "repo_path": model_context["repo_path"],
                "prelude_file": model_context["prelude_file"],
                "engines": [e[0] for e in model_context["detectors"]],
            }
        )
    except Exception as error:
        emit({"type": "fatal", "error": str(error), "model": "thinkst/zippy"})
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
            text = text.strip()

            if not text:
                emit(
                    {
                        "type": "result",
                        "id": req_id,
                        "ok": True,
                        "fake_probability": 0.0,
                        "real_probability": 1.0,
                        "confidence": 0,
                        "signed_score": 0.0,
                        "votes": {"ai": 0, "human": 0},
                        "engines": [],
                    }
                )
                continue

            scores = score_text(model_context["detectors"], text, sigmoid_scale)
            emit(
                {
                    "type": "result",
                    "id": req_id,
                    "ok": True,
                    **scores,
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
