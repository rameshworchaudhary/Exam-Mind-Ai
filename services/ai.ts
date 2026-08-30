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
          } Provide accurate, encouraging, and easy-to-understand explanations with examples and structured formatting.

Respond in the same language and communication style as the user's latest message unless the user explicitly requests another language.
If the user speaks Hinglish, respond in natural Hinglish.
If the user speaks English, respond in English.
If the user speaks Hindi, respond in Hindi.
If the user mixes Hindi and English, naturally match that mixed style.
Do not unnecessarily translate the user's message.
Do not force English when the user is speaking Hinglish or Hindi.
Follow an explicit language request from the user.`,
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

// ======================================================
// 9. STUDY FROM SYLLABUS (Powered by Groq / Existing AI)
// ======================================================

export interface SyllabusStudyTopic {
  id: string;
  title: string;
  subtopics?: string[];
  estimatedMinutes?: number;
}

export interface SyllabusStudyUnit {
  id: string;
  unitNumber: number;
  title: string;
  description?: string;
  topics: SyllabusStudyTopic[];
}

export interface ParsedStudySyllabus {
  subject: string;
  courseCode?: string;
  units: SyllabusStudyUnit[];
  totalTopics: number;
  summary: string;
}

export interface SyllabusTopicQuizItem {
  question: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
}

export interface SyllabusTopicExamQuestion {
  question: string;
  marks?: number;
  modelAnswer: string;
  keyPoints: string[];
}

export interface SyllabusTopicLesson {
  topicName: string;
  unitName: string;
  subject: string;
  language: "english" | "hinglish";
  simpleExplanation: string;
  importantConcepts: string[];
  examOrientedPoints: string[];
  example?: string;
  importantDefinitions: Array<{ term: string; definition: string }>;
  possibleExamQuestions: SyllabusTopicExamQuestion[];
  shortRevision: string[];
  quickQuiz: SyllabusTopicQuizItem[];
}

export interface SyllabusCompletionSummary {
  subject: string;
  totalTopicsCovered: number;
  overallRevision: string[];
  importantExamTopics: Array<{
    topic: string;
    unit: string;
    whyImportant: string;
    examProbability: "High" | "Critical" | "Medium";
  }>;
  importantDefinitions: Array<{ term: string; definition: string }>;
  importantExamQuestions: Array<{
    question: string;
    marks: number;
    expectedLength: string;
    modelAnswer: string;
    keyPoints: string[];
  }>;
  finalMockQuiz: SyllabusTopicQuizItem[];
}

/**
 * Deterministic syllabus parser for text when AI extraction is unneeded or produces irregular formatting.
 * Recognizes diverse heading formats:
 * - Unit 1, UNIT-I, Unit I, Module 1, Module-I, Chapter 1, Course Unit 1, Section 1, Part 1
 * - Numbered headings (1. Heading, 1.1 Topic, etc.)
 * - Topic lists and bullet points
 */
export function parseSyllabusTextDeterministically(
  syllabusText: string,
  defaultSubject: string = "General"
): ParsedStudySyllabus | null {
  if (!syllabusText || syllabusText.trim().length < 15) return null;

  const lines = syllabusText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return null;

  // Regex patterns for unit/module/chapter/section boundaries
  const unitPatterns = [
    /^(?:unit|module|chapter|course\s+unit|part|section)\s*[-:#.]*\s*([0-9ivx]+|[a-z])\b\s*[:.-]?\s*(.*)$/i,
    /^(?:unit|module|chapter|part)\s*[:#-]\s*(.+)$/i,
    /^([0-9]{1,2})\.\s+([A-Z][A-Za-z0-9\s,–—\-&()]{3,})$/,
  ];

  interface RawUnitSection {
    unitNumber: number;
    title: string;
    rawLines: string[];
  }

  const rawUnits: RawUnitSection[] = [];
  let currentUnit: RawUnitSection | null = null;
  let unitCounter = 0;

  for (const line of lines) {
    let matchedUnit = false;

    for (const pattern of unitPatterns) {
      const m = line.match(pattern);
      if (m) {
        matchedUnit = true;
        unitCounter++;
        const rawNum = m[1];
        let parsedNum = unitCounter;
        if (rawNum) {
          const asInt = parseInt(rawNum, 10);
          if (!isNaN(asInt)) {
            parsedNum = asInt;
          } else if (/^[ivx]+$/i.test(rawNum)) {
            const romanMap: Record<string, number> = {
              i: 1,
              ii: 2,
              iii: 3,
              iv: 4,
              v: 5,
              vi: 6,
              vii: 7,
              viii: 8,
              ix: 9,
              x: 10,
            };
            parsedNum = romanMap[rawNum.toLowerCase()] || unitCounter;
          }
        }

        const titleSuffix = m[2] ? m[2].trim() : "";
        const title =
          line.length < 100
            ? line
            : titleSuffix
            ? `Unit ${parsedNum}: ${titleSuffix}`
            : `Unit ${parsedNum}`;

        currentUnit = {
          unitNumber: parsedNum,
          title: title.replace(/^[-:#.]+\s*/, "").trim(),
          rawLines: [],
        };
        rawUnits.push(currentUnit);
        break;
      }
    }

    if (!matchedUnit) {
      if (currentUnit) {
        currentUnit.rawLines.push(line);
      }
    }
  }

  // If no explicit unit headings matched, partition lines into logical units
  if (rawUnits.length === 0) {
    const meaningfulLines = lines.filter((l) => l.length > 3);
    if (meaningfulLines.length > 0) {
      const chunkSize = Math.max(3, Math.ceil(meaningfulLines.length / 4));
      let uIdx = 1;
      for (let i = 0; i < meaningfulLines.length; i += chunkSize) {
        const chunk = meaningfulLines.slice(i, i + chunkSize);
        rawUnits.push({
          unitNumber: uIdx,
          title: `Unit ${uIdx}: ${chunk[0]
            .replace(/^[-*•0-9.)]+\s*/, "")
            .slice(0, 50)}`,
          rawLines: chunk,
        });
        uIdx++;
      }
    }
  }

  if (rawUnits.length === 0) return null;

  let totalTopicCount = 0;
  const units: SyllabusStudyUnit[] = [];

  for (let uIdx = 0; uIdx < rawUnits.length; uIdx++) {
    const rUnit = rawUnits[uIdx];
    const uNum = rUnit.unitNumber || uIdx + 1;
    const extractedTopics: SyllabusStudyTopic[] = [];

    for (const rawLine of rUnit.rawLines) {
      let candidates: string[] = [rawLine];
      if (rawLine.includes(";") && rawLine.length > 60) {
        candidates = rawLine
          .split(";")
          .map((c) => c.trim())
          .filter((c) => c.length > 2);
      }

      for (const candidate of candidates) {
        const clean = candidate
          .replace(/^[-*•–—]\s*/, "")
          .replace(/^[0-9]+(?:\.[0-9]+)*[).]?\s*/, "")
          .trim();
        if (clean.length < 2) continue;

        let topicTitle = clean;
        let subtopics: string[] = [];

        if (clean.includes(":") && !clean.toLowerCase().startsWith("http")) {
          const parts = clean.split(":");
          const head = parts[0].trim();
          const tail = parts.slice(1).join(":").trim();
          if (head.length > 2 && head.length < 70 && tail.length > 0) {
            topicTitle = head;
            subtopics = tail
              .split(/[,;]/)
              .map((s) => s.trim())
              .filter((s) => s.length > 1 && s.length < 100);
          }
        } else if (clean.includes(" - ") && clean.length > 40) {
          const parts = clean.split(" - ");
          if (parts[0].trim().length < 60) {
            topicTitle = parts[0].trim();
            subtopics = parts
              .slice(1)
              .map((s) => s.trim())
              .filter((s) => s.length > 1);
          }
        }

        totalTopicCount++;
        extractedTopics.push({
          id: `unit-${uNum}-topic-${extractedTopics.length + 1}`,
          title: topicTitle,
          subtopics: subtopics,
          estimatedMinutes: Math.max(
            15,
            Math.min(45, 15 + subtopics.length * 5)
          ),
        });
      }
    }

    if (extractedTopics.length === 0) {
      totalTopicCount++;
      extractedTopics.push({
        id: `unit-${uNum}-topic-1`,
        title:
          rUnit.title.replace(/^Unit\s*[0-9]+[:\s-]*/i, "") ||
          `Core Concepts of Unit ${uNum}`,
        subtopics: [],
        estimatedMinutes: 25,
      });
    }

    units.push({
      id: `unit-${uNum}`,
      unitNumber: uNum,
      title: rUnit.title,
      description: `Covers ${extractedTopics.length} topics from ${rUnit.title}`,
      topics: extractedTopics,
    });
  }

  return {
    subject: defaultSubject,
    courseCode: "",
    summary: `Structured syllabus covering ${units.length} unit(s) and ${totalTopicCount} topic(s).`,
    units,
    totalTopics: totalTopicCount,
  };
}

/**
 * Parses raw syllabus text into structured units, chapters, and topics.
 * Strictly grounded in the provided syllabus text without hallucinating or inventing topics.
 */
export async function extractDetailedStudySyllabus(
  syllabusText: string,
  subject: string = "General"
): Promise<ParsedStudySyllabus> {
  // Strategy 1: AI structured extraction via Groq
  try {
    const result = await withRetry(async () => {
      const groq = getGroq();
      const res = await groq.chat.completions.create({
        model: GROQ_DEFAULT_MODEL,
        messages: [
          {
            role: "system",
            content: `You are an expert academic curriculum and syllabus parser.
