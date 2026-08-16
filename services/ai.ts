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
    // Try to sanitize unescaped newlines/tabs inside string literals
    try {
      const sanitized = cleaned.replace(/"((?:[^"\\]|\\.)*)"/g, (match, p1) => {
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
    let raw = "";

    const systemPrompt =
      "You are a distinguished university professor, academic researcher, and senior subject matter expert. Your role is to write comprehensive, publication-grade academic assignments and scholarly solutions for university-level coursework. Your answers must be deeply detailed, rigorous, and academic in tone with formal definitions, theoretical foundations, concrete examples, practical applications, critical evaluations, and a definitive conclusion. You MUST output ONLY a valid JSON object matching the requested schema without conversational commentary.";

    const userPrompt = `Generate an in-depth, university-level academic assignment paper for the following subject and assignment prompt:

SUBJECT: "${subject}"
ASSIGNMENT PROMPT / QUESTIONS: "${question}"

DETAILED INSTRUCTIONS & STRUCTURE:
Produce an exhaustive, high-scoring academic submission structured across comprehensive sections:

1. "1. Introduction & Contextual Framework":
   - Provide a formal definition, historical or technological context, problem statement, and scholarly significance of the topic.
   - Outline the scope and foundational background.

2. "2. Theoretical Foundations & Fundamental Concepts":
   - Explain the core principles, underlying scientific/engineering/humanities theories, formal models, architecture, or governing laws.
   - Define critical terminology, taxonomy, algorithms, or formulas with precision.

3. "3. In-Depth Technical Breakdown & Core Analysis":
   - Deep-dive into mechanisms, components, workflows, processes, methodologies, and subtopics.
   - If specific sub-questions or problem sets were requested, address every question fully with detailed step-by-step reasoning.

4. "4. Concrete Examples & Practical Applications":
   - Provide detailed, real-world case studies, implementation scenarios, worked examples, or industry best practices.
   - Demonstrate how theory translates into real-world systems or applied research.

5. "5. Critical Evaluation, Advantages & Limitations":
   - Compare and contrast methodologies/approaches.
   - Critically analyze advantages, constraints, trade-offs, scalability, and ethical/operational considerations.

6. "6. Conclusion & Synthesis":
   - Synthesize key insights and takeaways.
   - Provide prospective insights, emerging trends, or future directions.

OUTPUT FORMAT REQUIREMENTS:
Return ONLY a valid JSON object with this exact schema:
{
  "answer": "Complete combined multi-page assignment text formatted cleanly with all section headings",
  "wordCount": 1200,
  "sections": [
    {
      "heading": "1. Introduction & Contextual Framework",
      "content": "Detailed multi-paragraph introductory text..."
    },
    {
      "heading": "2. Theoretical Foundations & Fundamental Concepts",
      "content": "Thorough theoretical analysis..."
    },
    {
      "heading": "3. In-Depth Technical Breakdown & Core Analysis",
      "content": "Exhaustive breakdown of mechanisms and components..."
    },
    {
      "heading": "4. Concrete Examples & Practical Applications",
      "content": "Rich real-world examples and practical applications..."
    },
    {
      "heading": "5. Critical Evaluation, Advantages & Limitations",
      "content": "Analytical evaluation of pros, cons, and trade-offs..."
    },
    {
      "heading": "6. Conclusion & Synthesis",
      "content": "Formal scholarly conclusion..."
    }
  ]
}`;

    try {
      const groq = getGroq();
      const res = await groq.chat.completions.create({
        model: GROQ_DEFAULT_MODEL,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],
        temperature: 0.35,
        max_tokens: 3800,
      });
      raw = res.choices?.[0]?.message?.content || "";
    } catch (groqErr) {
      console.warn("Groq failed for assignment generation, attempting NVIDIA fallback:", groqErr instanceof Error ? groqErr.message : groqErr);
      try {
        const { getNvidiaClient, NVIDIA_DEFAULT_MODEL } = await import("./nvidia");
        const nvidia = getNvidiaClient();
        const res = await nvidia.chat.completions.create({
          model: NVIDIA_DEFAULT_MODEL,
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: userPrompt,
            },
          ],
          temperature: 0.35,
          max_tokens: 3800,
        });
        raw = res.choices?.[0]?.message?.content || "";
      } catch {
        throw groqErr;
      }
    }

    let parsed = safeJsonParse<{
      answer?: string;
      wordCount?: number;
      sections?: AssignmentSection[];
    }>(raw);

    // If safeJsonParse failed, attempt parsing after cleaning
    if (!parsed) {
      const cleaned = cleanJsonContent(raw);
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        // Fallback: structured heading parser
        const lines = cleaned.split("\n");
        const extractedSections: AssignmentSection[] = [];
        let currentHeading = "1. Introduction & Overview";
        let currentContent: string[] = [];

        for (const line of lines) {
          const headingMatch = line.match(/^#+\s*(.+)$/) || line.match(/^\*\*([^*]+)\*\*:\s*(.*)$/);
          if (headingMatch) {
            if (currentContent.length > 0) {
              extractedSections.push({
                heading: currentHeading,
                content: currentContent.join("\n").trim(),
              });
              currentContent = [];
            }
            currentHeading = headingMatch[1].trim();
            if (headingMatch[2]) {
              currentContent.push(headingMatch[2]);
            }
          } else {
            currentContent.push(line);
          }
        }
        if (currentContent.length > 0) {
          extractedSections.push({
            heading: currentHeading,
            content: currentContent.join("\n").trim(),
          });
        }

        const answerText = cleaned.trim() || raw.trim();
        const words = (answerText.match(/\S+/g) || []).length || 300;
        return {
          answer: answerText || `Comprehensive assignment answer for: ${question}`,
          wordCount: words,
          sections:
            extractedSections.length > 0
              ? extractedSections
              : [{ heading: "1. Detailed Solution & Analysis", content: answerText || `Comprehensive answer for: ${question}` }],
        };
      }
    }

    if (!parsed) {
      return {
        answer: raw.trim(),
        wordCount: (raw.match(/\S+/g) || []).length || 200,
        sections: [{ heading: "Assignment Solution", content: raw.trim() }],
      };
    }

    const sections: AssignmentSection[] =
      Array.isArray(parsed.sections) && parsed.sections.length > 0
        ? parsed.sections.map((s) => ({
            heading: s.heading || "Section",
            content: s.content || "",
          }))
        : [{ heading: "1. Comprehensive Analysis", content: parsed.answer || "Assignment solution content." }];

    const combinedFromSections = sections
      .map((s) => `${s.heading}\n\n${s.content}`)
      .join("\n\n\n");

    const answer =
      parsed.answer && parsed.answer.trim().length >= combinedFromSections.length * 0.75
        ? parsed.answer.trim()
        : combinedFromSections;

    const computedWords = (answer.match(/\S+/g) || []).length;
    const wordCount =
      typeof parsed.wordCount === "number" && parsed.wordCount > 100
        ? Math.max(parsed.wordCount, computedWords)
        : computedWords;

    return {
      answer,
      wordCount,
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
          content: `You are PadhaiHub, an intelligent, empathetic, and highly capable academic study tutor.${
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
