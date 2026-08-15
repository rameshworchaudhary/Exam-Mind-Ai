// services/ai.ts
import Groq from "groq-sdk";
import {
  analyzeSyllabusNvidia,
  analyzePYQNvidia,
  SyllabusAnalysisResult,
  PYQAnalysisResult,
} from "./nvidia";

export const GROQ_DEFAULT_MODEL =
  process.env.GROQ_MODEL || "llama-3.1-8b-instant";

export function getGroq(): Groq {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.trim() === "" || apiKey === "placeholder_key") {
    throw new Error(
      "GROQ_API_KEY is not configured in server environment variables. Please configure GROQ_API_KEY to use Groq AI features."
    );
  }

  return new Groq({
    apiKey,
    timeout: 60000,
    maxRetries: 2,
  });
}

// ======================================================
// RETRY HELPER
// ======================================================
async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 2
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const msg = error instanceof Error ? error.message : String(error);
      if (
        msg.includes("not configured") ||
        msg.includes("API_KEY") ||
        msg.includes("401") ||
        i === retries
      ) {
        break;
      }
      await new Promise((r) => setTimeout(r, 600 * (i + 1)));
    }
  }
  throw lastError;
}

// ======================================================
// SAFE JSON PARSER
// ======================================================
function cleanJsonContent(content: string): string {
  if (!content) return "";
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
// 1. SYLLABUS ANALYZER (Powered by NVIDIA Nemotron)
// ======================================================
export async function analyzeSyllabus(
  syllabusText: string,
  subject: string = "General"
): Promise<SyllabusAnalysisResult> {
  return await analyzeSyllabusNvidia(syllabusText, subject);
}

// ======================================================
// 2. PYQ ANALYZER (Powered by NVIDIA Nemotron)
// ======================================================
export async function analyzePYQ(
  pyqText: string,
  subject: string = "General"
): Promise<PYQAnalysisResult> {
  return await analyzePYQNvidia(pyqText, subject);
}

// ======================================================
// 3. NOTES GENERATOR (Powered by Groq)
// ======================================================
export interface NotesResult {
  title: string;
  content: string;
  keyPoints: string[];
  formulas: string[];
  definitions: Record<string, string>;
}

export async function generateNotes(
  topic: string,
  subject: string,
  noteType: string
): Promise<NotesResult> {
  return withRetry(async () => {
    const groq = getGroq();
    const res = await groq.chat.completions.create({
      model: GROQ_DEFAULT_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are an expert academic tutor. You MUST output ONLY valid JSON without markdown formatting, code fences, or conversational filler.",
        },
        {
          role: "user",
          content: `Generate structured ${noteType} revision notes for the topic "${topic}" in subject "${subject}".
Return ONLY a valid JSON object matching this schema:
{
  "title": "${topic} Notes",
  "content": "Comprehensive and clear explanation of the topic with structured paragraphs",
  "keyPoints": ["Crucial bullet point 1", "Crucial bullet point 2", "Crucial bullet point 3"],
  "formulas": ["Relevant formula or equation if applicable"],
  "definitions": {"KeyTerm": "Clear concise definition"}
}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 1800,
    });

    const raw = res.choices?.[0]?.message?.content || "";
    const parsed = safeJsonParse<{
      title?: string;
      content?: string;
      keyPoints?: string[];
      formulas?: string[];
      definitions?: Record<string, string>;
    }>(raw);

    if (!parsed) {
      throw new Error("Failed to parse notes response from AI: " + raw.slice(0, 200));
    }

    return {
      title: parsed.title || `${topic} Notes`,
      content: parsed.content || "Notes generation produced no content.",
      keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints : [],
      formulas: Array.isArray(parsed.formulas) ? parsed.formulas : [],
      definitions:
        parsed.definitions && typeof parsed.definitions === "object"
          ? parsed.definitions
          : {},
    };
  });
}

// ======================================================
// 4. ASSIGNMENT GENERATOR (Powered by Groq)
// ======================================================
export interface AssignmentSection {
  heading: string;
  content: string;
}

export interface AssignmentResult {
  answer: string;
  wordCount: number;
  sections: AssignmentSection[];
}

export async function generateAssignmentAnswer(
  question: string,
  subject: string
): Promise<AssignmentResult> {
  return withRetry(async () => {
    const groq = getGroq();
    const res = await groq.chat.completions.create({
      model: GROQ_DEFAULT_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are an expert academic writer who produces formal university-grade assignment answers. You MUST output ONLY valid JSON without markdown code fences or conversational text.",
        },
        {
          role: "user",
          content: `Write an in-depth formal assignment answer for: "${question}" in subject "${subject}".
Return ONLY a valid JSON object matching this schema:
{
  "answer": "Full comprehensive written answer text",
  "wordCount": 450,
  "sections": [
    {"heading": "Introduction", "content": "Introductory paragraphs"},
    {"heading": "Key Concepts & Analysis", "content": "Detailed technical explanation"},
    {"heading": "Conclusion", "content": "Summary and conclusion"}
  ]
}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 2200,
    });

    const raw = res.choices?.[0]?.message?.content || "";
    const parsed = safeJsonParse<{
      answer?: string;
      wordCount?: number;
      sections?: AssignmentSection[];
    }>(raw);

    if (!parsed) {
      throw new Error("Failed to parse assignment response from AI: " + raw.slice(0, 200));
    }

    const answer = parsed.answer || "";
    const sections = Array.isArray(parsed.sections) && parsed.sections.length > 0
      ? parsed.sections
      : [{ heading: "Solution", content: answer }];

    return {
      answer: answer || sections.map((s) => `${s.heading}\n${s.content}`).join("\n\n"),
      wordCount:
        typeof parsed.wordCount === "number"
          ? parsed.wordCount
          : (answer.match(/\S+/g) || []).length,
      sections,
    };
  });
}

// ======================================================
// 5. VIVA QUESTIONS GENERATOR (Powered by Groq)
// ======================================================
export interface VivaQuestionItem {
  question: string;
  answer: string;
  difficulty: "easy" | "medium" | "hard";
  followUps?: string[];
}

export interface VivaResult {
  questions: VivaQuestionItem[];
}

export async function generateVivaQuestions(
  subject: string,
  topic: string
): Promise<VivaResult> {
  return withRetry(async () => {
    const groq = getGroq();
    const res = await groq.chat.completions.create({
      model: GROQ_DEFAULT_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are an expert university examiner generating oral viva voce exam questions. You MUST output ONLY valid JSON without markdown code fences or conversational text.",
        },
        {
          role: "user",
          content: `Generate 8 essential viva questions and model answers for topic "${topic}" in subject "${subject}".
Return ONLY a valid JSON object matching this schema:
{
  "questions": [
    {
      "question": "What is ...?",
      "answer": "Concise, precise technical answer expected by the examiner",
      "difficulty": "medium",
      "followUps": ["Follow-up question 1"]
    }
  ]
}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 2200,
    });

    const raw = res.choices?.[0]?.message?.content || "";
    const parsed = safeJsonParse<{ questions?: VivaQuestionItem[] }>(raw);

    if (!parsed || !Array.isArray(parsed.questions)) {
      throw new Error("Failed to parse viva questions from AI: " + raw.slice(0, 200));
    }

    return {
      questions: parsed.questions.map((q) => ({
        question: q.question || "Viva Question",
        answer: q.answer || "Model answer",
        difficulty: (["easy", "medium", "hard"].includes(q.difficulty)
          ? q.difficulty
          : "medium") as "easy" | "medium" | "hard",
        followUps: Array.isArray(q.followUps) ? q.followUps : [],
      })),
    };
  });
}

// ======================================================
// 6. STUDY PLANNER (Powered by Groq)
// ======================================================
export interface StudyPlanDayTask {
  subject: string;
  topic: string;
  duration: number;
  type: string;
}

export interface StudyPlanDay {
  date: string;
  day: string;
  tasks: StudyPlanDayTask[];
  totalHours: number;
}

export interface StudyPlanResult {
  overview: string;
  dailyPlan: StudyPlanDay[];
  weeklyGoals: string[];
  tips: string[];
}

export async function generateStudyPlan(input: {
  examDate: string;
  subjects: string[];
  preparationLevel: string;
  dailyHours: number;
}): Promise<StudyPlanResult> {
  const daysLeft = Math.max(
    1,
    Math.ceil((new Date(input.examDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  );

  return withRetry(async () => {
    const groq = getGroq();
    const res = await groq.chat.completions.create({
      model: GROQ_DEFAULT_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are an expert academic study strategist. You MUST output ONLY valid JSON without markdown code fences or conversational text.",
        },
        {
          role: "user",
          content: `Create an intensive, realistic 7-day preparation schedule for a student.
Target Exam Date: ${input.examDate} (${daysLeft} days away)
Subjects: ${input.subjects.join(", ")}
Current Prep Level: ${input.preparationLevel}
Available Daily Study Time: ${input.dailyHours} hours/day

Return ONLY a valid JSON object matching this schema:
{
  "overview": "Summary of revision strategy tailored to ${daysLeft} days remaining",
  "dailyPlan": [
    {
      "date": "Day 1",
      "day": "Monday",
      "tasks": [
        {"subject": "${input.subjects[0] || 'Subject 1'}", "topic": "Core Fundamentals", "duration": 60, "type": "study"}
      ],
      "totalHours": ${input.dailyHours}
    }
  ],
  "weeklyGoals": ["Goal 1", "Goal 2"],
  "tips": ["Tip 1", "Tip 2"]
}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 2500,
    });

    const raw = res.choices?.[0]?.message?.content || "";
    const parsed = safeJsonParse<{
      overview?: string;
      dailyPlan?: StudyPlanDay[];
      weeklyGoals?: string[];
      tips?: string[];
    }>(raw);

    if (!parsed) {
      throw new Error("Failed to parse study plan from AI: " + raw.slice(0, 200));
    }

    return {
      overview: parsed.overview || "Custom study timetable",
      dailyPlan: Array.isArray(parsed.dailyPlan) ? parsed.dailyPlan : [],
      weeklyGoals: Array.isArray(parsed.weeklyGoals) ? parsed.weeklyGoals : [],
      tips: Array.isArray(parsed.tips) ? parsed.tips : [],
    };
  });
}

// ======================================================
// 7. PERFORMANCE PREDICTOR (Powered by Groq)
// ======================================================
export interface BreakdownFactor {
  factor: string;
  score: number;
  impact: string;
}

export interface PredictionResult {
  passProbability: number;
  predictedMarks: number;
  grade: string;
  weakSubjects: string[];
  strengths: string[];
  recommendations: string[];
  breakdown: BreakdownFactor[];
}

export async function predictPerformance(input: {
  attendance: number;
  internalMarks: number;
  studyHours: number;
  syllabusCompletion: number;
  subjects: string[];
}): Promise<PredictionResult> {
  return withRetry(async () => {
    const groq = getGroq();
    const res = await groq.chat.completions.create({
      model: GROQ_DEFAULT_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are an expert academic evaluator and predictive statistical model for student performance. You MUST output ONLY valid JSON without markdown code fences or conversational text.",
        },
        {
          role: "user",
          content: `Predict student exam outcome based on these inputs:
Attendance: ${input.attendance}%
Internal Assessment Marks: ${input.internalMarks}/100
Daily Study Hours: ${input.studyHours} hours/day
Syllabus Completion: ${input.syllabusCompletion}%
Enrolled Subjects: ${input.subjects.join(", ")}

Return ONLY a valid JSON object matching this schema:
{
  "passProbability": 88,
  "predictedMarks": 76,
  "grade": "A",
  "weakSubjects": ["Subject needing attention"],
  "strengths": ["Strong area"],
  "recommendations": ["Actionable recommendation 1", "Actionable recommendation 2"],
  "breakdown": [
    {"factor": "Attendance", "score": ${input.attendance}, "impact": "high"},
    {"factor": "Internal Marks", "score": ${input.internalMarks}, "impact": "high"},
    {"factor": "Study Consistency", "score": ${Math.min(100, input.studyHours * 15)}, "impact": "medium"},
    {"factor": "Syllabus Coverage", "score": ${input.syllabusCompletion}, "impact": "critical"}
  ]
}`,
        },
      ],
      temperature: 0.2,
      max_tokens: 1500,
    });

    const raw = res.choices?.[0]?.message?.content || "";
    const parsed = safeJsonParse<{
      passProbability?: number;
      predictedMarks?: number;
      grade?: string;
      weakSubjects?: string[];
      strengths?: string[];
      recommendations?: string[];
      breakdown?: BreakdownFactor[];
    }>(raw);

    if (!parsed) {
      throw new Error("Failed to parse prediction result from AI: " + raw.slice(0, 200));
    }

    return {
      passProbability:
        typeof parsed.passProbability === "number" ? parsed.passProbability : 75,
      predictedMarks:
        typeof parsed.predictedMarks === "number" ? parsed.predictedMarks : 70,
      grade: parsed.grade || "B+",
      weakSubjects: Array.isArray(parsed.weakSubjects) ? parsed.weakSubjects : [],
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      recommendations: Array.isArray(parsed.recommendations)
        ? parsed.recommendations
        : [],
      breakdown: Array.isArray(parsed.breakdown) ? parsed.breakdown : [],
    };
  });
}

// ======================================================
// 8. AI CHATBOT (Powered by Groq)
// ======================================================
export async function chatWithAI(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  subject?: string
): Promise<string> {
  return withRetry(async () => {
    const groq = getGroq();
    const res = await groq.chat.completions.create({
      model: GROQ_DEFAULT_MODEL,
      messages: [
        {
          role: "system",
          content: `You are ExamMind AI, an intelligent, empathetic, and highly capable academic study tutor.${
            subject ? ` Current subject context: ${subject}.` : ""
          } Provide accurate, encouraging, and easy-to-understand explanations with examples and structured formatting.`,
        },
        ...messages.slice(-12),
      ],
      temperature: 0.5,
      max_tokens: 1200,
    });

    const reply = res.choices?.[0]?.message?.content?.trim();
    if (!reply) {
      throw new Error("Received empty response from AI model.");
    }
    return reply;
  });
}