Your task is to extract exact units/modules, chapters, topics, and subtopics from the uploaded syllabus.

CRITICAL GROUNDING AND EXTRACTION RULES:
1. Handle any heading style: "Unit 1", "UNIT-I", "Unit I", "Module 1", "Module-I", "Chapter 1", "Course Unit 1", "1. Title", "Topic:", or topic lists.
2. Stay strictly grounded in the syllabus text provided. DO NOT invent topics, chapters, or units not mentioned in the text.
3. If subtopics are not explicitly present in the text, leave the "subtopics" array empty ([]).
4. If a unit has multiple topics, extract each topic clearly.
5. Output ONLY a valid JSON object matching the requested schema. No markdown formatting, code fences, or explanation.`,
          },
          {
            role: "user",
            content: `Extract the syllabus structure for "${subject}".

Syllabus Content:
${syllabusText.slice(0, 8000)}

Return ONLY a valid JSON object matching this schema:
{
  "subject": "${subject}",
  "courseCode": "e.g. CS201 (if present in text)",
  "summary": "Brief 1-2 sentence overview of the syllabus scope",
  "units": [
    {
      "id": "unit-1",
      "unitNumber": 1,
      "title": "Unit 1: Name of Unit or Module",
      "description": "Brief description if present",
      "topics": [
        {
          "id": "topic-1-1",
          "title": "Exact topic title from syllabus",
          "subtopics": ["Subtopic 1", "Subtopic 2"],
          "estimatedMinutes": 20
        }
      ]
    }
  ],
  "totalTopics": 8
}`,
          },
        ],
        temperature: 0.1,
        max_tokens: 3500,
      });

      const raw = res.choices?.[0]?.message?.content || "";
      const parsed = safeJsonParse<ParsedStudySyllabus>(raw);

      if (!parsed || !Array.isArray(parsed.units) || parsed.units.length === 0) {
        return null;
      }

      let topicCount = 0;
      const formattedUnits: SyllabusStudyUnit[] = parsed.units.map((u, uIdx) => {
        const uNum = typeof u.unitNumber === "number" ? u.unitNumber : uIdx + 1;
        const rawTopics = (u.topics || []) as Array<SyllabusStudyTopic | string>;
        const unitTopics = Array.isArray(rawTopics)
          ? rawTopics
              .filter((t): t is SyllabusStudyTopic | string => {
                if (typeof t === "string") return t.trim().length > 0;
                return Boolean(t && typeof t.title === "string" && t.title.trim().length > 0);
              })
              .map((t, tIdx) => {
                topicCount++;
                const titleStr =
                  typeof t === "string"
                    ? t.trim()
                    : (t.title || `Topic ${tIdx + 1}`).trim();
                const subtopics =
                  typeof t === "object" && Array.isArray(t.subtopics)
                    ? t.subtopics
                    : [];
                const estMinutes =
                  typeof t === "object" && typeof t.estimatedMinutes === "number"
                    ? t.estimatedMinutes
                    : 20;

                return {
                  id:
                    typeof t === "object" && t.id
                      ? t.id
                      : `unit-${uNum}-topic-${tIdx + 1}`,
                  title: titleStr || `Topic ${tIdx + 1}`,
                  subtopics,
                  estimatedMinutes: estMinutes,
                };
              })
          : [];

        return {
          id: u.id || `unit-${uNum}`,
          unitNumber: uNum,
          title: u.title || `Unit ${uNum}`,
          description: u.description || "",
          topics: unitTopics,
        };
      });

      if (formattedUnits.length === 0 || topicCount === 0) {
        return null;
      }

      return {
        subject: parsed.subject || subject,
        courseCode: parsed.courseCode || "",
        summary:
          parsed.summary ||
          `Syllabus covering ${formattedUnits.length} units and ${topicCount} topics.`,
        units: formattedUnits,
        totalTopics: topicCount || parsed.totalTopics || 1,
      };
    });

    if (result && result.units.length > 0) {
      return result;
    }
  } catch (aiErr) {
    console.warn("Groq AI syllabus extraction encountered an error, falling back to deterministic parser:", aiErr);
  }

  // Strategy 2: Resilient deterministic text parser fallback
  const deterministicResult = parseSyllabusTextDeterministically(
    syllabusText,
    subject
  );
  if (deterministicResult && deterministicResult.units.length > 0) {
    return deterministicResult;
  }

  throw new Error(
    "Could not reliably extract structured syllabus units. Please ensure the syllabus contains readable text and topic headings."
  );
}

/**
 * Generates an 8-part exam preparation lesson for a specific syllabus topic.
 * Supports English and natural Indian Hinglish.
 */
export async function teachSyllabusTopic(input: {
  subject: string;
  unitTitle: string;
  topicTitle: string;
  subtopics?: string[];
  language: "english" | "hinglish";
  syllabusSummary?: string;
}): Promise<SyllabusTopicLesson> {
  return withRetry(async () => {
    const groq = getGroq();
    const isHinglish = input.language === "hinglish";

    const systemPrompt = isHinglish
      ? `You are PadhaiHub's friendly, expert Indian professor & exam coach.
