import { createServer } from "http";
import { checkTextSchema } from "../shared/schema.js";
import multer from "multer";
import { PDFParse } from "pdf-parse";
import { ZodError } from "zod";
import { detectAIContent } from "./aiDetector.js";
import {
  computeSimilarity,
  searchWeb,
  fetchPageContent,
} from "./plagiarism.js";
import EventEmitter from "events";

// Increase limit to prevent MaxListenersExceededWarning during parallel fetches
EventEmitter.defaultMaxListeners = 30;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

async function extractPdfText(fileBuffer) {
  const parser = new PDFParse({ data: fileBuffer });
  let parsed;
  try {
    parsed = await parser.getText();
  } finally {
    await parser.destroy();
  }

  return (parsed.text || "").replace(/\s+/g, " ").trim();
}

function handleRouteError(res, error, context) {
  console.error(`Error in ${context}:`, error);

  if (error instanceof ZodError) {
    const message = error.errors?.[0]?.message || "Validation failed";
    return res.status(400).json({ error: message });
  }

  return res.status(500).json({
    error: error instanceof Error ? error.message : "An unknown error occurred",
  });
}

function splitIntoChunks(text, chunkSize = 3) {
  // Split into sentences first
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const filtered = sentences.filter(s => s.trim().length > 30); // Higher threshold

  // Create overlapping windows for context
  const chunks = [];
  for (let i = 0; i < filtered.length; i++) {
    // Single sentence
    chunks.push({ text: filtered[i].trim(), index: i, type: 'single' });
    // Two-sentence window (catches cross-sentence plagiarism)
    if (i + 1 < filtered.length) {
      chunks.push({
        text: `${filtered[i].trim()} ${filtered[i + 1].trim()}`,
        index: i,
        type: 'window'
      });
    }
  }
  return chunks;
}

