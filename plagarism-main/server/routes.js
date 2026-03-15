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
import prisma from "./db.js";
import { signup, login, getCurrentUser } from "./auth.js";
import { authenticateToken } from "./middleware.js";
import { paraphraserClient } from "./paraphraserClient.js";


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

function splitIntoChunks(text) {
  // Split into sentences first
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const filtered = sentences.filter(s => s.trim().length > 30); // Higher threshold

  // Process each unique sentence once (no overlapping windows).
  // This avoids duplicate checks for the same sentence prefix.
  const chunks = [];
  const seen = new Set();
  for (let i = 0; i < filtered.length; i++) {
    const sentence = filtered[i].trim();
    const key = sentence.toLowerCase().replace(/\s+/g, " ");
    if (!key || seen.has(key)) continue;
    seen.add(key);
    chunks.push({ text: sentence, index: i, type: 'single' });
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
    rawScore: Math.round(rawScore),
    penaltyApplied: penalty > 1.0,
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
    authenticateToken,
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
        
        // Save result to DB, link to user
        const userId = req.user.userId;

        const savedScan = await prisma.scan.create({
          data: {
            filename: req.file.originalname,
            similarity: checkResult.overallScore,
            aiScore: 0,
            words: text.split(/\s+/).filter(Boolean).length,
            extractedCharacters: text.length,
            plagiarismResult: checkResult,
            aiResult: {},
            userId: userId,
          }
        });

        if (userId) {
          await prisma.user.update({
            where: { id: userId },
            data: { trialsUsed: { increment: 1 } }
          });
        }

        res.json({
          ...checkResult,
          id: savedScan.id,
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

  app.post("/api/ai-content-check-pdf", authenticateToken, upload.single("file"), async (req, res) => {
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

      // Link to user
      const userId = req.user.userId;

      // Update existing scan if scanId is provided, otherwise create new
      const scanId = req.query.scanId;
      let savedScan;
      let isNewScan = false;

      if (scanId) {
        try {
          savedScan = await prisma.scan.update({
            where: { id: scanId, userId: userId },
            data: {
              aiScore: result.aiProbability * 100,
              aiResult: result
            }
          });
        } catch (e) {
          // If update fails (e.g. record deleted), fallback to create
          isNewScan = true;
        }
      } else {
        isNewScan = true;
      }

      if (isNewScan) {
        savedScan = await prisma.scan.create({
          data: {
            filename: req.file.originalname,
            similarity: 0,
            aiScore: result.aiProbability * 100,
            words: extractedText.split(/\s+/).filter(Boolean).length,
            extractedCharacters: extractedText.length,
            plagiarismResult: {},
            aiResult: result,
            userId: userId,
          }
        });

        // ONLY increment trials for a BRAND NEW scan
        if (userId) {
          await prisma.user.update({
            where: { id: userId },
            data: { trialsUsed: { increment: 1 } }
          });
        }
      }

      res.json({
        ...result,
        id: savedScan.id,
        extractedCharacters: extractedText.length,
        trialsRemaining: userId ? (await prisma.user.findUnique({ where: { id: userId } })).trialLimit - (await prisma.user.findUnique({ where: { id: userId } })).trialsUsed : 3,
        extractionStatus: extractedText
          ? "ok"
          : "no_text_found_possible_scanned_pdf",
      });
    } catch (error) {
      handleRouteError(res, error, "PDF AI content check");
    }
  });

  app.get("/api/scans", authenticateToken, async (req, res) => {
    try {
      const scans = await prisma.scan.findMany({
        where: { userId: req.user.userId },
        orderBy: { date: "desc" },
        take: 50,
        select: {
          id: true,
          filename: true,
          date: true,
          similarity: true,
          aiScore: true,
          words: true,
        }
      });
      res.json(scans);
    } catch (error) {
      handleRouteError(res, error, "fetch scans");
    }
  });

  app.get("/api/scans/:id", authenticateToken, async (req, res) => {
    try {
      const scan = await prisma.scan.findFirst({
        where: { 
          id: req.params.id,
          userId: req.user.userId 
        }
      });
      
      if (!scan) {
        return res.status(404).json({ error: "Scan not found" });
      }

      // Build expected response structure for UI
      const results = {
        id: scan.id,
        filename: scan.filename,
        date: scan.date,
        similarity: scan.similarity,
        aiScore: scan.aiScore,
        words: scan.words,
        extractedCharacters: scan.extractedCharacters,
        plagiarismResult: scan.plagiarismResult,
        aiResult: scan.aiResult,
        // Also map sources for the matching card
        sources: (scan.plagiarismResult?.results || [])
            .flatMap(r => r.sources || [])
            .map(s => ({
                name: s.url ? new URL(s.url).hostname : 'Unknown',
                match: s.similarity,
                link: s.url,
                title: s.title
            })).slice(0, 10)
      };

      res.json(results);
    } catch (error) {
      handleRouteError(res, error, "fetch scan detail");
    }
  });

  // --- Text Paraphraser & Expander Tools ---
  app.post("/api/tools/paraphrase", authenticateToken, async (req, res) => {
    try {
      const { text } = req.body;
      if (!text) return res.status(400).json({ error: "Text is required" });
      const result = await paraphraserClient.processText(text, "paraphrase");
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/tools/expand", authenticateToken, async (req, res) => {
    try {
      const { text } = req.body;
      if (!text) return res.status(400).json({ error: "Text is required" });
      const result = await paraphraserClient.processText(text, "expand");
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Auth Routes
  app.post("/api/auth/signup", signup);
  app.post("/api/auth/login", login);
  app.get("/api/auth/me", authenticateToken, getCurrentUser);


  const httpServer = createServer(app);
  return httpServer;
}