You teach students in natural, conversational Indian Hinglish (a natural mix of Hindi in Roman script and English).
RULES FOR HINGLISH:
- Speak like a friendly college teacher: "Chalo ab is topic ko basic se samajhte hain...", "Yeh exam me aksar 5 marks ka aata hai...", "Dhyan se dekho..."
- Keep all technical terms, formulas, code, and academic keywords strictly in standard English (e.g., "Time Complexity", "Deadlock", "Primary Key", "Bernoulli Theorem").
- Do NOT translate technical definitions into Hindi awkwardly.
- Keep the tone super encouraging, clear, and exam-oriented.
- You MUST output ONLY valid JSON matching the exact schema with all 8 requested components. No markdown outside JSON.`
      : `You are PadhaiHub's top academic professor and exam mentor.
You teach students in clear, simple, high-yield exam-oriented English.
RULES FOR ENGLISH:
- Keep explanations crystal clear, engaging, and structured.
- Avoid unnecessarily dense jargon; explain concepts from first principles.
- Emphasize exam-scoring points, diagrams/flow representations, and frequent mistakes.
- You MUST output ONLY valid JSON matching the exact schema with all 8 requested components. No markdown outside JSON.`;

    const userPrompt = `Teach the syllabus topic: "${input.topicTitle}"
