import { isDiveyeEnabled, scoreWithDiveye } from "./diveyeClient.js";
import { isNodeFallbackEnabled, scoreWithNodeFallback } from "./aiFallbackDetector.js";

export function isLocalModelEnabled() {
  if (process.env.AI_LOCAL_MODEL_ENABLED === "false") return false;
  return isDiveyeEnabled();
}

export async function scoreWithLocalModel(text, timeoutMs = 45000) {
  if (!isLocalModelEnabled()) {
    throw new Error("local_model_disabled");
  }

  try {
    return await scoreWithDiveye(text, timeoutMs);
  } catch (error) {
    if (!isNodeFallbackEnabled()) {
      throw error;
    }

    const fallback = await scoreWithNodeFallback(text);
    return {
      ...fallback,
      source: fallback?.source || "zippy_node_fallback",
      fallback_reason: error instanceof Error ? error.message : String(error),
    };
  }
}
