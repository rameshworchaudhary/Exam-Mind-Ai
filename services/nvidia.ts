// services/nvidia.ts
import OpenAI from "openai";

export const NVIDIA_DEFAULT_BASE_URL =
  process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1";

export const NVIDIA_REQUEST_TIMEOUT_MS = Number(
  process.env.NVIDIA_TIMEOUT_MS ?? 15000
);

// NVIDIA Nemotron model configuration
export const PRIMARY_NVIDIA_MODEL =
  process.env.NVIDIA_MODEL?.trim() || "nvidia/nemotron-3-super-120b-a12b";

// Helper to get active model
export function getNvidiaModel(): string {
  const envModel = process.env.NVIDIA_MODEL?.trim();
  if (!envModel || envModel === "dummy_nvidia_model") {
    return PRIMARY_NVIDIA_MODEL;
  }
  return envModel;
}

export const NVIDIA_DEFAULT_MODEL = getNvidiaModel();

export function getNvidiaClient(): OpenAI {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey || apiKey.trim() === "" || apiKey === "dummy_nvidia_key") {
    throw new Error(
      "NVIDIA_API_KEY is not configured in server environment variables. Please configure NVIDIA_API_KEY to use NVIDIA Nemotron."
    );
  }

  return new OpenAI({
    apiKey: apiKey.trim(),
    baseURL: NVIDIA_DEFAULT_BASE_URL,
    timeout: 60000,
    maxRetries: 0,
  });
}

/**
 * Executes a chat completion strictly using the required NVIDIA Nemotron model.
 * No internal model rotation. If NVIDIA fails, the caller falls back to Groq.
 */
export async function callNvidiaChatCompletion(
  params: Omit<OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming, "model"> & {
    model?: string;
  }
): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  const apiKey = process.env.NVIDIA_API_KEY?.trim();
  if (!apiKey || apiKey === "dummy_nvidia_key") {
    throw new Error(
      "NVIDIA_API_KEY is not configured in server environment variables."
    );
  }

  const model = params.model || getNvidiaModel();
  const url = `${NVIDIA_DEFAULT_BASE_URL.replace(/\/+$/, "")}/chat/completions`;
  const timeoutMs = Number.isFinite(NVIDIA_REQUEST_TIMEOUT_MS)
    ? Math.max(1000, NVIDIA_REQUEST_TIMEOUT_MS)
    : 15000;

  console.log(`[AI] Calling NVIDIA (${model}) at ${url}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const response = await fetch(url, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        model,
        messages: params.messages,
        temperature: params.temperature ?? 0.2,
        top_p: params.top_p ?? 0.7,
        max_tokens: params.max_tokens ?? 100,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      const errorSnippet = errorText.slice(0, 300) || "none";

      if (response.status === 429) {
        console.warn(
          `[AI][NVIDIA] HTTP 429, falling back to Groq for model=${model} url=${url} body=${errorSnippet}`
        );
      } else if (response.status === 503 || response.status >= 500) {
        console.warn(
          `[AI][NVIDIA] HTTP ${response.status}, falling back to Groq for model=${model} url=${url} body=${errorSnippet}`
        );
      } else {
        console.warn(
          `[AI][NVIDIA] REST status=${response.status} model=${model} url=${url} body=${errorSnippet}`
        );
      }

      throw new Error(
        `NVIDIA API returned HTTP ${response.status} for model ${model}: ${errorText.slice(0, 200)}`
      );
    }

    const data = (await response.json()) as OpenAI.Chat.Completions.ChatCompletion;
    return data;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (error instanceof Error && error.name === "AbortError") {
      console.warn(`[AI][NVIDIA] Timeout after 15s, falling back to Groq`);
      throw new Error(`NVIDIA API timed out after ${timeoutMs}ms for model ${model}`);
    }

    if (message.includes("429") || message.includes("HTTP 429")) {
      console.warn(`[AI][NVIDIA] HTTP 429, falling back to Groq`);
    } else if (message.includes("503") || message.includes("HTTP 503")) {
      console.warn(`[AI][NVIDIA] HTTP 503, falling back to Groq`);
    } else {
      console.warn(`[AI][NVIDIA] Request failed, falling back to Groq: ${message}`);
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function cleanJsonContent(content: string): string {
  if (!content) return "";
  let cleaned = content.trim();
  // Strip code fences with any tag (json, text, markdown, etc.)
  const jsonBlock = cleaned.match(/```[a-zA-Z0-9_-]*\s*([\s\S]*?)\s*```/);
  if (jsonBlock) {
    return jsonBlock[1].trim();
  }
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```[a-zA-Z0-9_-]*\s*/, "");
    if (cleaned.endsWith("```")) {
      cleaned = cleaned.slice(0, -3);
    }
  }
  return cleaned.trim();
}

