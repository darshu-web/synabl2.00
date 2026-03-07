import nlp from "compromise";
import natural from "natural";
import { isLocalModelEnabled, scoreWithLocalModel } from "./aiModelClient.js";

const SENTENCE_SPLIT_REGEX = /[.!?]+/;
const REQUEST_TIMEOUT_MS = 15000;
const DEFAULT_PROVIDER_WEIGHT = 1;
const PROVIDER_WEIGHTS = {
  local_stylometry: 0.35,
  openai_roberta_local: 1.5,
  sapling: 1,
  zerogpt: 1,
  originality_ai: 1,
  gptzero: 1,
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalize(value, min, max) {
  if (max <= min) return 0;
  return clamp((value - min) / (max - min), 0, 1);
}

function getStdDev(values) {
  if (!values.length) return 0;
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance =
    values.reduce((sum, v) => sum + (v - mean) * (v - mean), 0) / values.length;
  return Math.sqrt(variance);
}

function getFleschKincaidGrade(text) {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = text.split(/\s+/).filter(w => w.trim().length > 0);
  if (!sentences.length || !words.length) return 0;

  const syllables = words.reduce((count, word) => {
    word = word.toLowerCase().replace(/[^a-z]/g, "");
    if (!word) return count;
    let s = word.match(/[aeiouy]{1,2}/g);
    return count + (s ? s.length : 1);
  }, 0);

  const grade = 0.39 * (words.length / sentences.length) + 11.8 * (syllables / words.length) - 15.59;
  return Math.max(0, grade);
}

function getPunctuationDensity(text) {
  const chars = text.length;
  if (!chars) return 0;
  const puncts = (text.match(/[.,!?;:]/g) || []).length;
  return puncts / chars;
}

function getEntropy(items) {
  if (!items.length) return 0;
  const counts = new Map();
  for (const item of items) {
    counts.set(item, (counts.get(item) || 0) + 1);
  }

  const total = items.length;
  let entropy = 0;
  for (const count of counts.values()) {
    const p = count / total;
    entropy -= p * Math.log2(p);
  }

  return entropy;
}

function getNgramRepetitionRatio(tokens, n = 3) {
  if (tokens.length < n) return 0;

  const ngramCounts = new Map();
  for (let i = 0; i <= tokens.length - n; i++) {
    const gram = tokens.slice(i, i + n).join(" ");
    ngramCounts.set(gram, (ngramCounts.get(gram) || 0) + 1);
  }

  const total = ngramCounts.size;
  if (!total) return 0;

  let repeated = 0;
  for (const count of ngramCounts.values()) {
    if (count > 1) repeated += 1;
  }

  return repeated / total;
}

function buildIndicators(features) {
  return [
    {
      name: "Sentence Burstiness",
      value: Number(features.burstiness.toFixed(3)),
      note:
        features.burstiness < 0.35
          ? "Very uniform sentence lengths"
          : "Variable sentence rhythm",
    },
    {
      name: "Readability (Grade)",
      value: Number(features.readability.toFixed(2)),
      note:
        features.readability > 12
          ? "Academic/Formal complexity"
          : "Standard readable flow",
    },
    {
      name: "3-gram Repetition",
      value: Number(features.repetitionRatio.toFixed(3)),
      note:
        features.repetitionRatio > 0.08
          ? "High phrase reuse pattern"
          : "Limited repeated phrasing",
    },
    {
      name: "Lexical Diversity",
      value: Number(features.lexicalDiversity.toFixed(3)),
      note:
        features.lexicalDiversity < 0.4
          ? "Limited vocabulary variety"
          : "Healthy vocabulary spread",
    },
    {
      name: "Punctuation Density",
      value: Number(features.punctDensity.toFixed(4)),
      note:
        features.punctDensity < 0.02
          ? "Sparse punctuation"
          : "Normal punctuation structure",
    },
  ];
}

function classifyAiScore(aiProbability) {
  if (aiProbability >= 70) return "likely_ai";
  if (aiProbability >= 45) return "mixed_or_uncertain";
  return "likely_human";
}

function cleanText(text) {
  return (typeof text === "string" ? text : String(text || ""))
    .replace(/\s+/g, " ")
    .trim();
}

function getPathValue(obj, path) {
  let current = obj;
  for (const part of path) {
    if (current == null) return undefined;
    current = current[part];
  }
  return current;
}

function parsePercentValue(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^\d.-]/g, ""));
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function toPercent(value) {
  if (!Number.isFinite(value)) return null;
  if (value <= 1) return clamp(value * 100, 0, 100);
  return clamp(value, 0, 100);
}

