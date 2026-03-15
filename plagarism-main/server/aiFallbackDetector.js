import fs from "fs/promises";
import path from "path";
import {
  brotliCompressSync,
  constants as zlibConstants,
  deflateRawSync,
} from "zlib";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_SIGMOID_SCALE = 2.5;
const MAX_ZLIB_CHUNK_BYTES = 2 ** 15;

let contextPromise = null;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function cleanText(value) {
  return String(value || "")
    .replace(/ +/g, " ")
    .replace(/\t/g, "")
    .replace(/\n+/g, "\n")
    .replace(/\n /g, "\n")
    .replace(/ \n/g, "\n")
    .replace(/[^0-9A-Za-z,.() \n]/g, "")
    .trim();
}

function mean(values) {
  if (!Array.isArray(values) || values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function isZippyRepoRoot(candidate) {
  return fileExists(path.join(candidate, "zippy", "zippy.py"));
}

async function resolveZippyRepo() {
  const envPath = process.env.ZIPPY_REPO_PATH;
  const candidates = [
    envPath,
    path.resolve(__dirname, "..", "..", "..", "zippy"),
    path.resolve(__dirname, "..", "..", "zippy"),
    path.resolve(__dirname, "..", "zippy"),
    path.resolve(process.cwd(), "zippy"),
    path.resolve(process.cwd(), "..", "zippy"),
    path.resolve(process.cwd(), "..", "..", "zippy"),
  ].filter(Boolean);

  for (const rawCandidate of candidates) {
    const candidate = path.resolve(rawCandidate);

    if (await isZippyRepoRoot(candidate)) {
      return candidate;
    }

    if (
      (await fileExists(path.join(candidate, "zippy.py"))) &&
      (await fileExists(path.join(candidate, "__init__.py")))
    ) {
      const parent = path.dirname(candidate);
      if (await isZippyRepoRoot(parent)) {
        return parent;
      }
    }
  }

  return null;
}

async function resolvePreludeFile(repoPath) {
  const envPath = process.env.ZIPPY_PRELUDE_FILE;
  if (envPath) {
    const explicit = path.resolve(envPath);
    if (await fileExists(explicit)) return explicit;
  }
  return path.resolve(repoPath, "zippy", "ai-generated.txt");
}

function splitPreludeForZlib(prelude) {
  if (prelude.length <= MAX_ZLIB_CHUNK_BYTES) {
    return [prelude];
  }

  const lines = prelude.split("\n");
  const chunkCount = Math.max(
    1,
    Math.ceil(prelude.length / MAX_ZLIB_CHUNK_BYTES)
  );
  const chunks = [];

  for (let i = 0; i < chunkCount; i += 1) {
    const start = Math.floor((i * lines.length) / chunkCount);
    const end = Math.floor(((i + 1) * lines.length) / chunkCount);
    const chunk = lines.slice(start, end).join("\n").trim();
    if (chunk) chunks.push(chunk);
  }

  if (chunks.length === 0) return [prelude];
  return chunks;
}

function zlibRatio(text) {
  const input = Buffer.from(text, "utf8");
  if (input.length === 0) return 1;

  const compressed = deflateRawSync(input, {
    level: 9,
    memLevel: 9,
    windowBits: 15,
  });
  return compressed.length / input.length;
}

function brotliRatio(text) {
  const input = Buffer.from(text, "utf8");
  if (input.length === 0) return 1;

  const compressed = brotliCompressSync(input, {
    params: {
      [zlibConstants.BROTLI_PARAM_MODE]: zlibConstants.BROTLI_MODE_TEXT,
      [zlibConstants.BROTLI_PARAM_QUALITY]: 8,
      [zlibConstants.BROTLI_PARAM_LGWIN]: 24,
    },
  });
  return compressed.length / input.length;
}

function signedToAiProbability(signedScore, scale) {
  const x = clamp(signedScore * scale, -60, 60);
  return 1 / (1 + Math.exp(x));
}

function estimateConfidence(signedScore, votes, text) {
  const aiVotes = Number(votes?.ai || 0);
  const humanVotes = Number(votes?.human || 0);
  const totalVotes = Math.max(1, aiVotes + humanVotes);

  const consensus = Math.max(aiVotes, humanVotes) / totalVotes;
  const margin = clamp(Math.abs(signedScore) / 1.5, 0, 1);
  const textDensity = clamp(cleanText(text).split(/\s+/).filter(Boolean).length / 220, 0, 1);

  const confidence = consensus * 0.45 + margin * 0.35 + textDensity * 0.2;
  return Math.round(clamp(confidence * 100, 0, 100));
}

function getSigmoidScale() {
  const parsed = Number(process.env.ZIPPY_SIGMOID_SCALE || DEFAULT_SIGMOID_SCALE);
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_SIGMOID_SCALE;
  return parsed;
}

async function loadContext() {
  const repoPath = await resolveZippyRepo();
  if (!repoPath) {
    throw new Error(
      "Could not locate cloned thinkst/zippy repo. Set ZIPPY_REPO_PATH."
    );
  }

  const preludeFile = await resolvePreludeFile(repoPath);
  if (!(await fileExists(preludeFile))) {
    throw new Error(
      `ZipPy prelude file missing: ${preludeFile}. Set ZIPPY_PRELUDE_FILE.`
    );
  }

  const preludeRaw = await fs.readFile(preludeFile, "utf8");
  const prelude = cleanText(preludeRaw);
  if (!prelude) {
    throw new Error("ZipPy prelude file is empty after normalization.");
  }

  const zlibPreludeChunks = splitPreludeForZlib(prelude);
  const zlibPreludeRatio = mean(zlibPreludeChunks.map((chunk) => zlibRatio(chunk)));
  const brotliPreludeRatio = brotliRatio(prelude);

  return {
    repoPath,
    preludeFile,
    prelude,
    zlibPreludeChunks,
    zlibPreludeRatio,
    brotliPreludeRatio,
  };
}

async function getContext() {
  if (!contextPromise) {
    contextPromise = loadContext().catch((error) => {
      contextPromise = null;
      throw error;
    });
  }
  return contextPromise;
}

function buildEngineResult(engine, delta, sigmoidScale) {
  const determination = delta >= 0 ? "AI" : "Human";
  const magnitude = Math.abs(delta * 100);
  const signedScore = determination === "AI" ? -magnitude : magnitude;

  return {
    engine,
    determination,
    score: magnitude,
    signed_score: signedScore,
    ai_probability: signedToAiProbability(signedScore, sigmoidScale),
  };
}

function scoreWithHeuristicFallback(text, reason = "heuristic_fallback") {
  const words = text.split(/\s+/).filter(Boolean);
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
  const sentenceLengths = sentences.map((sentence) =>
    sentence.split(/\s+/).filter(Boolean).length
  );
  const meanSentenceLength = mean(sentenceLengths) || words.length || 1;
  const sentenceVariance = mean(
    sentenceLengths.map((value) => (value - meanSentenceLength) ** 2)
  );
  const sentenceStd = Math.sqrt(sentenceVariance);
  const burstiness = sentenceStd / Math.max(meanSentenceLength, 1);
  const lexicalDiversity = words.length
    ? new Set(words.map((word) => word.toLowerCase())).size / words.length
    : 0;
  const punctuationDensity = text.length
    ? (text.match(/[.,;:!?]/g) || []).length / text.length
    : 0;
  const trigrams = [];
  for (let i = 0; i <= words.length - 3; i += 1) {
    trigrams.push(
      `${words[i].toLowerCase()} ${words[i + 1].toLowerCase()} ${words[
        i + 2
      ].toLowerCase()}`
    );
  }
  const trigramSet = new Set(trigrams);
  const repetitionRatio = trigrams.length
    ? 1 - trigramSet.size / trigrams.length
    : 0;

  const uniformityRisk = clamp(1 - burstiness / 0.45, 0, 1);
  const lowLexicalRisk = clamp((0.58 - lexicalDiversity) / 0.58, 0, 1);
  const lowPunctuationRisk = clamp((0.018 - punctuationDensity) / 0.018, 0, 1);
  const repetitionRisk = clamp(repetitionRatio / 0.12, 0, 1);
  const longSentenceRisk = clamp((meanSentenceLength - 22) / 25, 0, 1);

  const aiProbability = clamp(
    0.15 +
      uniformityRisk * 0.24 +
      lowLexicalRisk * 0.24 +
      lowPunctuationRisk * 0.14 +
      repetitionRisk * 0.18 +
      longSentenceRisk * 0.2,
    0,
    1
  );

  const confidence = clamp(
    Math.round(
      35 +
        Math.abs(aiProbability - 0.5) * 80 +
        clamp(words.length / 400, 0, 1) * 15
    ),
    0,
    100
  );

  const determination = aiProbability >= 0.5 ? "AI" : "Human";
  const scoreMagnitude = Math.abs(aiProbability - 0.5) * 100;
  const signedScore = determination === "AI" ? -scoreMagnitude : scoreMagnitude;

  return {
    fake_probability: aiProbability,
    real_probability: 1 - aiProbability,
    confidence,
    signed_score: signedScore,
    votes: {
      ai: determination === "AI" ? 1 : 0,
      human: determination === "Human" ? 1 : 0,
    },
    engines: [
      {
        engine: "heuristic_style",
        determination,
        score: scoreMagnitude,
        signed_score: signedScore,
        ai_probability: aiProbability,
      },
    ],
    model: "heuristic_fallback",
    source: "heuristic_fallback",
    fallback_reason: reason,
  };
}

export function isNodeFallbackEnabled() {
  return process.env.AI_MODEL_FALLBACK_ENABLED !== "false";
}

export async function scoreWithNodeFallback(text) {
  const normalizedText = cleanText(text);
  if (!normalizedText) {
    return {
      fake_probability: 0,
      real_probability: 1,
      confidence: 0,
      signed_score: 0,
      votes: { ai: 0, human: 0 },
      engines: [],
      model: "zippy_node_fallback",
    };
  }

  const sigmoidScale = getSigmoidScale();
  let ctx;
  try {
    ctx = await getContext();
  } catch (error) {
    return scoreWithHeuristicFallback(
      normalizedText,
      error instanceof Error ? error.message : String(error)
    );
  }

  const zlibSampleRatio = mean(
    ctx.zlibPreludeChunks.map((chunk) => zlibRatio(`${chunk}${normalizedText}`))
  );
  const brotliSampleRatio = brotliRatio(`${ctx.prelude}${normalizedText}`);

  const engines = [
    buildEngineResult("zlib", ctx.zlibPreludeRatio - zlibSampleRatio, sigmoidScale),
    buildEngineResult(
      "brotli",
      ctx.brotliPreludeRatio - brotliSampleRatio,
      sigmoidScale
    ),
  ];

  const votes = engines.reduce(
    (acc, result) => {
      if (String(result.determination).toLowerCase() === "ai") {
        acc.ai += 1;
      } else {
        acc.human += 1;
      }
      return acc;
    },
    { ai: 0, human: 0 }
  );

  const signedScore = mean(engines.map((engine) => Number(engine.signed_score) || 0));
  const fakeProbability = signedToAiProbability(signedScore, sigmoidScale);
  const confidence = estimateConfidence(signedScore, votes, normalizedText);

  return {
    fake_probability: fakeProbability,
    real_probability: 1 - fakeProbability,
    confidence,
    signed_score: signedScore,
    votes,
    engines,
    model: "zippy_node_fallback",
    repo_path: ctx.repoPath,
    prelude_file: ctx.preludeFile,
  };
}
