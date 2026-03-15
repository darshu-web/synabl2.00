const DEFAULT_DIVEYE_SPACE_URL = "https://pinyuchen-diveye-ai-text-detector.hf.space";
const DEFAULT_DIVEYE_ENDPOINT = "detect_ai_text";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeBaseUrl(baseUrl) {
  return String(baseUrl || DEFAULT_DIVEYE_SPACE_URL).replace(/\/+$/, "");
}

function getDiveyeConfig() {
  return {
    baseUrl: normalizeBaseUrl(
      process.env.DIVEYE_SPACE_URL || DEFAULT_DIVEYE_SPACE_URL
    ),
    endpoint: String(process.env.DIVEYE_ENDPOINT || DEFAULT_DIVEYE_ENDPOINT).replace(
      /^\/+/,
      ""
    ),
  };
}

function parseConfidenceFromMessage(message, fallbackProbability) {
  const safeMessage = String(message || "");
  const match = safeMessage.match(/confidence:\s*([\d.]+)%/i);
  if (match) {
    const parsed = Number(match[1]);
    if (Number.isFinite(parsed)) {
      return Math.round(clamp(parsed, 0, 100));
    }
  }

  const fallback = 55 + Math.abs(Number(fallbackProbability || 0.5) - 0.5) * 90;
  return Math.round(clamp(fallback, 0, 100));
}

function extractProbabilityFromChartData(chartData) {
  if (!chartData || typeof chartData !== "object") return null;
  const rows = Array.isArray(chartData.data) ? chartData.data : [];

  for (const row of rows) {
    if (!Array.isArray(row) || row.length < 2) continue;
    const label = String(row[0] || "").toLowerCase();
    const value = Number(row[1]);
    if (!Number.isFinite(value)) continue;
    if (label.includes("ai")) {
      return clamp(value / 100, 0, 1);
    }
  }

  return null;
}

function parseSseResponse(rawBody) {
  const text = String(rawBody || "");
  const lines = text.split(/\r?\n/).map((line) => line.trim());
  const events = [];
  let currentEvent = "";

  for (const line of lines) {
    if (!line) continue;
    if (line.startsWith("event:")) {
      currentEvent = line.slice(6).trim();
      continue;
    }
    if (!line.startsWith("data:")) continue;
    events.push({
      event: currentEvent,
      data: line.slice(5).trim(),
    });
  }

  if (!events.length) {
    throw new Error("diveye_empty_stream_response");
  }

  const errorEvent = [...events].reverse().find((e) => e.event === "error");
  if (errorEvent) {
    const errorPayload = errorEvent.data || "unknown";
    throw new Error(`diveye_remote_error:${errorPayload}`);
  }

  for (let i = events.length - 1; i >= 0; i -= 1) {
    if (events[i].event !== "complete") continue;
    const payload = events[i].data;
    try {
      const parsed = JSON.parse(payload);
      if (!Array.isArray(parsed) || parsed.length < 2) continue;

      const message = String(parsed[0] || "");
      let aiProbability = Number(parsed[1]);
      const chartData = parsed[2] ?? null;

      if (!Number.isFinite(aiProbability)) {
        aiProbability = extractProbabilityFromChartData(chartData);
      }

      if (!Number.isFinite(aiProbability)) {
        throw new Error("diveye_probability_missing");
      }

      if (message.toLowerCase().includes("model not loaded")) {
        throw new Error("diveye_model_not_loaded");
      }

      return {
        message,
        aiProbability: clamp(aiProbability, 0, 1),
        chartData,
      };
    } catch {
      // Continue to previous data line.
    }
  }

  throw new Error("diveye_stream_parse_failed");
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

async function getEventId(baseUrl, endpoint, text, timeoutMs) {
  const response = await fetchWithTimeout(
    `${baseUrl}/gradio_api/call/${endpoint}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: [text] }),
    },
    timeoutMs
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`diveye_start_failed_${response.status}:${body.slice(0, 220)}`);
  }

  const json = await response.json();
  const eventId = String(json?.event_id || "").trim();
  if (!eventId) {
    throw new Error("diveye_event_id_missing");
  }
  return eventId;
}

async function getEventResult(baseUrl, endpoint, eventId, timeoutMs) {
  const response = await fetchWithTimeout(
    `${baseUrl}/gradio_api/call/${endpoint}/${eventId}`,
    { method: "GET" },
    timeoutMs
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `diveye_result_failed_${response.status}:${body.slice(0, 220)}`
    );
  }

  const rawBody = await response.text();
  return parseSseResponse(rawBody);
}

function shouldRetry(error) {
  const message = String(error?.message || "").toLowerCase();
  return (
    message.includes("diveye_remote_error") ||
    message.includes("diveye_stream_parse_failed") ||
    message.includes("diveye_empty_stream_response") ||
    message.includes("diveye_model_not_loaded")
  );
}

function getEndpointCandidates(primaryEndpoint) {
  const candidates = [primaryEndpoint];
  if (primaryEndpoint === DEFAULT_DIVEYE_ENDPOINT) {
    candidates.push("detect_ai_text_1");
  }
  return [...new Set(candidates)];
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isDiveyeEnabled() {
  return process.env.AI_DIVEYE_ENABLED !== "false";
}

export async function scoreWithDiveye(text, timeoutMs = 45000) {
  const normalizedText = typeof text === "string" ? text.trim() : String(text || "").trim();
  if (!normalizedText) {
    return {
      fake_probability: 0,
      real_probability: 1,
      confidence: 0,
      signed_score: 0,
      votes: { ai: 0, human: 0 },
      engines: [],
      provider_message: "No text was provided.",
      source: "diveye_space",
    };
  }

  const { baseUrl, endpoint } = getDiveyeConfig();
  const endpointCandidates = getEndpointCandidates(endpoint);
  let result = null;
  let lastError = null;

  for (const endpointName of endpointCandidates) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const eventId = await getEventId(
          baseUrl,
          endpointName,
          normalizedText,
          timeoutMs
        );
        result = await getEventResult(baseUrl, endpointName, eventId, timeoutMs);
        break;
      } catch (error) {
        lastError = error;
        if (!shouldRetry(error) || attempt === 2) {
          break;
        }
        await delay(400 * (attempt + 1));
      }
    }

    if (result) break;
  }

  if (!result) {
    throw (lastError instanceof Error
      ? lastError
      : new Error("diveye_request_failed"));
  }

  const aiProbability = clamp(Number(result.aiProbability), 0, 1);
  const confidence = parseConfidenceFromMessage(result.message, aiProbability);
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
        engine: "diveye_space",
        determination,
        score: scoreMagnitude,
        signed_score: signedScore,
        ai_probability: aiProbability,
      },
    ],
    provider_message: result.message,
    provider_chart: result.chartData,
    source: `${baseUrl}/gradio_api/call/${endpoint}`,
  };
}
