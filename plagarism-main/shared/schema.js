import { z } from "zod";

export const checkTextSchema = z.object({
  text: z.string().min(100, "Text must be at least 100 characters long"),
});

export const sentenceResultSchema = z.object({
  sentence: z.string(),
  similarity: z.number(),
  sources: z.array(
    z.object({
      url: z.string(),
      similarity: z.number(),
    })
  ),
  isPlagiarized: z.boolean(),
});

export const checkResultSchema = z.object({
  overallScore: z.number(),
  plagiarismPercentage: z.number(),
  totalSentences: z.number(),
  plagiarizedSentences: z.number(),
  results: z.array(sentenceResultSchema),
});

export const aiIndicatorSchema = z.object({
  name: z.string(),
  value: z.number(),
  note: z.string(),
});

export const aiProviderScoreSchema = z.object({
  id: z.string(),
  label: z.string(),
  status: z.enum(["ok", "skipped", "error"]),
  score: z.number().nullable(),
  confidence: z.number().nullable(),
  reason: z.string().nullable(),
  latencyMs: z.number().nullable(),
});

export const aiCheckResultSchema = z.object({
  aiProbability: z.number(),
  classification: z.string(),
  confidence: z.number(),
  summary: z.string(),
  indicators: z.array(aiIndicatorSchema),
  providers: z.array(aiProviderScoreSchema).optional(),
  metrics: z.object({
    tokenCount: z.number(),
    sentenceCount: z.number(),
    burstiness: z.number().optional(),
    repetitionRatio: z.number().optional(),
    lexicalDiversity: z.number().optional(),
    bigramEntropy: z.number().optional(),
    posEntropy: z.number().optional(),
  }),
  extractedCharacters: z.number().optional(),
  extractionStatus: z.string().optional(),
});