function findFirstPercent(json, pathCandidates) {
  for (const path of pathCandidates) {
    const raw = getPathValue(json, path);
    const parsed = parsePercentValue(raw);
    if (parsed != null) return toPercent(parsed);
  }
  return null;
}

async function fetchJsonWithTimeout(url, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    const body = await response.text();
    let json = null;
    try {
      json = body ? JSON.parse(body) : null;
    } catch {
      json = null;
    }

    if (!response.ok) {
      const details =
        (json && (json.error || json.message)) || body || `HTTP ${response.status}`;
      throw new Error(String(details));
    }

    return json || {};
  } finally {
    clearTimeout(timer);
  }
}

function createProviderResult({
  id,
  label,
  status,
  score = null,
  confidence = null,
  reason = null,
  latencyMs = null,
}) {
  return {
    id,
    label,
    status,
    score: score == null ? null : Math.round(score),
    confidence: confidence == null ? null : Math.round(confidence),
    reason,
    latencyMs: latencyMs == null ? null : Math.round(latencyMs),
  };
}

function runLocalStylometry(text) {
  const sentenceTokenizer = new natural.SentenceTokenizer();
  const wordTokenizer = new natural.WordTokenizer();

  const sentences =
    sentenceTokenizer
      .tokenize(text)
      .map((s) => s.trim())
      .filter((s) => s.length > 0) ||
    text
      .split(SENTENCE_SPLIT_REGEX)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

  const tokens = wordTokenizer
    .tokenize(text.toLowerCase())
    .map((w) => w.replace(/[^a-z0-9']/g, ""))
    .filter((w) => w.length > 1);

  if (tokens.length < 60 || sentences.length < 3) {
    return {
      provider: createProviderResult({
        id: "local_stylometry",
        label: "Local Stylometry",
        status: "skipped",
        score: null,
        confidence: null,
        reason: "low_text_volume",
      }),
      indicators: [],
      metrics: {
        tokenCount: tokens.length,
        sentenceCount: sentences.length,
      },
      classification: "insufficient_text",
      summary:
        "Not enough text for high-confidence AI detection. Upload more text for better results.",
    };
  }

  const sentenceLengths = sentences.map((s) =>
    s.split(/\s+/).filter(Boolean).length
  );
  const meanSentenceLength =
    sentenceLengths.reduce((sum, v) => sum + v, 0) / sentenceLengths.length;
  const burstiness = getStdDev(sentenceLengths) / Math.max(meanSentenceLength, 1);

  const uniqueTokens = new Set(tokens).size;
  const lexicalDiversity = uniqueTokens / tokens.length;
  const repetitionRatio = getNgramRepetitionRatio(tokens, 3);
  const bigrams = natural.NGrams.bigrams(tokens).map((pair) => pair.join(" "));
  const bigramEntropy = getEntropy(bigrams);

  let posTags = [];
  try {
    const termsJson = nlp(text).terms().json();
    posTags = termsJson.flatMap((entry) => {
      if (Array.isArray(entry?.terms)) {
        return entry.terms
          .map((term) => {
            if (Array.isArray(term?.tags)) return term.tags[0];
            const tags = Object.keys(term?.tags || {});
            return tags[0];
          })
          .filter(Boolean);
      }

      if (Array.isArray(entry?.tags)) return [entry.tags[0]].filter(Boolean);
      const tags = Object.keys(entry?.tags || {});
      return tags.length ? [tags[0]] : [];
    });
  } catch (error) {
    console.error("POS extraction failed, continuing:", error);
    posTags = [];
  }

  const posEntropy = getEntropy(posTags);

  const readability = getFleschKincaidGrade(text);
  const punctDensity = getPunctuationDensity(text);

  const riskLowBurstiness = 1 - normalize(burstiness, 0.2, 1.0);
  const riskRepetition = normalize(repetitionRatio, 0.02, 0.15);
  const riskLowLexical = 1 - normalize(lexicalDiversity, 0.35, 0.75);
  const riskHighReadability = normalize(readability, 8, 16);
  const riskLowPunct = 1 - normalize(punctDensity, 0.015, 0.06);

  const aiProbabilityRaw =
    riskLowBurstiness * 0.25 +
    riskRepetition * 0.2 +
    riskLowLexical * 0.2 +
    riskHighReadability * 0.2 +
    riskLowPunct * 0.15;

  const aiProbability = Math.round(clamp(aiProbabilityRaw, 0, 1) * 100);

  const lengthConfidenceBoost = normalize(tokens.length, 120, 900) * 0.45;
  const separationConfidenceBoost =
    normalize(Math.abs(aiProbability - 50), 0, 45) * 0.55;
  const confidence = Math.round(
    clamp(lengthConfidenceBoost + separationConfidenceBoost, 0, 1) * 100
  );

  return {
    provider: createProviderResult({
      id: "local_stylometry",
      label: "Local Stylometry",
      status: "ok",
      score: aiProbability,
      confidence,
    }),
    indicators: buildIndicators({
      burstiness,
      repetitionRatio,
      lexicalDiversity,
      bigramEntropy,
      posEntropy,
      readability,
      punctDensity,
    }),
    metrics: {
      tokenCount: tokens.length,
      sentenceCount: sentences.length,
      burstiness: Number(burstiness.toFixed(3)),
      repetitionRatio: Number(repetitionRatio.toFixed(3)),
      lexicalDiversity: Number(lexicalDiversity.toFixed(3)),
      bigramEntropy: Number(bigramEntropy.toFixed(3)),
      posEntropy: Number(posEntropy.toFixed(3)),
      readability: Number(readability.toFixed(2)),
      punctDensity: Number(punctDensity.toFixed(4)),
    },
    classification: classifyAiScore(aiProbability),
    summary:
      "Local NLP stylometry model estimated AI likelihood from rhythm, entropy, and lexical variance.",
  };
}

async function runProvider(id, label, handler) {
  const start = Date.now();
  try {
    const result = await handler();
    return createProviderResult({
      id,
      label,
      ...result,
      latencyMs: Date.now() - start,
    });
  } catch (error) {
    return createProviderResult({
      id,
      label,
      status: "error",
      reason: error instanceof Error ? error.message : "provider_error",
      latencyMs: Date.now() - start,
    });
  }
}

async function runSaplingProvider(text) {
  const apiKey = process.env.SAPLING_API_KEY;
  if (!apiKey) {
    return createProviderResult({
      id: "sapling",
      label: "Sapling",
      status: "skipped",
      reason: "missing_api_key",
    });
  }

  return runProvider("sapling", "Sapling", async () => {
    const endpoint =
      process.env.SAPLING_API_URL || "https://api.sapling.ai/api/v1/aidetect";
    const json = await fetchJsonWithTimeout(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: apiKey, text }),
    });

    const score = findFirstPercent(json, [["score"], ["data", "score"]]);
    if (score == null) {
      throw new Error("sapling_score_not_found_in_response");
    }

    return {
      status: "ok",
      score,
      confidence: 85,
    };
  });
}

