import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class ParaphraserClient {
  constructor() {
    this.process = null;
    this.pendingRequests = new Map();
    this.isReady = false;
    this.isStarting = false;
    this.error = null;
  }

  async ensureStarted() {
    if (this.isReady) return;
    if (this.isStarting) {
      return new Promise((resolve) => {
        const check = setInterval(() => {
          if (this.isReady) {
            clearInterval(check);
            resolve();
          }
        }, 100);
      });
    }

    this.isStarting = true;
    const scriptPath = path.join(__dirname, "paraphraser_service.py");
    
    // Use the same python executable as your environment
    const pythonPath = process.platform === "win32" ? "python" : "python3";

    this.process = spawn(pythonPath, [scriptPath], {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, PYTHONIOENCODING: "utf-8" }
    });

    this.process.stdout.on("data", (data) => {
      const lines = data.toString().split("\n");
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const payload = JSON.parse(line);
          if (payload.type === "ready") {
            this.isReady = true;
            this.isStarting = false;
            console.log("Paraphraser service is ready.");
          } else if (payload.type === "status") {
            console.log(`Paraphraser: ${payload.message}`);
          } else if (payload.type === "result") {
            const resolver = this.pendingRequests.get(payload.id);
            if (resolver) {
              if (payload.ok) {
                resolver.resolve(payload.data);
              } else {
                resolver.reject(new Error(payload.error));
              }
              this.pendingRequests.delete(payload.id);
            }
          } else if (payload.type === "fatal") {
            this.error = payload.error;
            this.isStarting = false;
            console.error(`Paraphraser fatal error: ${payload.error}`);
          }
        } catch (e) {
             // Ignore partial lines or non-json output
        }
      }
    });

    this.process.stderr.on("data", (data) => {
      console.error(`Paraphraser STDERR: ${data}`);
    });

    this.process.on("close", (code) => {
      console.log(`Paraphraser process exited with code ${code}`);
      this.isReady = false;
      this.isStarting = false;
    });

    // Wait for ready signal
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        if (!this.isReady) reject(new Error("Paraphraser start timeout. The AI models are likely still downloading (1GB+). Please wait a few more minutes and refresh."));
      }, 600000); // 10 minutes to download models

      const check = setInterval(() => {
        if (this.isReady) {
          clearTimeout(timeout);
          clearInterval(check);
          resolve();
        }
        if (this.error) {
          clearTimeout(timeout);
          clearInterval(check);
          reject(new Error(this.error));
        }
      }, 500);
    });
  }

  async processText(text, mode = "paraphrase") {
    await this.ensureStarted();
    
    const id = crypto.randomUUID();
    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      this.process.stdin.write(JSON.stringify({ id, text, mode }) + "\n");
    });
  }
}

export const paraphraserClient = new ParaphraserClient();