function sanitizeJsonString(raw: string): string {
  // Replace raw unescaped newlines/tabs inside quotes
  let result = raw.replace(/"((?:[^"\\]|\\.)*)"/g, (_, p1) => {
    return '"' + p1.replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t") + '"';
  });
  // Strip trailing commas before closing braces/brackets
  result = result.replace(/,\s*([\]}])/g, "$1");
  return result;
}

function autoBalanceJson(text: string): string | null {
  const openBraces = (text.match(/\{/g) || []).length;
  const closeBraces = (text.match(/\}/g) || []).length;
  const openBrackets = (text.match(/\[/g) || []).length;
  const closeBrackets = (text.match(/\]/g) || []).length;

  if (openBraces === closeBraces && openBrackets === closeBrackets) {
    return null;
  }

  let balanced = text;
  // If in the middle of an unclosed string, close it
  const quoteCount = (balanced.match(/(?<!\\)"/g) || []).length;
  if (quoteCount % 2 !== 0) {
    balanced += '"';
  }

  // Close brackets first then braces
  for (let i = 0; i < openBrackets - closeBrackets; i++) {
    balanced += "]";
  }
  for (let i = 0; i < openBraces - closeBraces; i++) {
    balanced += "}";
  }
  return balanced;
}

export function safeJsonParse<T = Record<string, unknown>>(content: string): T | null {
  if (!content || !content.trim()) return null;
  const cleaned = cleanJsonContent(content);

  // 1. Direct parse
  try {
    return JSON.parse(cleaned) as T;
  } catch {}

  // 2. Sanitized parse (handle newlines & trailing commas)
  try {
    const sanitized = sanitizeJsonString(cleaned);
    return JSON.parse(sanitized) as T;
  } catch {}

  // 3. Extract outermost object {...}
  const objMatch = cleaned.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try {
      return JSON.parse(objMatch[0]) as T;
    } catch {
      try {
        return JSON.parse(sanitizeJsonString(objMatch[0])) as T;
      } catch {}
    }
  }

  // 4. Extract outermost array [...]
  const arrMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrMatch) {
    try {
      return JSON.parse(arrMatch[0]) as T;
    } catch {
      try {
        return JSON.parse(sanitizeJsonString(arrMatch[0])) as T;
      } catch {}
    }
  }

  // 5. Try auto-balancing truncated JSON
  try {
    const balanced = autoBalanceJson(cleaned);
    if (balanced) {
      try {
        return JSON.parse(sanitizeJsonString(balanced)) as T;
      } catch {}
    }
  } catch {}

  return null;
}