async function runOpenAIRobertaLocalProvider(text) {
  if (!isLocalModelEnabled()) {
    return createProviderResult({
      id: "openai_roberta_local",
      label: "OpenAI RoBERTa (Local)",
      status: "skipped",
      reason: "local_model_disabled",
    });
  }

  return runProvider("openai_roberta_local", "OpenAI RoBERTa (Local)", async () => {
    const response = await scoreWithLocalModel(text, 30000);
    const score = toPercent(parsePercentValue(response.fake_probability));
    if (score == null) {
      throw new Error("local_model_score_not_found");
    }

    return {
      status: "ok",
      score,
      confidence: 90,
    };
  });
}

async function runZeroGPTProvider(text) {
  const apiKey = process.env.ZEROGPT_API_KEY;
  if (!apiKey) {
    return createProviderResult({
      id: "zerogpt",
      label: "ZeroGPT",
      status: "skipped",
      reason: "missing_api_key",
    });
  }

  return runProvider("zerogpt", "ZeroGPT", async () => {
    const configuredUrl = process.env.ZEROGPT_API_URL;
    const fallbackUrls = [
      "https://api.zerogpt.com/api/v1/detectText",
      "https://api.zerogpt.com/api/v1/developer/ai-detection",
    ];
    const urlsToTry = configuredUrl ? [configuredUrl] : fallbackUrls;

    let lastError = null;
    for (const endpoint of urlsToTry) {
      try {
        const json = await fetchJsonWithTimeout(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ApiKey: apiKey,
          },
          body: JSON.stringify({ input_text: text }),
        });

        const score = findFirstPercent(json, [
          ["data", "fakePercentage"],
          ["fakePercentage"],
          ["data", "aiScore"],
          ["aiScore"],
          ["score"],
        ]);

        if (score == null) {
          throw new Error("zerogpt_score_not_found_in_response");
        }

        return {
          status: "ok",
          score,
          confidence: 88,
        };
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError || new Error("zerogpt_request_failed");
  });
}

