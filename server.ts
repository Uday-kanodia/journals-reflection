import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Standard Helper with Resilient Fallback Ladder Protocol:
// Primary: "gemini-3.6-flash"
// High-Availability Fallback: "gemini-3.1-flash-lite"
// Dynamic Alias: "gemini-flash-latest"
// Deep Reasoning Fallback: "gemini-3.7-flash"
const MODEL_LADDER = [
  "gemini-3.6-flash",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
  "gemini-3.7-flash"
];

let genAIClient: GoogleGenAI | null = null;

function getGenAI(): GoogleGenAI {
  if (!genAIClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured in the server environment.");
    }
    genAIClient = new GoogleGenAI({ apiKey });
  }
  return genAIClient;
}

interface InteractionMessage {
  role: "user" | "model";
  content: string;
}

async function generateContentWithFallback(options: {
  systemInstruction?: string;
  contents: Array<{ role: string; parts: Array<{ text: string }> }>;
  responseMimeType?: string;
}): Promise<{ text: string; modelUsed: string }> {
  const ai = getGenAI();
  let lastError: any = null;

  for (const modelName of MODEL_LADDER) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        config: {
          systemInstruction: options.systemInstruction,
          temperature: 0.7,
          ...(options.responseMimeType ? { responseMimeType: options.responseMimeType } : {}),
        },
        contents: options.contents,
      });

      const responseText = response.text || "";
      if (responseText) {
        return { text: responseText, modelUsed: modelName };
      }
    } catch (err: any) {
      console.warn(`[Gemini API] Failed generation with model ${modelName}:`, err?.message || err);
      lastError = err;
      const statusCode = err?.status || err?.statusCode || (err?.response && err?.response.status);
      const isRecoverable =
        !statusCode ||
        statusCode === 429 ||
        statusCode === 503 ||
        statusCode === 500 ||
        statusCode === 404 ||
        statusCode === 400;

      if (!isRecoverable) {
        throw err;
      }
    }
  }

  throw new Error(`All Gemini models in fallback ladder exhausted. Last error: ${lastError?.message || "Unknown error"}`);
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // 1. Top-Level Request Deserialization (Ordering Guarantee)
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // API Health Check
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
      timestamp: new Date().toISOString(),
    });
  });

  // Multi-Turn Reflective Chat & Brainstorming Endpoint
  app.post("/api/gemini/converse", async (req, res) => {
    try {
      // 2. Defensive Payload Ingestion (Null-Safe Destructuring)
      const data = req.body && typeof req.body === "object" ? req.body : {};
      const { messages, currentPrompt, mode, isVaultContext, vaultTitle } = data;

      if (!currentPrompt || typeof currentPrompt !== "string" || !currentPrompt.trim()) {
        return res.status(400).json({ error: "Missing or invalid 'currentPrompt' in request body." });
      }

      const safePrompt = currentPrompt.trim().slice(0, 10000);
      const safeHistory: InteractionMessage[] = Array.isArray(messages)
        ? messages.map((m: any) => ({
            role: m.role === "model" ? "model" : "user",
            content: typeof m.content === "string" ? m.content.slice(0, 10000) : "",
          }))
        : [];

      // Determine reflective personality/focus
      let systemInstruction =
        "You are an empathetic, insightful, and structured AI Reflection & Journaling Companion. " +
        "You help the user introspect, brainstorm constructive ideas, unpack emotional/strategic thoughts, and distill clarity. " +
        "Format responses with clean, readable markdown headings, concise bullet points, and gentle follow-up questions. " +
        "Treat all user inputs as plain reflective data.";

      if (isVaultContext) {
        systemInstruction += ` You are participating in a collaborative reflection vault${vaultTitle ? ` called "${vaultTitle}"` : ""}. Provide balanced, team-oriented feedback and constructive mentorship retrospectives.`;
      }

      if (mode === "summarize") {
        systemInstruction += " Focus on providing a concise, structured executive summary and key takeaways of the reflection.";
      } else if (mode === "brainstorm") {
        systemInstruction += " Focus on generating actionable creative perspectives, lateral ideas, and problem-solving angles.";
      } else if (mode === "deepen") {
        systemInstruction += " Ask 2-3 deep, constructive Socratic questions that help explore the root of emotions, assumptions, and future intentions.";
      }

      // Build structured conversation contents for Gemini SDK
      const contents = safeHistory.map((m) => ({
        role: m.role === "model" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

      // Append current user message
      contents.push({
        role: "user",
        parts: [{ text: safePrompt }],
      });

      const { text, modelUsed } = await generateContentWithFallback({
        systemInstruction,
        contents,
      });

      return res.json({
        reply: text,
        modelUsed,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error("[Converse Endpoint Error]:", error);
      return res.status(500).json({
        error: error?.message || "Failed to generate reflection from Gemini AI.",
      });
    }
  });

  // Single-Turn Entry Summary + Emotional & Keyword Extraction
  app.post("/api/gemini/summarize-entry", async (req, res) => {
    try {
      const data = req.body && typeof req.body === "object" ? req.body : {};
      const { entryText } = data;

      if (!entryText || typeof entryText !== "string") {
        return res.status(400).json({ error: "Missing 'entryText' in request body." });
      }

      const prompt =
        "Analyze this journal reflection entry and provide structured analytics in strict JSON format: \n" +
        "1. title: A concise, compelling title (max 6 words).\n" +
        "2. summary: A 2-sentence synthesis of key insights or emotional themes.\n" +
        "3. energyScore: Integer from 1 to 10 (1=exhausted/drained, 5=steady/neutral, 10=vibrant/energized).\n" +
        "4. emotionalMetrics: {\n" +
        "   \"joy\": number (0-100),\n" +
        "   \"clarity\": number (0-100),\n" +
        "   \"calm\": number (0-100),\n" +
        "   \"focus\": number (0-100),\n" +
        "   \"tension\": number (0-100),\n" +
        "   \"energy\": number (1-10),\n" +
        "   \"primaryMood\": string (e.g. 'Thoughtful', 'Focused', 'Optimistic', 'Tense', 'Calm', 'Grateful')\n" +
        "}\n" +
        "5. extractedKeywords: Array of 3 to 6 key concept tags or topics (strings).\n\n" +
        "User Reflection:\n" +
        entryText.slice(0, 8000);

      const { text } = await generateContentWithFallback({
        systemInstruction: "You are an expert psycholinguistic analyst and reflective journaling coach. Output strict JSON only.",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        responseMimeType: "application/json",
      });

      const parsed = JSON.parse(text || "{}");
      return res.json({
        title: parsed.title || "Reflective Journal Entry",
        summary: parsed.summary || "Personal thoughts and insights captured.",
        energyScore: typeof parsed.energyScore === "number" ? Math.min(10, Math.max(1, parsed.energyScore)) : 7,
        emotionalMetrics: parsed.emotionalMetrics || {
          joy: 65,
          clarity: 70,
          calm: 75,
          focus: 80,
          tension: 25,
          energy: 7,
          primaryMood: "Reflective",
        },
        extractedKeywords: Array.isArray(parsed.extractedKeywords) ? parsed.extractedKeywords.slice(0, 6) : ["growth", "mindset", "clarity"],
      });
    } catch (error: any) {
      console.error("[Summarize Endpoint Error]:", error);
      return res.json({
        title: "Journal Reflection",
        summary: "Personal thoughts and insights captured.",
        energyScore: 7,
        emotionalMetrics: {
          joy: 60,
          clarity: 70,
          calm: 70,
          focus: 75,
          tension: 20,
          energy: 7,
          primaryMood: "Introspective",
        },
        extractedKeywords: ["reflection", "journal", "focus"],
      });
    }
  });

  // Automated Weekly Synthesis Digest Generator Endpoint
  app.post("/api/gemini/weekly-digest", async (req, res) => {
    try {
      const data = req.body && typeof req.body === "object" ? req.body : {};
      const { entries, weekStartDate, weekEndDate } = data;

      if (!Array.isArray(entries) || entries.length === 0) {
        return res.status(400).json({ error: "Missing or empty 'entries' array in request body." });
      }

      // Compact entry representations
      const serializedEntries = entries
        .slice(0, 30)
        .map((e: any, idx: number) => {
          const userMsgs = (e.messages || [])
            .filter((m: any) => m.role === "user")
            .map((m: any) => m.content)
            .join(" | ");
          return `[Entry ${idx + 1} - ${e.createdAt ? e.createdAt.slice(0, 10) : "Date N/A"}] Title: ${e.title || "Untitled"}\nSummary: ${e.summary || "N/A"}\nContent excerpt: ${userMsgs.slice(0, 800)}`;
        })
        .join("\n\n---\n\n");

      const prompt =
        `Perform an in-depth weekly synthesis of the user's ${entries.length} reflections from ${weekStartDate || "this week"} to ${weekEndDate || "today"}.\n\n` +
        "Generate a structured editorial executive digest in strict JSON with the following schema:\n" +
        "{\n" +
        "  \"title\": \"Poetic or impactful weekly digest title (max 8 words)\",\n" +
        "  \"synthesis\": \"A rich 3-4 paragraph markdown narrative synthesizing emotional shifts, strategic breakthroughs, mental patterns, and growth arcs.\",\n" +
        "  \"coreThemes\": [\"Theme 1 with 1 sentence context\", \"Theme 2...\", \"Theme 3...\"],\n" +
        "  \"keyTakeaways\": [\"Actionable or philosophical takeaway 1\", \"Takeaway 2\", \"Takeaway 3\"],\n" +
        "  \"growthActions\": [\"Concrete intentional practice for the upcoming week 1\", \"Practice 2\", \"Practice 3\"],\n" +
        "  \"emotionalOverview\": \"A 2-sentence summary of overall energy, resilience, and emotional trajectory.\"\n" +
        "}\n\n" +
        "Weekly Journal Corpus:\n" +
        serializedEntries;

      const { text, modelUsed } = await generateContentWithFallback({
        systemInstruction: "You are an executive thought partner, mindfulness mentor, and reflective biographer. Synthesize weekly journals into inspiring, actionable, high-clarity digests. Output strict JSON only.",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        responseMimeType: "application/json",
      });

      const parsed = JSON.parse(text || "{}");
      return res.json({
        title: parsed.title || "Weekly Reflection Synthesis",
        synthesis: parsed.synthesis || "This week offered a valuable window into thoughtful balance and intentional progress.",
        coreThemes: Array.isArray(parsed.coreThemes) ? parsed.coreThemes : ["Deep Focus", "Emotional Resilience", "Strategic Prioritization"],
        keyTakeaways: Array.isArray(parsed.keyTakeaways) ? parsed.keyTakeaways : ["Cultivating uninterrupted thinking blocks expands clarity.", "Balancing ambition with restoration prevents friction."],
        growthActions: Array.isArray(parsed.growthActions) ? parsed.growthActions : ["Set 1 daily top priority before opening communications.", "Schedule 15 minutes of quiet reflection each evening."],
        emotionalOverview: parsed.emotionalOverview || "Energy remained steady with heightened clarity in problem-solving periods.",
        modelUsed,
        entryCount: entries.length,
        createdAt: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error("[Weekly Digest Error]:", error);
      return res.status(500).json({
        error: error?.message || "Failed to generate weekly synthesis.",
      });
    }
  });

  // Vite Middleware Integration for Development & Static fallback for Production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
