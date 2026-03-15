import json
import subprocess
import sys


def run_worker_test(text):
    process = subprocess.Popen(
        [sys.executable, "server/ai_model_service.py"],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
    )

    ready_line = process.stdout.readline().strip()
    print(f"Worker ready: {ready_line}")

    payload = {"id": "test-1", "text": text}
    process.stdin.write(json.dumps(payload) + "\n")
    process.stdin.flush()

    result_line = process.stdout.readline().strip()
    process.terminate()

    return json.loads(result_line)


human_text = """
I walked to the market this morning and picked up fruit, bread, and coffee.
The weather was mild, and a few neighbors stopped to chat along the way.
Later I spent an hour revising notes from yesterday's meeting.
"""

ai_like_text = """
Artificial intelligence systems can generate coherent language by modeling token-level probabilities.
These systems are often trained on broad corpora and optimized using transformer-based architectures.
As adoption increases, educators and reviewers continue exploring reliable detection techniques.
"""

print("--- ZipPy test: Human-style sample ---")
print(run_worker_test(human_text))

print("\n--- ZipPy test: AI-style sample ---")
print(run_worker_test(ai_like_text))