async function runOriginalityProvider(text) {
  const apiKey = process.env.ORIGINALITY_API_KEY;
  if (!apiKey) {
    return createProviderResult({
      id: "originality_ai",
      label: "Originality AI",
      status: "skipped",
      reason: "missing_api_key",
    });
  }

  return runProvider("originality_ai", "Originality AI", async () => {
    const endpoint =
      process.env.ORIGINALITY_API_URL ||
      "https://api.originality.ai/api/v1/scan/ai";

    const json = await fetchJsonWithTimeout(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-OAI-API-KEY": apiKey,
      },
      body: JSON.stringify({ content: text }),
    });

    const score = findFirstPercent(json, [
      ["score", "ai"],
      ["data", "score", "ai"],
      ["ai_score"],
      ["score"],
    ]);

    if (score == null) {
      throw new Error("originality_score_not_found_in_response");
    }

    return {
      status: "ok",
      score,
      confidence: 88,
    };
  });
}

async function runGPTZeroProvider(text) {
  const apiKey = process.env.GPTZERO_API_KEY;
  const endpoint = process.env.GPTZERO_API_URL;

  if (!apiKey || !endpoint) {
    return createProviderResult({
      id: "gptzero",
      label: "GPTZero",
      status: "skipped",
      reason: !apiKey ? "missing_api_key" : "missing_api_url",
    });
  }

  return runProvider("gptzero", "GPTZero", async () => {
    const json = await fetchJsonWithTimeout(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        document: text,
      }),
    });

    const score = findFirstPercent(json, [
      ["documents", 0, "completely_generated_prob"],
      ["documents", 0, "average_generated_prob"],
      ["documents", 0, "overall_probability"],
      ["score"],
    ]);

    if (score == null) {
      throw new Error("gptzero_score_not_found_in_response");
    }

    return {
      status: "ok",
      score,
      confidence: 88,
    };
  });
}

function getProviderWeight(providerId) {
  return PROVIDER_WEIGHTS[providerId] ?? DEFAULT_PROVIDER_WEIGHT;
}