From Unit/Module: "${input.unitTitle}"
Subject: "${input.subject}"
${input.subtopics && input.subtopics.length > 0 ? `Subtopics to cover: ${input.subtopics.join(", ")}` : ""}

Generate a complete, high-yield lesson strictly adhering to this 8-part structure in ${isHinglish ? "Hinglish" : "English"}:
1. Simple Explanation (Comprehensive yet easy to grasp, explaining what it is and why it matters)
2. Important Concepts (Bullet points of core principles, working, mechanisms)
3. Exam-Oriented Points (High-probability exam scoring tips, common pitfalls, diagram suggestions)
4. Example (A clear real-world, numerical, or code/practical example demonstrating the topic)
5. Important Definitions (Key technical terms and crisp 1-2 sentence definitions)
6. Possible Exam Questions (2-3 realistic semester exam questions with marks weightage and detailed model answers)
7. Short Revision (3-5 lightning-fast bullet points to review right before entering the exam hall)
8. Quick Quiz (3 multiple choice questions with 4 options each, the 0-indexed correct answer index, and a clear explanation)

Return ONLY a valid JSON object matching this schema:
{
  "topicName": "${input.topicTitle}",
  "unitName": "${input.unitTitle}",
  "subject": "${input.subject}",
  "language": "${input.language}",
  "simpleExplanation": "Detailed, friendly explanation text...",
  "importantConcepts": ["Concept 1...", "Concept 2...", "Concept 3..."],
  "examOrientedPoints": ["Exam point 1...", "Exam point 2...", "Exam point 3..."],
  "example": "Practical / Real-world / Numerical example illustrating the concept...",
  "importantDefinitions": [
    {"term": "Term 1", "definition": "Crisp definition..."},
    {"term": "Term 2", "definition": "Crisp definition..."}
  ],
  "possibleExamQuestions": [
    {
      "question": "Explain [Topic] with diagram / derivation (5/10 Marks)",
      "marks": 5,
      "modelAnswer": "Structured model answer addressing the question thoroughly...",
      "keyPoints": ["Key point to write 1", "Key point to write 2"]
    }
  ],
  "shortRevision": [
    "Quick takeaway 1",
    "Quick takeaway 2",
    "Quick takeaway 3"
  ],
  "quickQuiz": [
    {
      "question": "Conceptual question based on this topic?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswerIndex": 0,
      "explanation": "Why Option A is correct..."
    }
  ]
}`;

    const res = await groq.chat.completions.create({
      model: GROQ_DEFAULT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 3500,
    });

    const raw = res.choices?.[0]?.message?.content || "";
    const parsed = safeJsonParse<SyllabusTopicLesson>(raw);

    if (!parsed || !parsed.simpleExplanation) {
      throw new Error("Failed to generate comprehensive topic lesson from AI.");
    }

    return {
      topicName: parsed.topicName || input.topicTitle,
      unitName: parsed.unitName || input.unitTitle,
      subject: parsed.subject || input.subject,
      language: input.language,
      simpleExplanation: parsed.simpleExplanation || "Topic explanation.",
      importantConcepts: Array.isArray(parsed.importantConcepts) ? parsed.importantConcepts : [],
      examOrientedPoints: Array.isArray(parsed.examOrientedPoints) ? parsed.examOrientedPoints : [],
      example: parsed.example || undefined,
      importantDefinitions: Array.isArray(parsed.importantDefinitions) ? parsed.importantDefinitions : [],
      possibleExamQuestions: Array.isArray(parsed.possibleExamQuestions) ? parsed.possibleExamQuestions : [],
      shortRevision: Array.isArray(parsed.shortRevision) ? parsed.shortRevision : [],
      quickQuiz: Array.isArray(parsed.quickQuiz) ? parsed.quickQuiz : [],
    };
  });
}

/**
 * Generates the final comprehensive syllabus completion package when all topics are finished.
 */
export async function generateSyllabusCompletion(input: {
  subject: string;
  units: SyllabusStudyUnit[];
  language: "english" | "hinglish";
}): Promise<SyllabusCompletionSummary> {
  return withRetry(async () => {
    const groq = getGroq();
    const isHinglish = input.language === "hinglish";

    const topicsList = input.units.flatMap((u) =>
      u.topics.map((t) => `${u.title}: ${t.title}`)
    );

    const systemPrompt = isHinglish
      ? "You are PadhaiHub's chief academic mentor. Deliver the final syllabus completion package in natural, encouraging Hinglish with technical terms in English."
      : "You are PadhaiHub's chief academic mentor. Deliver the final comprehensive exam revision package in clear, high-yield English.";

    const userPrompt = `The student has completed ALL topics in the syllabus for: "${input.subject}".

