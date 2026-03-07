import { spawn } from "child_process";
import path from "path";
import readline from "readline";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const scriptPath = path.resolve(__dirname, "ai_model_service.py");

let worker = null;
let readyPromise = null;
let resolveReady = null;
let rejectReady = null;
let sequence = 0;
const pending = new Map();

function resetWorker() {
  if (worker) {
    worker.removeAllListeners();
  }

  worker = null;
  readyPromise = null;
  resolveReady = null;
  rejectReady = null;
}

function rejectAllPending(reason) {
  for (const { reject, timer } of pending.values()) {
    clearTimeout(timer);
    reject(reason);
  }
  pending.clear();
}

function handleWorkerLine(line) {
  let message;
  try {
    message = JSON.parse(line);
  } catch {
    return;
  }

  if (message.type === "ready") {
    if (resolveReady) resolveReady(message);
    return;
  }

  if (message.type === "fatal") {
    const error = new Error(message.error || "Local AI model failed to start");
    if (rejectReady) rejectReady(error);
    rejectAllPending(error);
    if (worker) worker.kill();
    return;
  }

  if (message.type !== "result") return;
  const req = pending.get(String(message.id));
  if (!req) return;

  clearTimeout(req.timer);
  pending.delete(String(message.id));

  if (!message.ok) {
    req.reject(new Error(message.error || "Local model inference failed"));
    return;
  }

  req.resolve(message);
}

function startWorker() {
  const pythonBin = process.env.AI_MODEL_PYTHON_BIN || "python";
  worker = spawn(pythonBin, [scriptPath], {
    stdio: ["pipe", "pipe", "pipe"],
  });

  const rl = readline.createInterface({ input: worker.stdout });
  rl.on("line", handleWorkerLine);

  worker.stderr.on("data", (chunk) => {
    if (process.env.AI_MODEL_DEBUG !== "true") return;
    const text = String(chunk || "").trim();
    if (text) {
      console.error("[ai-model-service]", text);
    }
  });

  worker.on("error", (error) => {
    if (rejectReady) rejectReady(error);
    rejectAllPending(error);
    resetWorker();
  });

  worker.on("exit", (code, signal) => {
    const reason = new Error(
      `Local AI model service exited (code=${code}, signal=${signal || "none"})`
    );
    if (rejectReady) rejectReady(reason);
    rejectAllPending(reason);
    resetWorker();
  });

  readyPromise = new Promise((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });
}

async function ensureWorkerReady() {
  if (!worker || !readyPromise) {
    startWorker();
  }
  return readyPromise;
}

export function isLocalModelEnabled() {
  return process.env.AI_LOCAL_MODEL_ENABLED !== "false";
}

export async function scoreWithLocalModel(text, timeoutMs = 25000) {
  if (!isLocalModelEnabled()) {
    throw new Error("local_model_disabled");
  }

  await ensureWorkerReady();
  if (!worker) {
    throw new Error("local_model_unavailable");
  }

  const id = String(++sequence);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error("local_model_timeout"));
    }, timeoutMs);

    pending.set(id, { resolve, reject, timer });
    try {
      worker.stdin.write(`${JSON.stringify({ id, text })}\n`);
    } catch (error) {
      clearTimeout(timer);
      pending.delete(id);
      reject(
        error instanceof Error ? error : new Error("local_model_write_failed")
      );
    }
  });
}