async function runPlagiarismCheck(text) {
  const chunks = splitIntoChunks(text);

  console.log("Split into", chunks.length, "chunks");

  const results = [];
  const limit = Math.min(chunks.length, 20);

  for (let i = 0; i < limit; i++) {
    const chunkObj = chunks[i];
    const sentence = chunkObj.text;
    console.log("Checking chunk:", sentence.substring(0, 50) + "...");

    const sources = await searchWeb(sentence);
    console.log(`Found ${sources.length} sources to check`);

    let maxSimilarity = 0;
    const matchedSources = [];
    const checkResults = [];
    const BATCH_SIZE = 4;

    // Process sources in controlled batches
    for (let j = 0; j < sources.length; j += BATCH_SIZE) {
      const batch = sources.slice(j, j + BATCH_SIZE);
      const batchPromises = batch.map(async (source) => {
        const url = typeof source === 'string' ? source : source.url;
        let content = "";
        let method = "fetch";

        try {
          const fetchedContent = await fetchPageContent(url);
          if (fetchedContent && fetchedContent.length > 100) {
            content = fetchedContent;
          } else if (source.abstract || source.title) {
            content = `${source.title || ''} ${source.abstract || ''} ${source.journal || ''}`.trim();
            method = "metadata";
          }
        } catch (error) {
          if (source.abstract || source.title) {
            content = `${source.title || ''} ${source.abstract || ''} ${source.journal || ''}`.trim();
            method = "metadata";
          }
        }

        if (content && content.length > 50) {
          const similarity = computeSimilarity(sentence, content);

          if (similarity > 0.05) {
            return {
              url,
              title: source.title || null,
              doi: source.doi || null,
              journal: source.journal || null,
              source: source.source || 'Web',
              method,
              similarity: Math.round(similarity * 100),
            };
          }
        }
        return null;
      });

      const batchResults = await Promise.all(batchPromises);
      checkResults.push(...batchResults.filter(r => r !== null));
    }

    if (checkResults.length > 0) {
      checkResults.sort((a, b) => b.similarity - a.similarity);
      maxSimilarity = checkResults[0].similarity / 100;
      matchedSources.push(...checkResults);

      console.log(
        `Chunk done. Top similarity: ${maxSimilarity.toFixed(2)} from ${checkResults.length} matches.`
      );
    }

    results.push({
      sentence,
      similarity: Math.round(maxSimilarity * 100),
      sources: matchedSources,
      isPlagiarized: maxSimilarity > 0.38,
    });

    // Small delay between chunks to let the network breathe
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  if (results.length === 0) {
    return {
      overallScore: 0,
      plagiarismPercentage: 0,
      totalSentences: 0,
      plagiarizedSentences: 0,
      results: [],
    };
  }

  const PLAGIARISM_THRESHOLD = 0.38;

  let weightedSum = 0;
  let totalWeight = 0;

  for (const r of results) {
    const wordCount = r.sentence.split(' ').length;
    const weight = Math.log(wordCount + 1); // Longer sentences carry more weight
    weightedSum += r.similarity * weight;
    totalWeight += weight;
  }

  const rawScore = totalWeight > 0 ? weightedSum / totalWeight : 0;

  // Apply penalty for high-frequency plagiarism (many flagged sentences)
  const flaggedRatio = results.filter((r) => r.isPlagiarized).length / results.length;
  const penalty = flaggedRatio > 0.3 ? 1.2 : 1.0; // 20% boost if >30% sentences flagged

  const overallScore = Math.min(Math.round(rawScore * penalty), 100);
  const plagiarizedCount = results.filter((r) => r.isPlagiarized).length;
  const plagiarismPercentage = Math.round(
    (plagiarizedCount / results.length) * 100
  );

  console.log("Plagiarism check complete. Overall score:", overallScore);

  return {
    overallScore,
    plagiarismPercentage,
    totalSentences: results.length,
    plagiarizedSentences: plagiarizedCount,
    results,
  };
}

export function registerRoutes(app) {
  app.post("/api/plagiarism-check", async (req, res) => {
    try {
      const { text } = checkTextSchema.parse(req.body);

      console.log("Starting plagiarism check for text length:", text.length);
      const checkResult = await runPlagiarismCheck(text);
      res.json(checkResult);
    } catch (error) {
      handleRouteError(res, error, "plagiarism check");
    }
  });

  app.post(
    "/api/plagiarism-check-pdf",
    upload.single("file"),
    async (req, res) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: "PDF file is required" });
        }

        const isPdfMime = req.file.mimetype === "application/pdf";
        const isPdfName = req.file.originalname.toLowerCase().endsWith(".pdf");
        if (!isPdfMime && !isPdfName) {
          return res.status(400).json({ error: "Only PDF files are supported" });
        }

        const extractedText = await extractPdfText(req.file.buffer);

        if (!extractedText) {
          return res.status(400).json({
            error:
              "Could not extract text from this PDF. If it is scanned/image-only, OCR is required.",
          });
        }

        const { text } = checkTextSchema.parse({ text: extractedText });

        console.log(
          "Starting plagiarism check for extracted PDF text length:",
          text.length
        );

        const checkResult = await runPlagiarismCheck(text);
        res.json({
          ...checkResult,
          extractedCharacters: text.length,
        });
      } catch (error) {
        handleRouteError(res, error, "PDF plagiarism check");
      }
    }
  );

  app.post("/api/ai-content-check", async (req, res) => {
    try {
      const text = typeof req.body?.text === "string" ? req.body.text.trim() : "";
      if (!text) {
        return res.status(400).json({ error: "Text is required for AI content check" });
      }

      const result = await detectAIContent(text);
      res.json(result);
    } catch (error) {
      handleRouteError(res, error, "AI content check");
    }
  });

  app.post("/api/ai-content-check-pdf", upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "PDF file is required" });
      }

      const isPdfMime = req.file.mimetype === "application/pdf";
      const isPdfName = req.file.originalname.toLowerCase().endsWith(".pdf");
      if (!isPdfMime && !isPdfName) {
        return res.status(400).json({ error: "Only PDF files are supported" });
      }

      const extractedText = await extractPdfText(req.file.buffer);
      const result = await detectAIContent(extractedText);
      res.json({
        ...result,
        extractedCharacters: extractedText.length,
        extractionStatus: extractedText
          ? "ok"
          : "no_text_found_possible_scanned_pdf",
      });
    } catch (error) {
      handleRouteError(res, error, "PDF AI content check");
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