function aggregateProviders(localResult, externalProviders) {
  const allProviders = [localResult.provider, ...externalProviders];
  const active = allProviders.filter(
    (p) => p.status === "ok" && Number.isFinite(p.score)
  );

  if (!active.length) {
    return {
      aiProbability: 0,
      classification: "insufficient_text",
      confidence: 0,
      summary:
        "No AI detector could produce a score. Configure provider API keys or provide more text.",
      providers: allProviders,
      indicators: localResult.indicators,
      metrics: localResult.metrics,
    };
  }

  const weightedSum = active.reduce(
    (sum, p) => sum + p.score * getProviderWeight(p.id),
    0
  );
  const weightTotal = active.reduce((sum, p) => sum + getProviderWeight(p.id), 0);
  const aiProbability = Math.round(weightedSum / Math.max(weightTotal, 1));

  const classification =
    active.length === 1 &&
    active[0].id === "local_stylometry" &&
    localResult.classification === "insufficient_text"
      ? "insufficient_text"
      : classifyAiScore(aiProbability);

  const scoreSpread = getStdDev(active.map((p) => p.score));
  const avgProviderConfidence =
    active.reduce((sum, p) => sum + (p.confidence || 60), 0) / active.length;
  const agreementConfidence = clamp(100 - scoreSpread * 2.2, 10, 100);
  const coverageConfidence = clamp(35 + active.length * 15, 35, 100);
  const confidence = Math.round(
    clamp(
      avgProviderConfidence * 0.55 +
        agreementConfidence * 0.3 +
        coverageConfidence * 0.15,
      0,
      100
    )
  );

  const usedLabels = active.map((p) => p.label).join(", ");
  const summary =
    classification === "likely_ai"
      ? `Ensemble detectors (${usedLabels}) indicate likely AI-generated content.`
      : classification === "mixed_or_uncertain"
        ? `Detectors (${usedLabels}) produced mixed signals; result is uncertain.`
        : classification === "insufficient_text"
          ? localResult.summary
          : `Ensemble detectors (${usedLabels}) indicate likely human-written content.`;

  return {
    aiProbability,
    classification,
    confidence,
    summary,
    providers: allProviders,
    indicators: localResult.indicators,
    metrics: localResult.metrics,
  };
}

export async function detectAIContent(text) {
  const safeText = cleanText(text);
  if (!safeText) {
    return {
      aiProbability: 0,
      classification: "insufficient_text",
      confidence: 0,
      summary:
        "No text was provided for AI detection. Paste text or upload a PDF with extractable text.",
      providers: [
        createProviderResult({
          id: "local_stylometry",
          label: "Local Stylometry",
          status: "skipped",
          reason: "empty_text",
        }),
        createProviderResult({
          id: "openai_roberta_local",
          label: "OpenAI RoBERTa (Local)",
          status: "skipped",
          reason: "empty_text",
        }),
      ],
      indicators: [],
      metrics: {
        tokenCount: 0,
        sentenceCount: 0,
      },
    };
  }

  const localResult = runLocalStylometry(safeText);
  const tokenCount = localResult.metrics?.tokenCount || 0;

  const [localModelProvider, saplingProvider, zeroProvider, originalityProvider, gptzeroProvider] =
    await Promise.all([
      runOpenAIRobertaLocalProvider(safeText),
      tokenCount >= 80
        ? runSaplingProvider(safeText)
        : Promise.resolve(
            createProviderResult({
              id: "sapling",
              label: "Sapling",
              status: "skipped",
              reason: "insufficient_text",
            })
          ),
      tokenCount >= 80
        ? runZeroGPTProvider(safeText)
        : Promise.resolve(
            createProviderResult({
              id: "zerogpt",
              label: "ZeroGPT",
              status: "skipped",
              reason: "insufficient_text",
            })
          ),
      tokenCount >= 80
        ? runOriginalityProvider(safeText)
        : Promise.resolve(
            createProviderResult({
              id: "originality_ai",
              label: "Originality AI",
              status: "skipped",
              reason: "insufficient_text",
            })
          ),
      tokenCount >= 80
        ? runGPTZeroProvider(safeText)
        : Promise.resolve(
            createProviderResult({
              id: "gptzero",
              label: "GPTZero",
              status: "skipped",
              reason: "insufficient_text",
            })
          ),
    ]);

  const providers = [
    localModelProvider,
    saplingProvider,
    zeroProvider,
    originalityProvider,
    gptzeroProvider,
  ];

  return aggregateProviders(localResult, providers);
}