Syllabus Topics Covered:
${topicsList.slice(0, 30).join("\n")}

Provide the grand final syllabus completion package:
1. Complete syllabus revision summary (5-8 high-yield holistic revision points)
2. Most important high-probability exam topics across all units
3. Essential definitions glossary across all units
4. Top semester exam questions with expected length and model key points
5. Final Comprehensive Mock Quiz (5 multi-unit questions)

Return ONLY a valid JSON object matching this schema:
{
  "subject": "${input.subject}",
  "totalTopicsCovered": ${topicsList.length},
  "overallRevision": ["Overall revision point 1...", "Overall revision point 2..."],
  "importantExamTopics": [
    {
      "topic": "Topic Name",
      "unit": "Unit Name",
      "whyImportant": "Why examiners frequently ask this",
      "examProbability": "Critical"
    }
  ],
  "importantDefinitions": [
    {"term": "Term 1", "definition": "Crisp definition..."}
  ],
  "importantExamQuestions": [
    {
      "question": "Important question?",
      "marks": 10,
      "expectedLength": "Long Answer (3 pages)",
      "modelAnswer": "Comprehensive model response outline...",
      "keyPoints": ["Point 1", "Point 2"]
    }
  ],
  "finalMockQuiz": [
    {
      "question": "Comprehensive question?",
      "options": ["A", "B", "C", "D"],
      "correctAnswerIndex": 0,
      "explanation": "Why A is correct"
    }
  ]
}`;

    const res = await groq.chat.completions.create({
      model: GROQ_DEFAULT_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
      max_tokens: 3500,
    });

    const raw = res.choices?.[0]?.message?.content || "";
    const parsed = safeJsonParse<SyllabusCompletionSummary>(raw);

    if (!parsed || !Array.isArray(parsed.overallRevision)) {
      throw new Error("Failed to generate final syllabus completion summary.");
    }

    return {
      subject: parsed.subject || input.subject,
      totalTopicsCovered: topicsList.length,
      overallRevision: parsed.overallRevision || [],
      importantExamTopics: Array.isArray(parsed.importantExamTopics) ? parsed.importantExamTopics : [],
      importantDefinitions: Array.isArray(parsed.importantDefinitions) ? parsed.importantDefinitions : [],
      importantExamQuestions: Array.isArray(parsed.importantExamQuestions) ? parsed.importantExamQuestions : [],
      finalMockQuiz: Array.isArray(parsed.finalMockQuiz) ? parsed.finalMockQuiz : [],
    };
  });
}