// Helper to normalize any parsed AI object into strictly typed SyllabusAnalysisResult
export function normalizeSyllabusResult(
  raw: any,
  defaultSubject: string = "General"
): SyllabusAnalysisResult {
  const data = raw?.data || raw?.syllabus || raw?.result || raw?.response || raw || {};
  const rawUnits = Array.isArray(data.units)
    ? data.units
    : Array.isArray(data.modules)
    ? data.modules
    : Array.isArray(data.chapters)
    ? data.chapters
    : [];

  const normalizedUnits: SyllabusUnit[] = rawUnits.map((u: any, idx: number) => {
    const unitName =
      typeof u === "string"
        ? u.trim()
        : String(u?.name || u?.title || u?.unitName || u?.moduleName || `Unit ${idx + 1}`).trim();

    let rawTopics = Array.isArray(u?.topics)
      ? u.topics
      : Array.isArray(u?.subtopics)
      ? u.subtopics
      : Array.isArray(u?.chapters)
      ? u.chapters
      : [];

    const topics: string[] = rawTopics
      .map((t: any) => {
        if (typeof t === "string") return t.trim();
        if (t && typeof t === "object") {
          return String(t.title || t.name || t.topic || "").trim();
        }
        return "";
      })
      .filter((t: string) => t.length > 0);

    let weight = 0;
    if (typeof u?.weightage === "number" && !isNaN(u.weightage)) {
      weight = u.weightage;
    } else if (typeof u?.weight === "number" && !isNaN(u.weight)) {
      weight = u.weight;
    } else if (typeof u?.marks === "number" && !isNaN(u.marks)) {
      weight = u.marks;
    } else if (typeof u?.percentage === "number" && !isNaN(u.percentage)) {
      weight = u.percentage;
    } else if (typeof u?.weightage === "string") {
      weight = parseFloat(u.weightage.replace(/[^0-9.]/g, "")) || 0;
    }

    return {
      name: unitName || `Unit ${idx + 1}`,
      topics: topics.length > 0 ? topics : [`Core Concepts of ${unitName}`],
      weightage: weight,
    };
  });

  // Ensure weightages distribute nicely if model returned zeroes
  const totalWeight = normalizedUnits.reduce((sum, u) => sum + u.weightage, 0);
  if (normalizedUnits.length > 0 && totalWeight === 0) {
    const equalWeight = Math.round(100 / normalizedUnits.length);
    normalizedUnits.forEach((u, i) => {
      u.weightage = i === normalizedUnits.length - 1 ? 100 - equalWeight * (normalizedUnits.length - 1) : equalWeight;
    });
  }

  const rawImportant = Array.isArray(data.importantTopics)
    ? data.importantTopics
    : Array.isArray(data.highWeightageTopics)
    ? data.highWeightageTopics
    : Array.isArray(data.keyTopics)
    ? data.keyTopics
    : [];

  const importantTopics: string[] = rawImportant
    .map((t: any) => (typeof t === "string" ? t.trim() : String(t?.topic || t?.name || t?.title || "").trim()))
    .filter((t: string) => t.length > 0);

  if (importantTopics.length === 0 && normalizedUnits.length > 0) {
    // Pick top topics from units
    normalizedUnits.slice(0, 3).forEach((u) => {
      if (u.topics[0]) importantTopics.push(u.topics[0]);
    });
  }

  const calculatedTotalTopics = normalizedUnits.reduce((acc, u) => acc + u.topics.length, 0);
  const totalTopics =
    typeof data.totalTopics === "number" && data.totalTopics > 0
      ? data.totalTopics
      : calculatedTotalTopics;

  const summary =
    typeof data.summary === "string" && data.summary.trim().length > 0
      ? data.summary.trim()
      : `Comprehensive syllabus analysis for ${defaultSubject} comprising ${normalizedUnits.length} module(s) and ${totalTopics} key topic(s).`;

  return {
    units: normalizedUnits,
    summary,
    importantTopics,
    totalTopics,
  };
}

