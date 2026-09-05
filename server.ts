import express from "express";
import path from "path";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Global unhandled error handlers for robust Cloud Run logging
process.on("unhandledRejection", (reason) => {
  console.error("[Unhandled Rejection]:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("[Uncaught Exception]:", err);
});

// Resilient Model Fallback Ladder Protocol:
// 1. Primary: "gemini-3.8-flash" (Highest throughput, current default)
// 2. High-Availability: "gemini-3.1-flash-lite" (Separate light quota pool)
// 3. Dynamic Alias: "gemini-flash-latest" (Stable release tracking)
// 4. Secondary: "gemini-3.6-flash" (Previous generation fallback)
// 5. Deep Reasoning: "gemini-3.7-flash" (Advanced reasoning)
const MODEL_LADDER = [
  "gemini-3.8-flash",
  "gemini-3.1-flash-lite",
  "gemini-flash-latest",
  "gemini-3.6-flash",
  "gemini-3.7-flash",
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

// Resilient text & metadata extractors for quota limit mitigation
function extractLocalMetadata(entryText: string) {
  const text = (entryText || "").trim();
  const firstLine = text.split("\n")[0].replace(/[#*`_]/g, "").trim();
  const words = text.split(/\s+/).filter(Boolean);
  const title = firstLine.length > 0 && firstLine.length <= 45
    ? firstLine
    : words.slice(0, 5).join(" ") || "Reflective Journal Entry";

  const summary = text.length > 200 ? text.slice(0, 197) + "..." : text;

  const lower = text.toLowerCase();
  let energy = 7;
  let joy = 65;
  let clarity = 75;
  let calm = 70;
  let tension = 20;

  if (lower.includes("tired") || lower.includes("exhaust") || lower.includes("drain") || lower.includes("stuck")) {
    energy = 4;
    calm = 50;
    tension = 45;
  } else if (lower.includes("excite") || lower.includes("energ") || lower.includes("breakthrough") || lower.includes("inspire")) {
    energy = 9;
    joy = 85;
    clarity = 85;
  } else if (lower.includes("stress") || lower.includes("anxious") || lower.includes("overwhelm") || lower.includes("worry")) {
    tension = 60;
    calm = 40;
    energy = 5;
  }

  const stopWords = new Set(["the", "and", "this", "that", "with", "have", "from", "were", "what", "when", "your", "will", "about", "there", "would"]);
  const keywordCandidates = words
    .map((w) => w.replace(/[^a-zA-Z]/g, "").toLowerCase())
    .filter((w) => w.length > 4 && !stopWords.has(w));
  const uniqueKeywords = Array.from(new Set(keywordCandidates)).slice(0, 5);
  const keywords = uniqueKeywords.length > 0 ? uniqueKeywords : ["reflection", "clarity", "mindset"];

  return {
    title,
    summary,
    energyScore: energy,
    emotionalMetrics: {
      joy,
      clarity,
      calm,
      focus: 80,
      tension,
      energy,
      primaryMood: tension > 40 ? "Reflective" : energy > 7 ? "Energized" : "Calm",
    },
    extractedKeywords: keywords,
  };
}

function generateLocalReflection(prompt: string, mode: string, historyCount: number): string {
  const clean = prompt.trim();
  const snippet = clean.length > 140 ? clean.slice(0, 137) + "..." : clean;

  if (mode === "summarize") {
    return (
      `### Executive Reflection Summary\n\n` +
      `*Insight: Synthesized via resilient local engine while AI quota refreshes.*\n\n` +
      `**Core Focus:** ${snippet}\n\n` +
      `**Key Takeaways:**\n` +
      `- You articulated an intentional direction and paused to examine the details objectively.\n` +
      `- Creating dedicated space to document this idea clears mental bandwidth for execution.\n\n` +
      `**Next Intentional Action:**\n` +
      `Choose 1 concrete task from this reflection to complete before switching contexts.`
    );
  } else if (mode === "brainstorm") {
    return (
      `### Creative Perspectives & Angles\n\n` +
      `*Insight: Synthesized via resilient local engine while AI quota refreshes.*\n\n` +
      `**Angle 1 — First-Principles Simplification:** What would this look like if it were radically simplified? Remove secondary friction.\n\n` +
      `**Angle 2 — Inversion:** What action would directly impede progress here, and how can you safeguard against it?\n\n` +
      `**Angle 3 — 48-Hour Micro-Test:** Rather than full implementation, what lightweight proof-of-concept can you test tomorrow?\n\n` +
      `*Which of these 3 pathways resonates most with your immediate goal?*`
    );
  } else if (mode === "deepen") {
    return (
      `### Socratic Inquiry & Introspection\n\n` +
      `*Insight: Synthesized via resilient local engine while AI quota refreshes.*\n\n` +
      `Reflecting on your entry:\n\n` +
      `1. **Core Assumption:** What expectation or narrative about yourself is influencing how you perceive this?\n` +
      `2. **Emotional Truth:** Beneath the tactical details, what need or value is seeking acknowledgment right now?\n` +
      `3. **Long-Term Lens:** If you look back on this moment in 6 months, what would a grounded, courageous response look like?\n\n` +
      `*Take a slow breath and write down your immediate answer to whichever question creates the strongest reaction.*`
    );
  } else {
    return (
      `### Thoughtful Reflection\n\n` +
      `*Insight: Synthesized via resilient local engine while AI quota refreshes.*\n\n` +
      `Thank you for taking a moment to write this down. Processing your thoughts around "${snippet}" creates healthy perspective.\n\n` +
      `**Observations:**\n` +
      `- You are actively investing in clarity rather than staying in reactive mode.\n` +
      `- Externalizing your thoughts helps dismantle perceived friction.\n\n` +
      `**Guiding Prompt:**\n` +
      `What is one restorative or productive step you feel inspired to take next?`
    );
  }
}

async function generateContentWithFallback(options: {
  systemInstruction?: string;
  contents: Array<{ role: string; parts: Array<{ text: string }> }>;
  responseMimeType?: string;
}): Promise<{ text: string; modelUsed: string }> {
  const ai = getGenAI();
  let lastError: any = null;

  for (let i = 0; i < MODEL_LADDER.length; i++) {
    const modelName = MODEL_LADDER[i];
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
      const errStr = String(err?.message || "").toLowerCase();
      const isRateLimit =
        statusCode === 429 ||
        errStr.includes("429") ||
        errStr.includes("exhausted") ||
        errStr.includes("quota") ||
        errStr.includes("rate");

      // If hitting a rate limit / quota burst, wait briefly with jitter before trying next model
      if (isRateLimit && i < MODEL_LADDER.length - 1) {
        const delayMs = 600 + Math.floor(Math.random() * 600);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw lastError || new Error("All Gemini models in fallback ladder exhausted.");
}

async function startServer() {
  const app = express();
  
  // In AI Studio dev container, NGINX proxies port 8080 to internal port 3000.
  // On Google Cloud Run or standalone production, Cloud Run routes directly to process.env.PORT (defaults to 8080).
  const isAIStudio = Boolean(process.env.APPLET_ID || process.env.DEFAULT_APP_PORT);
  const PORT = isAIStudio
    ? 3000
    : (process.env.PORT ? parseInt(process.env.PORT, 10) : 8080);

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
    // Defensive Payload Ingestion (Null-Safe Destructuring)
    const data = req.body && typeof req.body === "object" ? req.body : {};
    const { messages, currentPrompt, mode, isVaultContext, vaultTitle, isFirstTurn } = data;

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

    const localMeta = isFirstTurn ? extractLocalMetadata(safePrompt) : undefined;

    try {
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
        rateLimited: false,
        metadata: localMeta,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.warn("[Converse Endpoint Rate Limit Fallback]:", error?.message || error);
      const fallbackReply = generateLocalReflection(safePrompt, mode || "reflect", safeHistory.length);
      return res.json({
        reply: fallbackReply,
        modelUsed: "local-resilient-fallback",
        rateLimited: true,
        metadata: localMeta || extractLocalMetadata(safePrompt),
        notice: "Gemini rate quota reached; synthesized via resilient local reflection.",
        timestamp: new Date().toISOString(),
      });
    }
  });

  // Single-Turn Entry Summary + Emotional & Keyword Extraction
  app.post("/api/gemini/summarize-entry", async (req, res) => {
    const data = req.body && typeof req.body === "object" ? req.body : {};
    const { entryText } = data;

    if (!entryText || typeof entryText !== "string") {
      return res.status(400).json({ error: "Missing 'entryText' in request body." });
    }

    const localMeta = extractLocalMetadata(entryText);

    try {
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
        title: parsed.title || localMeta.title,
        summary: parsed.summary || localMeta.summary,
        energyScore: typeof parsed.energyScore === "number" ? Math.min(10, Math.max(1, parsed.energyScore)) : localMeta.energyScore,
        emotionalMetrics: parsed.emotionalMetrics || localMeta.emotionalMetrics,
        extractedKeywords: Array.isArray(parsed.extractedKeywords) && parsed.extractedKeywords.length > 0 ? parsed.extractedKeywords.slice(0, 6) : localMeta.extractedKeywords,
        rateLimited: false,
      });
    } catch (error: any) {
      console.warn("[Summarize Endpoint Warning] Using resilient local metadata extractor:", error?.message || error);
      return res.json({
        title: localMeta.title,
        summary: localMeta.summary,
        energyScore: localMeta.energyScore,
        emotionalMetrics: localMeta.emotionalMetrics,
        extractedKeywords: localMeta.extractedKeywords,
        rateLimited: true,
      });
    }
  });

  // Automated Weekly Synthesis Digest Generator Endpoint
  app.post("/api/gemini/weekly-digest", async (req, res) => {
    const data = req.body && typeof req.body === "object" ? req.body : {};
    const { entries, weekStartDate, weekEndDate } = data;

    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: "Missing or empty 'entries' array in request body." });
    }

    try {
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
        rateLimited: false,
        entryCount: entries.length,
        createdAt: new Date().toISOString(),
      });
    } catch (error: any) {
      console.warn("[Weekly Digest Rate Limit Fallback]:", error?.message || error);
      return res.json({
        title: "Weekly Mindful Synthesis",
        synthesis: `This week you recorded ${entries.length} reflections exploring key themes of intentional focus, personal growth, and problem solving. Reviewing your logs demonstrates continuous commitment to mental clarity and balanced action. While live AI processing is currently rate-limited, your recorded reflections show clear forward momentum and self-awareness.`,
        coreThemes: [
          "Strategic Prioritization: Focus on high-leverage activities",
          "Emotional Equilibrium: Navigating complex daily demands with calm",
          "Continuous Iteration: Learning from daily retrospectives"
        ],
        keyTakeaways: [
          "Consistent daily journaling clarifies decision-making and reduces cognitive overload.",
          "Protecting dedicated quiet blocks elevates creative clarity.",
          "Translating thoughts into written reflections cements strategic accountability."
        ],
        growthActions: [
          "Define 1 primary strategic priority each morning before reading inbox.",
          "Reserve 10 minutes each evening for an uninterrupted mental recap.",
          "Maintain clear boundaries between deep focus and reactive communication."
        ],
        emotionalOverview: "Overall steady energy with resilient focus across weekly entries.",
        modelUsed: "local-resilient-digest",
        rateLimited: true,
        entryCount: entries.length,
        createdAt: new Date().toISOString(),
      });
    }
  });

  // =========================================================================
  // External Notifications Proxy (Slack, Discord, Custom Webhooks)
  // =========================================================================
  function validateWebhookUrl(rawUrl: string): boolean {
    try {
      const parsed = new URL(rawUrl);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
      const hostname = parsed.hostname.toLowerCase();
      // Block SSRF to loopback, link-local metadata, or private IP spaces
      if (
        hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        hostname === "0.0.0.0" ||
        hostname === "169.254.169.254" ||
        hostname.endsWith(".internal") ||
        hostname.endsWith(".local") ||
        hostname.startsWith("10.") ||
        hostname.startsWith("192.168.")
      ) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  app.post("/api/notifications/dispatch", async (req, res) => {
    try {
      const data = req.body && typeof req.body === "object" ? req.body : {};
      const { webhookUrl, platform, trigger, entry, userEmail } = data;

      if (!webhookUrl || typeof webhookUrl !== "string") {
        return res.status(400).json({ error: "Missing or invalid webhookUrl" });
      }

      if (!validateWebhookUrl(webhookUrl)) {
        return res.status(400).json({ error: "Invalid or restricted webhook URL target (SSRF prevention)." });
      }

      const safePlatform = platform === "discord" ? "discord" : platform === "slack" ? "slack" : "webhook";
      const safeEntry = entry && typeof entry === "object" ? entry : {};
      let payload: any = {};

      if (safePlatform === "slack") {
        payload = {
          text: `✨ Reflection Log: ${safeEntry.title || "New Reflection"}`,
          blocks: [
            {
              type: "header",
              text: {
                type: "plain_text",
                text: `✨ ${safeEntry.title ? safeEntry.title.slice(0, 100) : "New Reflection"}`,
              },
            },
            {
              type: "section",
              text: {
                type: "mrkdwn",
                text: `*Category:* ${safeEntry.category || "reflection"} | *Mood/Sentiment:* ${safeEntry.sentiment || "balanced"} | *Energy:* ${safeEntry.energyScore || 7}/10\n${safeEntry.summary ? `> ${safeEntry.summary.slice(0, 500)}` : ""}`,
              },
            },
            ...(safeEntry.location
              ? [
                  {
                    type: "context",
                    elements: [
                      {
                        type: "mrkdwn",
                        text: `📍 *Location:* ${safeEntry.location.placeName || safeEntry.location.formattedAddress || "Pinned Geo Point"}`,
                      },
                    ],
                  },
                ]
              : []),
          ],
        };
      } else if (safePlatform === "discord") {
        payload = {
          content: "✨ **New Journal Reflection Logged**",
          embeds: [
            {
              title: safeEntry.title || "New Reflection",
              description: safeEntry.summary || "Reflection thoughts captured and synthesized.",
              color: 5922368, // #5A5A40 olive tone
              fields: [
                { name: "Category", value: safeEntry.category || "reflection", inline: true },
                { name: "Energy Level", value: `${safeEntry.energyScore || 7}/10`, inline: true },
                ...(safeEntry.location
                  ? [{ name: "📍 Location", value: safeEntry.location.placeName || "Pinned Location", inline: true }]
                  : []),
              ],
              footer: { text: "Gemini Reflection Journal" },
              timestamp: new Date().toISOString(),
            },
          ],
        };
      } else {
        // Generic Webhook
        payload = {
          event: "journal.reflection_parsed",
          trigger: trigger || "entry_created",
          timestamp: new Date().toISOString(),
          userEmail: userEmail || "anonymous",
          entry: {
            title: safeEntry.title,
            summary: safeEntry.summary,
            category: safeEntry.category,
            energyScore: safeEntry.energyScore,
            sentiment: safeEntry.sentiment,
            keywords: safeEntry.keywords,
            location: safeEntry.location,
          },
        };
      }

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      return res.json({
        success: response.ok,
        status: response.status,
        platform: safePlatform,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error("[Notification Dispatch Error]:", err);
      return res.status(500).json({ error: err?.message || "Failed to dispatch notification webhook." });
    }
  });

  app.post("/api/notifications/test", async (req, res) => {
    try {
      const data = req.body && typeof req.body === "object" ? req.body : {};
      const { webhookUrl, platform } = data;

      if (!webhookUrl || typeof webhookUrl !== "string" || !validateWebhookUrl(webhookUrl)) {
        return res.status(400).json({ error: "Invalid webhook URL." });
      }

      const testEntry = {
        title: "Test Reflection Signal",
        summary: "This is an automated test signal from your Gemini Reflection Journal external notification system.",
        category: "reflection",
        sentiment: "positive",
        energyScore: 9,
        location: { placeName: "San Francisco, CA" },
      };

      // Reuse dispatch logic
      const safePlatform = platform === "discord" ? "discord" : platform === "slack" ? "slack" : "webhook";
      let payload: any;

      if (safePlatform === "slack") {
        payload = {
          text: "🔔 Test Notification: Gemini Reflection Journal Webhook Connected!",
          blocks: [
            {
              type: "header",
              text: { type: "plain_text", text: "🔔 Webhook Test Successful" },
            },
            {
              type: "section",
              text: { type: "mrkdwn", text: "Your Slack webhook integration is active and verified for the Gemini Reflection Journal." },
            },
          ],
        };
      } else if (safePlatform === "discord") {
        payload = {
          content: "🔔 **Gemini Reflection Journal - Webhook Connected**",
          embeds: [
            {
              title: "Webhook Test Successful",
              description: "Your Discord channel is now connected to receive automated journal milestone alerts.",
              color: 4549438,
              timestamp: new Date().toISOString(),
            },
          ],
        };
      } else {
        payload = {
          event: "journal.test_ping",
          status: "connected",
          timestamp: new Date().toISOString(),
          testEntry,
        };
      }

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      return res.json({
        success: response.ok,
        status: response.status,
        message: response.ok ? "Test ping delivered successfully." : `Target server returned HTTP ${response.status}`,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || "Failed to deliver test notification." });
    }
  });

  // Vite Middleware Integration for Development & Static fallback for Production
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In production, serve pre-bundled static assets from dist/
    const candidateDist = path.join(process.cwd(), "dist");
    const distPath = fs.existsSync(path.join(candidateDist, "index.html"))
      ? candidateDist
      : path.resolve(__dirname);

    app.use(express.static(distPath));

    // Fallback for unmatched API routes
    app.all("/api/*", (req, res) => {
      res.status(404).json({ error: `API route ${req.method} ${req.path} not found.` });
    });

    // SPA client-side fallback
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"), (err) => {
        if (err) {
          res.status(500).send("Application static assets not found. Please ensure 'npm run build' was executed.");
        }
      });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
