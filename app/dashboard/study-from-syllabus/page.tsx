// app/dashboard/study-from-syllabus/page.tsx
"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  GraduationCap,
  Upload,
  FileText,
  CheckCircle2,
  Circle,
  ArrowRight,
  RotateCcw,
  BookOpen,
  Sparkles,
  Award,
  ChevronRight,
  ChevronDown,
  HelpCircle,
  Lightbulb,
  Target,
  FileQuestion,
  Bookmark,
  Check,
  X,
  Languages,
  Layers,
  Clock,
  Play,
  RotateCw,
  FolderOpen,
  ArrowLeft,
  Share2,
  Download,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/lib/auth-context";
import {
  saveStudySyllabusSession,
  updateStudySyllabusSession,
  getUserStudySyllabusSessions,
  incrementUserProfileField,
} from "@/firebase/firestore";
import { toast } from "sonner";
import {
  ParsedStudySyllabus,
  SyllabusStudyUnit,
  SyllabusStudyTopic,
  SyllabusTopicLesson,
  SyllabusCompletionSummary,
  SyllabusTopicQuizItem,
} from "@/services/ai";

const STORAGE_KEY = "padhaihub_active_syllabus_session";

type CoverageMode = "one-by-one" | "unit-by-unit";
type StudyLanguage = "english" | "hinglish";
type ViewStep = "upload" | "setup" | "learning" | "completed";

interface ActiveSessionData {
  id?: string;
  subject: string;
  courseCode?: string;
  summary?: string;
  units: SyllabusStudyUnit[];
  totalTopics: number;
  completedTopicIds: string[];
  currentUnitId: string;
  currentTopicId: string;
  coverageMode: CoverageMode;
  language: StudyLanguage;
}