// Helper to normalize any parsed AI object into strictly typed PYQAnalysisResult
export function normalizePYQResult(raw: any, defaultSubject: string = "General"): PYQAnalysisResult {
  const data = raw?.data || raw?.pyq || raw?.result || raw?.response || raw || {};

  const rawRepeated = Array.isArray(data.repeatedQuestions)
    ? data.repeatedQuestions
    : Array.isArray(data.repeated_questions)
    ? data.repeated_questions
    : Array.isArray(data.questions)
    ? data.questions
    : [];

  const repeatedQuestions: PYQRepeatedQuestion[] = rawRepeated
    .map((q: any) => {
      const qText = typeof q === "string" ? q.trim() : String(q?.question || q?.q || q?.title || q?.text || "").trim();
      let freq = 2;
      if (typeof q === "object" && q !== null) {
        if (typeof q.frequency === "number" && !isNaN(q.frequency)) freq = q.frequency;
        else if (q.frequency) freq = parseInt(String(q.frequency).replace(/[^0-9]/g, "")) || 2;
        else if (typeof q.count === "number") freq = q.count;
      }
      let prob = 75;
      if (typeof q === "object" && q !== null) {
        if (typeof q.probability === "number" && !isNaN(q.probability)) prob = q.probability;
        else if (q.probability) prob = parseInt(String(q.probability).replace(/[^0-9]/g, "")) || 75;
      }
      prob = Math.max(20, Math.min(98, prob));
      return { question: qText, frequency: freq, probability: prob };
    })
    .filter((q: PYQRepeatedQuestion) => q.question.length > 0);

  const rawImportant = Array.isArray(data.importantTopics)
    ? data.importantTopics
    : Array.isArray(data.important_topics)
    ? data.important_topics
    : Array.isArray(data.topics)
    ? data.topics
    : [];

  const importantTopics: PYQImportantTopic[] = rawImportant
    .map((t: any, idx: number) => {
      if (typeof t === "string") {
        return {
          topic: t.trim(),
          weightage: Math.max(10, Math.round(100 / Math.max(1, rawImportant.length))),
        };
      }
      const topicName = String(t?.topic || t?.name || t?.title || `Topic ${idx + 1}`).trim();
      let weight = 20;
      if (typeof t?.weightage === "number" && !isNaN(t.weightage)) weight = t.weightage;
      else if (typeof t?.weight === "number" && !isNaN(t.weight)) weight = t.weight;
      else if (t?.weightage) weight = parseInt(String(t.weightage).replace(/[^0-9]/g, "")) || 20;
      return { topic: topicName, weightage: weight };
    })
    .filter((t: PYQImportantTopic) => t.topic.length > 0);

  const rawPredictions = Array.isArray(data.predictions)
    ? data.predictions
    : Array.isArray(data.predictedQuestions)
    ? data.predictedQuestions
    : Array.isArray(data.predicted_questions)
    ? data.predicted_questions
    : [];

  const predictions: PYQPrediction[] = rawPredictions
    .map((p: any) => {
      const qText = typeof p === "string" ? p.trim() : String(p?.question || p?.prediction || p?.q || p?.text || "").trim();
      let prob = 85;
      if (typeof p === "object" && p !== null) {
        if (typeof p.probability === "number" && !isNaN(p.probability)) prob = p.probability;
        else if (p.probability) prob = parseInt(String(p.probability).replace(/[^0-9]/g, "")) || 85;
      }
      prob = Math.max(30, Math.min(99, prob));
      const reasoning =
        typeof p === "object" && p?.reasoning
          ? String(p.reasoning).trim()
          : `High historical recurrence in ${defaultSubject} examination patterns.`;
      return { question: qText, probability: prob, reasoning };
    })
    .filter((p: PYQPrediction) => p.question.length > 0);

  const rawTrends = Array.isArray(data.trends)
    ? data.trends
    : Array.isArray(data.patterns)
    ? data.patterns
    : Array.isArray(data.keyTrends)
    ? data.keyTrends
    : [];

  const trends: string[] = rawTrends
    .map((t: any) => (typeof t === "string" ? t.trim() : String(t?.trend || t?.description || t?.text || "").trim()))
    .filter((t: string) => t.length > 0);

  return {
    repeatedQuestions,
    importantTopics,
    predictions,
    trends,
  };
}

// ======================================================
// NVIDIA SYLLABUS ANALYZER
// ======================================================
export interface SyllabusUnit {
  name: string;
  topics: string[];
  weightage: number;
}

export interface SyllabusAnalysisResult {
  units: SyllabusUnit[];
  summary: string;
  importantTopics: string[];
  totalTopics: number;
}

