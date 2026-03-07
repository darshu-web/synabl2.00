import json
import os
import sys

# Mocking the environment to use the new model
os.environ["AI_LOCAL_MODEL_ID"] = "Hello-SimpleAI/chatgpt-detector-roberta"

# Add the server directory to path to import the service logic if possible, 
# but it's easier to just run the script as a subprocess like the app does.

def test_inference(text):
    import subprocess
    import json
    
    process = subprocess.Popen(
        [sys.executable, "server/ai_model_service.py"],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    
    # Wait for ready signal
    ready_line = process.stdout.readline()
    print(f"Model Ready: {ready_line.strip()}")
    
    # Send request
    payload = {"id": "test-1", "text": text}
    process.stdin.write(json.dumps(payload) + "\n")
    process.stdin.flush()
    
    # Get result
    result_line = process.stdout.readline()
    process.terminate()
    return json.loads(result_line)

# Test cases
human_text = """
The sun was setting behind the rugged mountains, casting long, golden shadows across the valley. 
I took a deep breath of the crisp autumn air, feeling the crunch of dry leaves under my boots. 
It had been a long journey, but seeing the smoke rising from the chimney of the old cabin made every mile worth it.
"""

ai_text = """
The field of artificial intelligence has seen significant advancements in recent years. 
Large language models are capable of generating human-like text by predicting the next token in a sequence. 
This technology has various applications, ranging from automated customer service to creative writing assistance. 
However, it also raises ethical concerns regarding misinformation and academic integrity.
"""

print("--- Testing Human Text ---")
print(test_inference(human_text))

print("\n--- Testing AI Text ---")
print(test_inference(ai_text))
