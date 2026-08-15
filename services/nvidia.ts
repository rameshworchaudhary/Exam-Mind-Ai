// services/nvidia.ts
import OpenAI from "openai";

export const NVIDIA_DEFAULT_BASE_URL =
  process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1";

export const NVIDIA_DEFAULT_MODEL =
  process.env.NVIDIA_MODEL || "nvidia/llama-3.1-nemotron-70b-instruct";

export function getNvidiaClient(): OpenAI {
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey || apiKey.trim() === "" || apiKey === "dummy_nvidia_key") {
    throw new Error(
      "NVIDIA_API_KEY is not configured in server environment variables. Please configure NVIDIA_API_KEY to use NVIDIA Nemotron."
    );
  }

  return new OpenAI({
    apiKey,
    baseURL: NVIDIA_DEFAULT_BASE_URL,
    timeout: 60000,
    maxRetries: 2,
  });
}

function cleanJsonContent(content: string): string {
  if (!content) return "";
  // Strip markdown code fences if present
  let cleaned = content.trim();
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
      const match = cleaned.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]) as T;
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
  const client = getNvidiaClient();
  const model = NVIDIA_DEFAULT_MODEL;

  const response = await client.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content:
          "You are an expert AI academic syllabus analyzer. You MUST output ONLY valid JSON without markdown formatting, code fences, or introductory text.",
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
${syllabusText.slice(0, 4000)}`,
      },
    ],
    temperature: 0.2,
    max_tokens: 1800,
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
  const client = getNvidiaClient();
  const model = NVIDIA_DEFAULT_MODEL;

  const response = await client.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content:
          "You are an expert AI exam question paper analyzer and predictor. You MUST output ONLY valid JSON without markdown formatting, code fences, or introductory text.",
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
${pyqText.slice(0, 4000)}`,
      },
    ],
    temperature: 0.2,
    max_tokens: 2000,
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