export async function analyzeSyllabusNvidia(
  syllabusText: string,
  subject: string = "General"
): Promise<SyllabusAnalysisResult> {
  const response = await callNvidiaChatCompletion({
    messages: [
      {
        role: "system",
        content:
          "You are an expert AI academic syllabus analyzer. Preserve all original terminology, languages (English, Hindi, Hinglish), Unicode characters, mathematical symbols, degree symbols, special characters (/, &, -, :, %, ()), and formulas exactly as written. You MUST output ONLY valid JSON without markdown formatting, code fences, or introductory text.",
      },
      {
        role: "user",
        content: `Analyze this syllabus for ${subject}.
Return ONLY a valid JSON object matching this schema:
{
  "units": [{"name": "Unit Name", "topics": ["Topic 1", "Topic 2"], "weightage": 20}],
  "summary": "Concise overview of syllabus and coverage",
  "importantTopics": ["High Weightage Topic 1", "High Weightage Topic 2"],
  "totalTopics": 5
}

Syllabus content:
${syllabusText.slice(0, 6000)}`,
      },
    ],
    temperature: 0.2,
    max_tokens: 2200,
  });

  const content = response.choices?.[0]?.message?.content || "";
  const parsed = safeJsonParse(content);

  if (!parsed) {
    throw new Error(
      "NVIDIA Nemotron returned a response that could not be parsed as JSON: " +
        content.slice(0, 200)
    );
  }

  const normalized = normalizeSyllabusResult(parsed, subject);
  if (!normalized.units || normalized.units.length === 0) {
    throw new Error("NVIDIA Nemotron returned empty units");
  }

  return normalized;
}

// ======================================================
// NVIDIA PYQ ANALYZER
// ======================================================
export interface PYQRepeatedQuestion {
  question: string;
  frequency: number;
  probability: number;
}

export interface PYQImportantTopic {
  topic: string;
  weightage: number;
}

export interface PYQPrediction {
  question: string;
  probability: number;
  reasoning?: string;
}

export interface PYQAnalysisResult {
  repeatedQuestions: PYQRepeatedQuestion[];
  importantTopics: PYQImportantTopic[];
  predictions: PYQPrediction[];
  trends: string[];
}

export async function analyzePYQNvidia(
  pyqText: string,
  subject: string = "General"
): Promise<PYQAnalysisResult> {
  const response = await callNvidiaChatCompletion({
    messages: [
      {
        role: "system",
        content:
          "You are an expert AI exam question paper analyzer and predictor. Preserve all original terminology, languages (English, Hindi, Hinglish), Unicode characters, mathematical symbols, degree symbols, special characters (/, &, -, :, %, ()), and formulas exactly as written. You MUST output ONLY valid JSON without markdown formatting, code fences, or introductory text.",
      },
      {
        role: "user",
        content: `Analyze these previous year questions (PYQ) for ${subject}.
Return ONLY a valid JSON object matching this schema:
{
  "repeatedQuestions": [
    {"question": "Exact repeated question text", "frequency": 3, "probability": 85}
  ],
  "importantTopics": [
    {"topic": "Important Topic Name", "weightage": 25}
  ],
  "predictions": [
    {"question": "Predicted question for upcoming exam", "probability": 90, "reasoning": "Reasoning based on trend"}
  ],
  "trends": [
    "Trend description 1",
    "Trend description 2"
  ]
}

PYQ content:
${pyqText.slice(0, 12000)}`,
      },
    ],
    temperature: 0.2,
    max_tokens: 2500,
  });

  const content = response.choices?.[0]?.message?.content || "";
  const parsed = safeJsonParse(content);

  if (!parsed) {
    throw new Error(
      "NVIDIA Nemotron returned a response that could not be parsed as JSON: " +
        content.slice(0, 200)
    );
  }

  const normalized = normalizePYQResult(parsed, subject);
  if (
    (!normalized.repeatedQuestions || normalized.repeatedQuestions.length === 0) &&
    (!normalized.importantTopics || normalized.importantTopics.length === 0) &&
    (!normalized.predictions || normalized.predictions.length === 0)
  ) {
    throw new Error("NVIDIA Nemotron returned empty PYQ insights");
  }

  return normalized;
}