export default function StudyFromSyllabusPage() {
  const { user, dailyUsage, refreshDailyUsage, refreshProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Flow State
  const [viewStep, setViewStep] = useState<ViewStep>("upload");
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [parsingProgress, setParsingProgress] = useState(0);

  // Upload/Input State
  const [subjectName, setSubjectName] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedSyllabus, setParsedSyllabus] = useState<ParsedStudySyllabus | null>(null);

  // Session Preferences
  const [coverageMode, setCoverageMode] = useState<CoverageMode>("one-by-one");
  const [teachingLanguage, setTeachingLanguage] = useState<StudyLanguage>("english");

  // Active Session State
  const [session, setSession] = useState<ActiveSessionData | null>(null);
  const [currentLesson, setCurrentLesson] = useState<SyllabusTopicLesson | null>(null);
  const [lessonLoading, setLessonLoading] = useState(false);
  const [completionSummary, setCompletionSummary] = useState<SyllabusCompletionSummary | null>(null);
  const [completionLoading, setCompletionLoading] = useState(false);

  // Quiz State
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState<number | null>(null);

  // Final Quiz State
  const [finalQuizAnswers, setFinalQuizAnswers] = useState<Record<number, number>>({});
  const [finalQuizSubmitted, setFinalQuizSubmitted] = useState(false);
  const [finalQuizScore, setFinalQuizScore] = useState<number | null>(null);

  // Saved Past Sessions for Quick Resume
  const [savedSessions, setSavedSessions] = useState<any[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [expandedUnitIds, setExpandedUnitIds] = useState<Record<string, boolean>>({});

  // 1. Initial Local / Firestore Sync for Resuming
  useEffect(() => {
    try {
      const localCached = localStorage.getItem(STORAGE_KEY);
      if (localCached) {
        const parsed = JSON.parse(localCached) as ActiveSessionData;
        if (parsed && parsed.units && parsed.units.length > 0) {
          // If in valid session state
          setSession(parsed);
          setCoverageMode(parsed.coverageMode || "one-by-one");
          setTeachingLanguage(parsed.language || "english");
          setSubjectName(parsed.subject || "");
        }
      }
    } catch {
      // Local storage parse error ignored
    }
  }, []);

  // 2. Fetch User's Saved Sessions from Firestore
  useEffect(() => {
    if (user?.uid) {
      setLoadingSaved(true);
      getUserStudySyllabusSessions(user.uid)
        .then((sessions) => {
          setSavedSessions(sessions);
        })
        .catch((err) => {
          console.warn("Could not load saved syllabus sessions:", err);
        })
        .finally(() => {
          setLoadingSaved(false);
        });
    }
  }, [user?.uid]);

  // Expand current active unit in sidebar
  useEffect(() => {
    if (session?.currentUnitId) {
      setExpandedUnitIds((prev) => ({ ...prev, [session.currentUnitId]: true }));
    }
  }, [session?.currentUnitId]);

  // Compute all topics in flat sequence
  const allFlattenedTopics = useMemo(() => {
    if (!session?.units) return [];
    const list: Array<{
      unitId: string;
      unitNumber: number;
      unitTitle: string;
      topic: SyllabusStudyTopic;
      globalIndex: number;
    }> = [];

    let count = 0;
    session.units.forEach((u) => {
      u.topics.forEach((t) => {
        list.push({
          unitId: u.id,
          unitNumber: u.unitNumber,
          unitTitle: u.title,
          topic: t,
          globalIndex: count++,
        });
      });
    });
    return list;
  }, [session?.units]);

  // Current active topic item
  const currentTopicItem = useMemo(() => {
    if (!session || !allFlattenedTopics.length) return null;
    return (
      allFlattenedTopics.find(
        (item) => item.topic.id === session.currentTopicId
      ) || allFlattenedTopics[0]
    );
  }, [session, allFlattenedTopics]);

  // Calculate Progress Percent
  const progressPercent = useMemo(() => {
    if (!session || !session.totalTopics) return 0;
    const completedCount = session.completedTopicIds?.length || 0;
    return Math.min(100, Math.round((completedCount / session.totalTopics) * 100));
  }, [session]);

  // Save session state to local storage and sync to Firestore
  const persistSession = (updatedSession: ActiveSessionData) => {
    setSession(updatedSession);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSession));
    } catch {}

    if (user?.uid && updatedSession.id) {
      updateStudySyllabusSession(updatedSession.id, {
        completedTopicIds: updatedSession.completedTopicIds,
        currentUnitId: updatedSession.currentUnitId,
        currentTopicId: updatedSession.currentTopicId,
        language: updatedSession.language,
        coverageMode: updatedSession.coverageMode,
      }).catch((err) => console.warn("Firestore update error:", err));
    }
  };

  // =========================================================================
  // FILE SELECTION & UPLOAD HANDLERS
  // =========================================================================

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf") && !file.type.startsWith("text/")) {
      toast.error("Please upload a PDF or TXT syllabus file");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      toast.error("File size must be under 15MB");
      return;
    }

    setSelectedFile(file);
    if (!subjectName && file.name) {
      const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
      setSubjectName(cleanName);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf") && !file.type.startsWith("text/")) {
      toast.error("Please drop a PDF or TXT syllabus file");
      return;
    }
    setSelectedFile(file);
    if (!subjectName && file.name) {
      const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
      setSubjectName(cleanName);
    }
  };

  // Start Parsing Syllabus PDF
  const handleParseSyllabus = async () => {
    if (!selectedFile) {
      toast.error("Please select a syllabus PDF first");
      return;
    }

    try {
      setLoading(true);
      setLoadingMessage("Reading syllabus document and extracting modules...");
      setParsingProgress(25);

      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("subject", subjectName.trim() || "Course Syllabus");
      if (user?.uid) {
        formData.append("uid", user.uid);
      }

      setParsingProgress(50);
      setLoadingMessage("Structuring units, chapters, and topics with AI...");

      const headers: Record<string, string> = {};
      if (user) {
        try {
          const token = await user.getIdToken();
          if (token) headers["Authorization"] = `Bearer ${token}`;
        } catch {}
      }

      const res = await fetch("/api/ai/study-from-syllabus/parse", {
        method: "POST",
        headers,
        body: formData,
      });

      setParsingProgress(85);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to process syllabus PDF.");
      }

      const parsed: ParsedStudySyllabus = data.data;
      if (!parsed.units || parsed.units.length === 0) {
        throw new Error("No structured units could be found in the uploaded syllabus.");
      }

      setParsedSyllabus(parsed);
      if (parsed.subject && !subjectName) {
        setSubjectName(parsed.subject);
      }

      // Refresh daily usage limit display
      if (user?.uid) {
        refreshDailyUsage();
        refreshProfile();
      }

      setParsingProgress(100);
      setViewStep("setup");
      toast.success(`Extracted ${parsed.units.length} units and ${parsed.totalTopics} topics from syllabus!`);
    } catch (err: any) {
      console.error("Parse syllabus error:", err);
      toast.error(err.message || "Could not read syllabus. Please try again.");
    } finally {
      setLoading(false);
      setParsingProgress(0);
      setLoadingMessage("");
    }
  };

  // =========================================================================
  // START STUDY SESSION
  // =========================================================================

  const handleStartStudySession = async () => {
    if (!parsedSyllabus || !parsedSyllabus.units.length) {
      toast.error("Please parse a syllabus first");
      return;
    }

    const firstUnit = parsedSyllabus.units[0];
    const firstTopic = firstUnit.topics[0];

    if (!firstTopic) {
      toast.error("No topics found in the first unit");
      return;
    }

    const newSessionData: ActiveSessionData = {
      subject: subjectName || parsedSyllabus.subject || "Course Syllabus",
      courseCode: parsedSyllabus.courseCode,
      summary: parsedSyllabus.summary,
      units: parsedSyllabus.units,
      totalTopics: parsedSyllabus.totalTopics,
      completedTopicIds: [],
      currentUnitId: firstUnit.id,
      currentTopicId: firstTopic.id,
      coverageMode,
      language: teachingLanguage,
    };

    // Save to Firestore if user is authenticated
    if (user?.uid) {
      try {
        const firestoreId = await saveStudySyllabusSession(user.uid, {
          subject: newSessionData.subject,
          courseCode: newSessionData.courseCode,
          units: newSessionData.units as any,
          totalTopics: newSessionData.totalTopics,
          completedTopicIds: [],
          currentUnitId: firstUnit.id,
          currentTopicId: firstTopic.id,
          language: teachingLanguage,
          coverageMode,
          summary: newSessionData.summary,
        });
        if (firestoreId) {
          newSessionData.id = firestoreId;
        }
      } catch (err) {
        console.warn("Could not save session to Firestore:", err);
      }
    }

    persistSession(newSessionData);
    setViewStep("learning");
    loadTopicLesson(firstTopic, firstUnit.title, newSessionData.subject, teachingLanguage);
  };

  // =========================================================================
  // FETCH / TEACH SPECIFIC TOPIC
  // =========================================================================

  const loadTopicLesson = async (
    topic: SyllabusStudyTopic,
    unitTitle: string,
    subject: string,
    language: StudyLanguage
  ) => {
    try {
      setLessonLoading(true);
      setQuizAnswers({});
      setQuizSubmitted(false);
      setQuizScore(null);

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (user) {
        try {
          const token = await user.getIdToken();
          if (token) headers["Authorization"] = `Bearer ${token}`;
        } catch {}
      }

      const res = await fetch("/api/ai/study-from-syllabus/teach-topic", {
        method: "POST",
        headers,
        body: JSON.stringify({
          subject,
          unitTitle,
          topicTitle: topic.title,
          subtopics: topic.subtopics,
          language,
          uid: user?.uid,
          syllabusSummary: session?.summary,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to generate topic lesson.");
      }

      setCurrentLesson(json.data);

      if (user?.uid) {
        incrementUserProfileField(user.uid, "aiUsageCount", 1);
        refreshDailyUsage();
      }
    } catch (err: any) {
      console.error("Load topic lesson error:", err);
      toast.error(err.message || "Failed to prepare topic lesson. Please try again.");
    } finally {
      setLessonLoading(false);
    }
  };

  // Change to another topic directly
  const handleSelectTopic = (unit: SyllabusStudyUnit, topic: SyllabusStudyTopic) => {
    if (!session) return;
    const updated = {
      ...session,
      currentUnitId: unit.id,
      currentTopicId: topic.id,
    };
    persistSession(updated);
    loadTopicLesson(topic, unit.title, session.subject, session.language);
  };

  // =========================================================================
  // TOPIC PROGRESSION & QUIZ LOGIC
  // =========================================================================

  const handleQuizAnswer = (qIndex: number, optionIndex: number) => {
    if (quizSubmitted) return;
    setQuizAnswers((prev) => ({ ...prev, [qIndex]: optionIndex }));
  };

  const handleQuizSubmit = () => {
    if (!currentLesson?.quickQuiz?.length) return;
    let score = 0;
    currentLesson.quickQuiz.forEach((q, idx) => {
      if (quizAnswers[idx] === q.correctAnswerIndex) {
        score++;
      }
    });
    setQuizScore(score);
    setQuizSubmitted(true);

    if (score === currentLesson.quickQuiz.length) {
      toast.success("Perfect score on Quick Quiz! 🎉");
    } else {
      toast.info(`You scored ${score}/${currentLesson.quickQuiz.length} on the quiz.`);
    }
  };

  const handleRetakeQuiz = () => {
    setQuizAnswers({});
    setQuizSubmitted(false);
    setQuizScore(null);
  };

  const handleReviseCurrentTopic = () => {
    if (!currentTopicItem || !session) return;
    loadTopicLesson(
      currentTopicItem.topic,
      currentTopicItem.unitTitle,
      session.subject,
      session.language
    );
    toast.info("Regenerating a fresh revision view for this topic...");
  };

  // Advance to Next Topic
  const handleNextTopic = () => {
    if (!session || !currentTopicItem) return;

    // 1. Mark current topic as completed
    const currentTopicId = currentTopicItem.topic.id;
    const newCompleted = Array.from(new Set([...session.completedTopicIds, currentTopicId]));

    // 2. Check if all topics are finished
    if (newCompleted.length >= session.totalTopics) {
      const finishedSession = {
        ...session,
        completedTopicIds: newCompleted,
      };
      persistSession(finishedSession);
      triggerSyllabusCompletion(finishedSession);
      return;
    }

    // 3. Find next topic based on coverage mode
    let nextItem = null;

    if (session.coverageMode === "unit-by-unit") {
      // Find remaining topics in current unit first
      const currentUnit = session.units.find((u) => u.id === session.currentUnitId);
      const remainingInUnit = currentUnit?.topics.find(
        (t) => !newCompleted.includes(t.id) && t.id !== currentTopicId
      );

      if (remainingInUnit && currentUnit) {
        nextItem = {
          unitId: currentUnit.id,
          unitTitle: currentUnit.title,
          topic: remainingInUnit,
        };
      }
    }

    if (!nextItem) {
      // Find next sequentially uncompleted topic
      const currentIndex = allFlattenedTopics.findIndex(
        (item) => item.topic.id === currentTopicId
      );

      // Look forward
      for (let i = currentIndex + 1; i < allFlattenedTopics.length; i++) {
        if (!newCompleted.includes(allFlattenedTopics[i].topic.id)) {
          nextItem = allFlattenedTopics[i];
          break;
        }
      }

      // If none found forward, search from beginning
      if (!nextItem) {
        nextItem = allFlattenedTopics.find(
          (item) => !newCompleted.includes(item.topic.id)
        );
      }
    }

    if (nextItem) {
      const updated = {
        ...session,
        completedTopicIds: newCompleted,
        currentUnitId: nextItem.unitId,
        currentTopicId: nextItem.topic.id,
      };
      persistSession(updated);
      toast.success(`Completed "${currentTopicItem.topic.title}"! Moving to next topic.`);
      loadTopicLesson(nextItem.topic, nextItem.unitTitle, session.subject, session.language);
    } else {
      // All completed
      const finishedSession = {
        ...session,
        completedTopicIds: newCompleted,
      };
      persistSession(finishedSession);
      triggerSyllabusCompletion(finishedSession);
    }
  };

  // =========================================================================
  // SYLLABUS COMPLETION GENERATION
  // =========================================================================

  const triggerSyllabusCompletion = async (completedSession: ActiveSessionData) => {
    setViewStep("completed");
    setCompletionLoading(true);

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (user) {
        try {
          const token = await user.getIdToken();
          if (token) headers["Authorization"] = `Bearer ${token}`;
        } catch {}
      }

      const res = await fetch("/api/ai/study-from-syllabus/completion", {
        method: "POST",
        headers,
        body: JSON.stringify({
          subject: completedSession.subject,
          units: completedSession.units,
          language: completedSession.language,
          uid: user?.uid,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to generate completion summary.");
      }

      setCompletionSummary(json.data);
      toast.success("🎉 Full Syllabus Completed! Exam Revision Package Generated!");
      if (user?.uid) {
        incrementUserProfileField(user.uid, "aiUsageCount", 1);
        refreshDailyUsage();
      }
    } catch (err: any) {
      console.error("Completion error:", err);
      toast.error(err.message || "Failed to generate completion summary.");
    } finally {
      setCompletionLoading(false);
    }
  };

  // Resume a past saved session
  const handleResumeSavedSession = (saved: any) => {
    const resumeData: ActiveSessionData = {
      id: saved.id,
      subject: saved.subject || "Course Syllabus",
      courseCode: saved.courseCode,
      summary: saved.summary,
      units: saved.units || [],
      totalTopics: saved.totalTopics || 1,
      completedTopicIds: saved.completedTopicIds || [],
      currentUnitId: saved.currentUnitId || saved.units?.[0]?.id,
      currentTopicId: saved.currentTopicId || saved.units?.[0]?.topics?.[0]?.id,
      coverageMode: saved.coverageMode || "one-by-one",
      language: saved.language || "english",
    };

    persistSession(resumeData);
    setSubjectName(resumeData.subject);
    setCoverageMode(resumeData.coverageMode);
    setTeachingLanguage(resumeData.language);

    if (resumeData.completedTopicIds.length >= resumeData.totalTopics) {
      triggerSyllabusCompletion(resumeData);
    } else {
      setViewStep("learning");
      const unit = resumeData.units.find((u) => u.id === resumeData.currentUnitId) || resumeData.units[0];
      const topic = unit?.topics.find((t) => t.id === resumeData.currentTopicId) || unit?.topics[0];
      if (topic && unit) {
        loadTopicLesson(topic, unit.title, resumeData.subject, resumeData.language);
      }
    }
  };

  // Reset / Start Fresh
  const handleStartNewSyllabus = () => {
    localStorage.removeItem(STORAGE_KEY);
    setSession(null);
    setParsedSyllabus(null);
    setSelectedFile(null);
    setSubjectName("");
    setCurrentLesson(null);
    setCompletionSummary(null);
    setViewStep("upload");
  };

  // Toggle unit accordion in sidebar
  const toggleUnitExpand = (unitId: string) => {
    setExpandedUnitIds((prev) => ({ ...prev, [unitId]: !prev[unitId] }));
  };

  // =========================================================================
  // RENDER: STEP 1 - UPLOAD SCREEN
  // =========================================================================
  if (viewStep === "upload") {
    return (
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-indigo-900/40 via-violet-900/30 to-zinc-900/60 border border-indigo-500/20 rounded-2xl p-6 relative overflow-hidden backdrop-blur-sm">
          <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold">
                <GraduationCap className="w-3.5 h-3.5" />
                Structured Exam Preparation
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
                Study From Syllabus
              </h1>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 max-w-2xl leading-relaxed">
                Upload your official syllabus PDF. PadhaiHub extracts every unit, chapter, and topic, teaching you systematically in English or natural Indian Hinglish with exam-oriented explanations, definitions, and quick quizzes.
              </p>
            </div>

            {session && (
              <div className="shrink-0 bg-white/5 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 text-center md:text-right">
                <p className="text-xs text-zinc-400">Active Syllabus Found</p>
                <p className="text-sm font-semibold text-indigo-400 truncate max-w-[200px]">
                  {session.subject}
                </p>
                <div className="mt-2 flex items-center justify-center md:justify-end gap-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      setViewStep("learning");
                      if (currentTopicItem) {
                        loadTopicLesson(
                          currentTopicItem.topic,
                          currentTopicItem.unitTitle,
                          session.subject,
                          session.language
                        );
                      }
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8"
                  >
                    Resume Study ({progressPercent}%)
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Upload Container */}
        <div className="bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-6">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Upload className="w-5 h-5 text-indigo-500" />
              1. Upload Course Syllabus
            </h2>

            {/* Subject / Course Name Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Course / Subject Name (Optional)
              </label>
              <input
                type="text"
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                placeholder="e.g. Operating Systems, Data Structures, Marketing Management, Engineering Physics..."
                className="w-full px-4 py-2.5 rounded-xl text-sm bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-colors placeholder:text-zinc-400"
              />
            </div>

            {/* Drag & Drop Box */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                selectedFile
                  ? "border-indigo-500/60 bg-indigo-50/30 dark:bg-indigo-950/20"
                  : "border-zinc-300 dark:border-zinc-800 hover:border-indigo-400 dark:hover:border-indigo-600 bg-zinc-50/50 dark:bg-zinc-950/40"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf,text/plain"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="flex flex-col items-center justify-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  {selectedFile ? <FileText className="w-6 h-6" /> : <Upload className="w-6 h-6" />}
                </div>

                {selectedFile ? (
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Ready to analyze
                    </p>
                    <span className="inline-block mt-2 text-xs text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
                      Click to change file
                    </span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                      Drop your syllabus PDF here, or <span className="text-indigo-600 dark:text-indigo-400">browse file</span>
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      Supports selectable digital PDFs & text files (Max 15MB)
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Daily limit badge info */}
            {dailyUsage && (
              <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 pt-1">
                <span>Daily PDF analysis quota:</span>
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  {dailyUsage.pdfRemaining} of {dailyUsage.maxPdf} remaining today
                </span>
              </div>
            )}

            {/* Action Button */}
            <div className="pt-2">
              <Button
                onClick={handleParseSyllabus}
                disabled={!selectedFile || loading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-xl text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {loadingMessage || "Reading Syllabus..."}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Extract Syllabus Structure
                  </>
                )}
              </Button>
            </div>

            {loading && parsingProgress > 0 && (
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between text-xs text-zinc-500">
                  <span>{loadingMessage}</span>
                  <span>{parsingProgress}%</span>
                </div>
                <Progress value={parsingProgress} className="h-1.5" />
              </div>
            )}
          </div>
        </div>

        {/* Saved Sessions for Quick Resume */}
        {savedSessions.length > 0 && (
          <div className="bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-indigo-500" />
              Your Saved Syllabus Sessions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {savedSessions.map((item) => {
                const total = item.totalTopics || item.units?.reduce((acc: number, u: any) => acc + (u.topics?.length || 0), 0) || 1;
                const completed = item.completedTopicIds?.length || 0;
                const pct = Math.min(100, Math.round((completed / total) * 100));

                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 hover:border-indigo-500/40 transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                        {item.subject || "Course Syllabus"}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500">
                        <span>{item.units?.length || 0} Units</span>
                        <span>•</span>
                        <span>{completed}/{total} Topics</span>
                        <span>•</span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {item.language === "hinglish" ? "🇮🇳 Hinglish" : "🇬🇧 English"}
                        </Badge>
                      </div>
                      <div className="mt-2 w-full max-w-[180px]">
                        <Progress value={pct} className="h-1" />
                      </div>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => handleResumeSavedSession(item)}
                      className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8 px-3"
                    >
                      {pct >= 100 ? "View Package" : "Continue"}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // =========================================================================
  // RENDER: STEP 2 - SYLLABUS SETUP / PREFERENCES SCREEN
  // =========================================================================
  if (viewStep === "setup" && parsedSyllabus) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Back button & Title */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setViewStep("upload")}
            className="text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Upload Different Syllabus
          </button>
          <Badge className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            Syllabus Verified
          </Badge>
        </div>

        {/* Extracted Structure Overview */}
        <div className="bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              {subjectName || parsedSyllabus.subject}
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {parsedSyllabus.summary || `Extracted ${parsedSyllabus.units.length} units and ${parsedSyllabus.totalTopics} topics from your syllabus.`}
            </p>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
              <span className="text-xs text-zinc-500">Total Units</span>
              <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                {parsedSyllabus.units.length} Units
              </p>
            </div>
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
              <span className="text-xs text-zinc-500">Total Topics</span>
              <p className="text-lg font-bold text-violet-600 dark:text-violet-400">
                {parsedSyllabus.totalTopics} Topics
              </p>
            </div>
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 col-span-2 sm:col-span-1">
              <span className="text-xs text-zinc-500">Grounding</span>
              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-0.5">
                <CheckCircle2 className="w-4 h-4" /> 100% Grounded
              </p>
            </div>
          </div>

          {/* Collapsible Units Preview */}
          <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">
              Extracted Curriculum
            </p>
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {parsedSyllabus.units.map((unit, uIdx) => (
                <div
                  key={unit.id || uIdx}
                  className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-950/40 text-xs"
                >
                  <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {unit.title}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {unit.topics.map((top, tIdx) => (
                      <span
                        key={top.id || tIdx}
                        className="px-2 py-0.5 rounded-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"
                      >
                        {top.title}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Step 5: Coverage Mode Option */}
        <div className="bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-500" />
              How do you want to cover your syllabus?
            </h3>
            <p className="text-xs text-zinc-500">
              Select how you would like to pace your study sessions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div
              onClick={() => setCoverageMode("one-by-one")}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3.5 ${
                coverageMode === "one-by-one"
                  ? "border-indigo-600 bg-indigo-50/30 dark:bg-indigo-950/30"
                  : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                  coverageMode === "one-by-one"
                    ? "border-indigo-600 bg-indigo-600 text-white"
                    : "border-zinc-400"
                }`}
              >
                {coverageMode === "one-by-one" && <Check className="w-3 h-3" />}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  1. One by One (Default)
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Complete every topic in chronological order across the entire syllabus.
                </p>
              </div>
            </div>

            <div
              onClick={() => setCoverageMode("unit-by-unit")}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3.5 ${
                coverageMode === "unit-by-unit"
                  ? "border-indigo-600 bg-indigo-50/30 dark:bg-indigo-950/30"
                  : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                  coverageMode === "unit-by-unit"
                    ? "border-indigo-600 bg-indigo-600 text-white"
                    : "border-zinc-400"
                }`}
              >
                {coverageMode === "unit-by-unit" && <Check className="w-3 h-3" />}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  2. Unit by Unit
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Complete all topics of a unit before moving on to the next unit.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Step 6: Language Preference Option */}
        <div className="bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Languages className="w-5 h-5 text-indigo-500" />
              How should I teach you?
            </h3>
            <p className="text-xs text-zinc-500">
              Choose your preferred language for explanations and coaching.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div
              onClick={() => setTeachingLanguage("english")}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3.5 ${
                teachingLanguage === "english"
                  ? "border-indigo-600 bg-indigo-50/30 dark:bg-indigo-950/30"
                  : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                  teachingLanguage === "english"
                    ? "border-indigo-600 bg-indigo-600 text-white"
                    : "border-zinc-400"
                }`}
              >
                {teachingLanguage === "english" && <Check className="w-3 h-3" />}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  🇬🇧 English
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Clear, exam-oriented explanations in simple, structured English.
                </p>
              </div>
            </div>

            <div
              onClick={() => setTeachingLanguage("hinglish")}
              className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-start gap-3.5 ${
                teachingLanguage === "hinglish"
                  ? "border-indigo-600 bg-indigo-50/30 dark:bg-indigo-950/30"
                  : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                  teachingLanguage === "hinglish"
                    ? "border-indigo-600 bg-indigo-600 text-white"
                    : "border-zinc-400"
                }`}
              >
                {teachingLanguage === "hinglish" && <Check className="w-3 h-3" />}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  🇮🇳 Hinglish
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Friendly Indian teacher style (Hindi + English) with technical terms preserved in English.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Start Button */}
        <div className="pt-2">
          <Button
            onClick={handleStartStudySession}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3.5 rounded-xl text-base flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25"
          >
            <Play className="w-5 h-5 fill-current" />
            Start Syllabus Preparation
          </Button>
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDER: STEP 3 - ACTIVE LEARNING SESSION
  // =========================================================================
  if (viewStep === "learning" && session) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-4 space-y-4">
        {/* Top Header Bar with Progress */}
        <div className="bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 md:p-5 shadow-sm space-y-3">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-indigo-500/10 text-indigo-500 border border-indigo-500/30 text-xs">
                  {session.language === "hinglish" ? "🇮🇳 Hinglish" : "🇬🇧 English"}
                </Badge>
                <Badge variant="outline" className="text-xs text-zinc-500">
                  {session.coverageMode === "unit-by-unit" ? "Unit by Unit" : "One by One"}
                </Badge>
                <span className="text-xs text-zinc-400">
                  {session.completedTopicIds.length} of {session.totalTopics} Topics Completed
                </span>
              </div>
              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                {session.subject}
              </h1>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleStartNewSyllabus}
                className="text-xs h-8 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400"
              >
                Change Syllabus
              </Button>
            </div>
          </div>

          {/* Syllabus Progress Bar */}
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-zinc-700 dark:text-zinc-300">
                Syllabus Progress
              </span>
              <span className="text-indigo-600 dark:text-indigo-400">
                {progressPercent}% Complete
              </span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        </div>

        {/* 2-Column Grid: Curriculum Sidebar + Topic Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* LEFT: Topics Navigation Drawer / Sidebar (4 cols) */}
          <div className="lg:col-span-4 space-y-3">
            <div className="bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm sticky top-4 max-h-[calc(100vh-140px)] flex flex-col">
              <div className="pb-3 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-500" />
                  Syllabus Breakdown
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Click any topic to switch or review.
                </p>
              </div>

              <div className="overflow-y-auto flex-1 pt-3 space-y-3 pr-1">
                {session.units.map((unit) => {
                  const isUnitExpanded = expandedUnitIds[unit.id] ?? true;
                  const unitCompletedCount = unit.topics.filter((t) =>
                    session.completedTopicIds.includes(t.id)
                  ).length;
                  const isUnitFullyDone = unitCompletedCount === unit.topics.length && unit.topics.length > 0;

                  return (
                    <div
                      key={unit.id}
                      className="rounded-xl border border-zinc-200 dark:border-zinc-800/80 overflow-hidden bg-zinc-50/50 dark:bg-zinc-950/40"
                    >
                      {/* Unit Header */}
                      <button
                        onClick={() => toggleUnitExpand(unit.id)}
                        className="w-full px-3 py-2.5 flex items-center justify-between text-left hover:bg-zinc-100/50 dark:hover:bg-zinc-900/50 transition-colors"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">
                            {unit.title}
                          </p>
                          <span className="text-[10px] text-zinc-500">
                            {unitCompletedCount}/{unit.topics.length} done
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {isUnitFullyDone && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          )}
                          {isUnitExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
                          )}
                        </div>
                      </button>

                      {/* Topic List within Unit */}
                      {isUnitExpanded && (
                        <div className="px-2 pb-2 space-y-1">
                          {unit.topics.map((topic, tIdx) => {
                            const isCurrent = topic.id === session.currentTopicId;
                            const isCompleted = session.completedTopicIds.includes(topic.id);

                            return (
                              <button
                                key={topic.id || tIdx}
                                onClick={() => handleSelectTopic(unit, topic)}
                                className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-all flex items-center gap-2 group ${
                                  isCurrent
                                    ? "bg-indigo-600 text-white font-semibold shadow-sm"
                                    : isCompleted
                                    ? "bg-emerald-50/60 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-300 font-medium"
                                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                                }`}
                              >
                                <span className="shrink-0">
                                  {isCompleted ? (
                                    <CheckCircle2
                                      className={`w-3.5 h-3.5 ${
                                        isCurrent ? "text-white" : "text-emerald-500"
                                      }`}
                                    />
                                  ) : isCurrent ? (
                                    <span className="w-3 h-3 rounded-full bg-white animate-pulse" />
                                  ) : (
                                    <Circle className="w-3.5 h-3.5 text-zinc-400" />
                                  )}
                                </span>
                                <span className="truncate flex-1">
                                  {topic.title}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT: Topic Lesson Content (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            {/* Loading Indicator when generating topic */}
            {lessonLoading ? (
              <div className="bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-12 text-center space-y-4 shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto animate-bounce">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                    Preparing Exam-Oriented Lesson
                  </h3>
                  <p className="text-xs text-zinc-500">
                    Teaching {currentTopicItem?.topic.title} in{" "}
                    {session.language === "hinglish" ? "natural Hinglish" : "clear English"}...
                  </p>
                </div>
                <Loader2 className="w-5 h-5 animate-spin mx-auto text-indigo-500" />
              </div>
            ) : currentLesson ? (
              <div className="space-y-5">
                {/* Topic Header Card */}
                <div className="bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                      {currentLesson.unitName}
                    </span>
                    <Badge variant="outline" className="text-xs text-zinc-500">
                      Topic {allFlattenedTopics.findIndex((i) => i.topic.id === session.currentTopicId) + 1} of {session.totalTopics}
                    </Badge>
                  </div>
                  <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                    {currentLesson.topicName}
                  </h2>
                </div>

                {/* 1. SIMPLE EXPLANATION */}
                <div className="bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-3">
                  <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                    <BookOpen className="w-4 h-4" />
                    1. Simple Explanation
                  </div>
                  <div className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-line">
                    {currentLesson.simpleExplanation}
                  </div>
                </div>

                {/* 2. IMPORTANT CONCEPTS */}
                {currentLesson.importantConcepts?.length > 0 && (
                  <div className="bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-3">
                    <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                      <Lightbulb className="w-4 h-4" />
                      2. Important Concepts
                    </div>
                    <ul className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                      {currentLesson.importantConcepts.map((concept, idx) => (
                        <li key={idx} className="flex items-start gap-2.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0 mt-2" />
                          <span>{concept}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 3. EXAM-ORIENTED POINTS */}
                {currentLesson.examOrientedPoints?.length > 0 && (
                  <div className="bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-3">
                    <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold text-sm">
                      <Target className="w-4 h-4" />
                      3. Exam-Oriented Points
                    </div>
                    <ul className="space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                      {currentLesson.examOrientedPoints.map((point, idx) => (
                        <li key={idx} className="flex items-start gap-2.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-2" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 4. EXAMPLE (when available) */}
                {currentLesson.example && (
                  <div className="bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-3">
                    <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                      <Sparkles className="w-4 h-4" />
                      4. Practical / Real-World Example
                    </div>
                    <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed font-mono whitespace-pre-line text-xs md:text-sm">
                      {currentLesson.example}
                    </div>
                  </div>
                )}

                {/* 5. IMPORTANT DEFINITIONS */}
                {currentLesson.importantDefinitions?.length > 0 && (
                  <div className="bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-3">
                    <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                      <Bookmark className="w-4 h-4" />
                      5. Important Definitions
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {currentLesson.importantDefinitions.map((def, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-1"
                        >
                          <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                            {def.term}
                          </p>
                          <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                            {def.definition}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 6. POSSIBLE EXAM QUESTIONS */}
                {currentLesson.possibleExamQuestions?.length > 0 && (
                  <div className="bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                      <FileQuestion className="w-4 h-4" />
                      6. Possible Exam Questions
                    </div>
                    <div className="space-y-3">
                      {currentLesson.possibleExamQuestions.map((item, idx) => (
                        <div
                          key={idx}
                          className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 space-y-2.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                              Q{idx + 1}: {item.question}
                            </p>
                            {item.marks && (
                              <Badge className="shrink-0 bg-indigo-500/10 text-indigo-500 text-[10px]">
                                {item.marks} Marks
                              </Badge>
                            )}
                          </div>

                          <div className="text-xs text-zinc-600 dark:text-zinc-300 bg-white dark:bg-zinc-900 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 leading-relaxed">
                            <span className="font-semibold text-zinc-800 dark:text-zinc-200 block mb-1">
                              Model Answer / Key Points:
                            </span>
                            {item.modelAnswer}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 7. SHORT REVISION */}
                {currentLesson.shortRevision?.length > 0 && (
                  <div className="bg-gradient-to-br from-indigo-50/40 via-white to-zinc-50 dark:from-indigo-950/30 dark:via-zinc-900 dark:to-zinc-950 border border-indigo-500/20 rounded-2xl p-6 shadow-sm space-y-3">
                    <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                      <RotateCw className="w-4 h-4" />
                      7. Lightning Revision
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {currentLesson.shortRevision.map((rev, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-lg bg-white/80 dark:bg-zinc-900/80 border border-zinc-200/80 dark:border-zinc-800 text-xs text-zinc-700 dark:text-zinc-300 flex items-center gap-2"
                        >
                          <Check className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span>{rev}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 8. QUICK QUIZ */}
                {currentLesson.quickQuiz?.length > 0 && (
                  <div className="bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                        <HelpCircle className="w-4 h-4" />
                        8. Quick Quiz
                      </div>
                      {quizSubmitted && quizScore !== null && (
                        <Badge
                          className={
                            quizScore === currentLesson.quickQuiz.length
                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                          }
                        >
                          Score: {quizScore}/{currentLesson.quickQuiz.length}
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-4">
                      {currentLesson.quickQuiz.map((quiz, qIdx) => {
                        const selectedAnswer = quizAnswers[qIdx];
                        const isCorrect = selectedAnswer === quiz.correctAnswerIndex;

                        return (
                          <div
                            key={qIdx}
                            className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 space-y-3"
                          >
                            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                              {qIdx + 1}. {quiz.question}
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {quiz.options.map((opt, oIdx) => {
                                const isSelected = selectedAnswer === oIdx;
                                const isOptionCorrect = quiz.correctAnswerIndex === oIdx;

                                let btnStyle =
                                  "border-zinc-200 dark:border-zinc-800 hover:border-indigo-400 dark:hover:border-indigo-600 text-zinc-700 dark:text-zinc-300";

                                if (quizSubmitted) {
                                  if (isOptionCorrect) {
                                    btnStyle = "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold";
                                  } else if (isSelected && !isCorrect) {
                                    btnStyle = "border-red-500 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300";
                                  }
                                } else if (isSelected) {
                                  btnStyle = "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold";
                                }

                                return (
                                  <button
                                    key={oIdx}
                                    onClick={() => handleQuizAnswer(qIdx, oIdx)}
                                    className={`p-2.5 rounded-lg border text-xs text-left transition-colors flex items-center justify-between ${btnStyle}`}
                                  >
                                    <span>{opt}</span>
                                    {quizSubmitted && isOptionCorrect && (
                                      <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                    )}
                                    {quizSubmitted && isSelected && !isCorrect && (
                                      <X className="w-3.5 h-3.5 text-red-500 shrink-0" />
                                    )}
                                  </button>
                                );
                              })}
                            </div>

                            {quizSubmitted && quiz.explanation && (
                              <p className="text-xs text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800">
                                <span className="font-semibold text-zinc-700 dark:text-zinc-300">Explanation: </span>
                                {quiz.explanation}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {!quizSubmitted ? (
                      <Button
                        size="sm"
                        onClick={handleQuizSubmit}
                        disabled={Object.keys(quizAnswers).length < currentLesson.quickQuiz.length}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
                      >
                        Submit Quiz Answers
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRetakeQuiz}
                        className="text-xs flex items-center gap-1.5"
                      >
                        <RotateCcw className="w-3.5 h-3.5" /> Retake Quiz
                      </Button>
                    )}
                  </div>
                )}

                {/* AFTER TOPIC ACTION BAR */}
                <div className="bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                      Are you ready for the next topic?
                    </h3>
                    <p className="text-xs text-zinc-500">
                      You are in complete control of your progression. Revise this topic or proceed when ready.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      onClick={handleNextTopic}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-md shadow-indigo-600/20"
                    >
                      Next Topic
                      <ArrowRight className="w-4 h-4" />
                    </Button>

                    <Button
                      variant="outline"
                      onClick={handleReviseCurrentTopic}
                      className="text-xs h-10 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center gap-2"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      Revise This Topic
                    </Button>

                    {currentLesson.quickQuiz?.length > 0 && (
                      <Button
                        variant="outline"
                        onClick={handleRetakeQuiz}
                        className="text-xs h-10 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center gap-2"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Take Quiz Again
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-12 text-center space-y-3">
                <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
                <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                  Select a topic to start studying
                </p>
                <Button
                  size="sm"
                  onClick={() => {
                    if (currentTopicItem) {
                      loadTopicLesson(
                        currentTopicItem.topic,
                        currentTopicItem.unitTitle,
                        session.subject,
                        session.language
                      );
                    }
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
                >
                  Load Current Topic
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // RENDER: STEP 4 - SYLLABUS COMPLETED GRAND FINALE
  // =========================================================================
  if (viewStep === "completed" && session) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {/* Grand Completion Banner */}
        <div className="bg-gradient-to-r from-emerald-950/60 via-indigo-950/60 to-zinc-900 border border-emerald-500/30 rounded-3xl p-8 text-center relative overflow-hidden shadow-xl">
          <div className="space-y-3 relative z-10">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
              <Award className="w-8 h-8" />
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">
              🎉 Syllabus Completed!
            </h1>
            <p className="text-sm text-zinc-300 max-w-xl mx-auto leading-relaxed">
              Congratulations! You have systematically covered every unit and topic in{" "}
              <span className="font-semibold text-emerald-400">{session.subject}</span>.
              Here is your comprehensive Final Exam Preparation Package.
            </p>
            <div className="pt-2 flex items-center justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleStartNewSyllabus}
                className="text-xs bg-white/10 hover:bg-white/20 text-white border-white/20"
              >
                Study Another Syllabus
              </Button>
            </div>
          </div>
        </div>

        {/* Loading Completion Package */}
        {completionLoading ? (
          <div className="bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-12 text-center space-y-4 shadow-sm">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-indigo-500" />
            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              Assembling full syllabus exam revision package & mock test...
            </p>
          </div>
        ) : completionSummary ? (
          <div className="space-y-6">
            {/* 1. COMPLETE SYLLABUS REVISION */}
            <div className="bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-4">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-500" />
                1. Complete Syllabus Revision
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {completionSummary.overallRevision?.map((rev, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-700 dark:text-zinc-300 flex items-start gap-2.5"
                  >
                    <span className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold flex items-center justify-center shrink-0 text-[10px]">
                      {idx + 1}
                    </span>
                    <span className="leading-relaxed">{rev}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. IMPORTANT EXAM TOPICS */}
            <div className="bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-4">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Target className="w-5 h-5 text-amber-500" />
                2. High-Yield Exam Topics
              </h2>
              <div className="space-y-3">
                {completionSummary.importantExamTopics?.map((top, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                          {top.topic}
                        </p>
                        <Badge variant="outline" className="text-[10px]">
                          {top.unit}
                        </Badge>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        {top.whyImportant}
                      </p>
                    </div>

                    <Badge
                      className={
                        top.examProbability === "Critical"
                          ? "bg-red-500/10 text-red-500 border-red-500/30 text-xs shrink-0 self-start sm:self-center"
                          : "bg-amber-500/10 text-amber-500 border-amber-500/30 text-xs shrink-0 self-start sm:self-center"
                      }
                    >
                      {top.examProbability} Priority
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. IMPORTANT DEFINITIONS GLOSSARY */}
            <div className="bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-4">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-indigo-500" />
                3. Essential Definitions Glossary
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {completionSummary.importantDefinitions?.map((def, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-1"
                  >
                    <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                      {def.term}
                    </p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
                      {def.definition}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. IMPORTANT QUESTIONS BANK */}
            <div className="bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-4">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <FileQuestion className="w-5 h-5 text-indigo-500" />
                4. Comprehensive Exam Questions Bank
              </h2>
              <div className="space-y-4">
                {completionSummary.importantExamQuestions?.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                        Q{idx + 1}: {item.question}
                      </p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {item.marks && (
                          <Badge className="bg-indigo-500/10 text-indigo-500 text-[10px]">
                            {item.marks} Marks
                          </Badge>
                        )}
                        {item.expectedLength && (
                          <Badge variant="outline" className="text-[10px]">
                            {item.expectedLength}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="text-xs text-zinc-600 dark:text-zinc-300 bg-white dark:bg-zinc-900 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 leading-relaxed">
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200 block mb-1">
                        Model Answer / Key Points:
                      </span>
                      {item.modelAnswer}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 5. FINAL MOCK QUIZ */}
            {completionSummary.finalMockQuiz?.length > 0 && (
              <div className="bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-indigo-500" />
                    5. Final Comprehensive Mock Quiz
                  </h2>
                  {finalQuizSubmitted && finalQuizScore !== null && (
                    <Badge
                      className={
                        finalQuizScore === completionSummary.finalMockQuiz.length
                          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                          : "bg-indigo-500/10 text-indigo-500 border-indigo-500/20"
                      }
                    >
                      Final Score: {finalQuizScore}/{completionSummary.finalMockQuiz.length}
                    </Badge>
                  )}
                </div>

                <div className="space-y-4">
                  {completionSummary.finalMockQuiz.map((quiz, qIdx) => {
                    const selectedAnswer = finalQuizAnswers[qIdx];
                    const isCorrect = selectedAnswer === quiz.correctAnswerIndex;

                    return (
                      <div
                        key={qIdx}
                        className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 space-y-3"
                      >
                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          {qIdx + 1}. {quiz.question}
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {quiz.options.map((opt, oIdx) => {
                            const isSelected = selectedAnswer === oIdx;
                            const isOptionCorrect = quiz.correctAnswerIndex === oIdx;

                            let btnStyle =
                              "border-zinc-200 dark:border-zinc-800 hover:border-indigo-400 dark:hover:border-indigo-600 text-zinc-700 dark:text-zinc-300";

                            if (finalQuizSubmitted) {
                              if (isOptionCorrect) {
                                btnStyle =
                                  "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-semibold";
                              } else if (isSelected && !isCorrect) {
                                btnStyle =
                                  "border-red-500 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300";
                              }
                            } else if (isSelected) {
                              btnStyle =
                                "border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-semibold";
                            }

                            return (
                              <button
                                key={oIdx}
                                onClick={() => {
                                  if (!finalQuizSubmitted) {
                                    setFinalQuizAnswers((prev) => ({ ...prev, [qIdx]: oIdx }));
                                  }
                                }}
                                className={`p-2.5 rounded-lg border text-xs text-left transition-colors flex items-center justify-between ${btnStyle}`}
                              >
                                <span>{opt}</span>
                                {finalQuizSubmitted && isOptionCorrect && (
                                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                )}
                                {finalQuizSubmitted && isSelected && !isCorrect && (
                                  <X className="w-3.5 h-3.5 text-red-500 shrink-0" />
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {finalQuizSubmitted && quiz.explanation && (
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 bg-white dark:bg-zinc-900 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800">
                            <span className="font-semibold text-zinc-700 dark:text-zinc-300">Explanation: </span>
                            {quiz.explanation}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {!finalQuizSubmitted ? (
                  <Button
                    size="sm"
                    onClick={() => {
                      let score = 0;
                      completionSummary.finalMockQuiz.forEach((q, idx) => {
                        if (finalQuizAnswers[idx] === q.correctAnswerIndex) {
                          score++;
                        }
                      });
                      setFinalQuizScore(score);
                      setFinalQuizSubmitted(true);
                      toast.success(`Mock Quiz completed! Score: ${score}/${completionSummary.finalMockQuiz.length}`);
                    }}
                    disabled={
                      Object.keys(finalQuizAnswers).length <
                      completionSummary.finalMockQuiz.length
                    }
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
                  >
                    Submit Mock Quiz
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setFinalQuizAnswers({});
                      setFinalQuizSubmitted(false);
                      setFinalQuizScore(null);
                    }}
                    className="text-xs flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Retake Mock Quiz
                  </Button>
                )}
              </div>
            )}
          </div>
        ) : null}
      </div>
    );
  }

  return null;
}
