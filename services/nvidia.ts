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

function cleanJsonContent(content: string): string {
  if (!content) return "";
  let cleaned = content.trim();
  const jsonBlock = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonBlock) {
    return jsonBlock[1].trim();
  }
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }
  return cleaned.trim();
}

function safeJsonParse<T = Record<string, unknown>>(content: string): T | null {
  const cleaned = cleanJsonContent(content);
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    try {
      const sanitized = cleaned.replace(/"((?:[^"\\]|\\.)*)"/g, (_, p1) => {
        return '"' + p1.replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t") + '"';
      });
      return JSON.parse(sanitized) as T;
    } catch {}

    try {
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          return JSON.parse(match[0]) as T;
        } catch {
          const sanitizedMatch = match[0].replace(/"((?:[^"\\]|\\.)*)"/g, (_, p1) => {
            return '"' + p1.replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t") + '"';
          });
          return JSON.parse(sanitizedMatch) as T;
        }
      }
    } catch {}
    return null;
  }
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
  const parsed = safeJsonParse<{
    units?: SyllabusUnit[];
    summary?: string;
    importantTopics?: string[];
    totalTopics?: number;
  }>(content);

  if (!parsed) {
    throw new Error(
      "NVIDIA Nemotron returned a response that could not be parsed as JSON: " +
        content.slice(0, 200)
    );
  }

  return {
    units: Array.isArray(parsed.units) ? parsed.units : [],
    summary: parsed.summary || "No summary available",
    importantTopics: Array.isArray(parsed.importantTopics)
      ? parsed.importantTopics
      : [],
    totalTopics:
      typeof parsed.totalTopics === "number"
        ? parsed.totalTopics
        : parsed.units?.length || 0,
  };
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
${pyqText.slice(0, 6000)}`,
      },
    ],
    temperature: 0.2,
    max_tokens: 2500,
  });

  const content = response.choices?.[0]?.message?.content || "";
  const parsed = safeJsonParse<{
    repeatedQuestions?: PYQRepeatedQuestion[];
    importantTopics?: PYQImportantTopic[];
    predictions?: PYQPrediction[];
    trends?: string[];
  }>(content);

  if (!parsed) {
    throw new Error(
      "NVIDIA Nemotron returned a response that could not be parsed as JSON: " +
        content.slice(0, 200)
    );
  }

  return {
    repeatedQuestions: Array.isArray(parsed.repeatedQuestions)
      ? parsed.repeatedQuestions
      : [],
    importantTopics: Array.isArray(parsed.importantTopics)
      ? parsed.importantTopics
      : [],
    predictions: Array.isArray(parsed.predictions) ? parsed.predictions : [],
    trends: Array.isArray(parsed.trends) ? parsed.trends : [],
  };
}
