// app/dashboard/planner/page.tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Sparkles, Clock, Target, Lightbulb, Plus, X, ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { saveStudyPlan, incrementUserProfileField } from "@/firebase/firestore";
import { toast } from "sonner";

interface DayTask {
  subject: string;
  topic: string;
  duration: number;
  type: string;
}
interface DayPlan {
  date: string;
  day: string;
  tasks: DayTask[];
  totalHours: number;
}
interface StudyPlan {
  overview: string;
  dailyPlan: DayPlan[];
  weeklyGoals: string[];
  tips: string[];
}

const PREP_LEVELS = [
  { id: "beginner", label: "Early Stage", emoji: "🌱", desc: "< 25% Syllabus" },
  { id: "intermediate", label: "In Progress", emoji: "📚", desc: "~50% Syllabus" },
  { id: "advanced", label: "Final Review", emoji: "🚀", desc: "> 75% Syllabus" },
];

const taskTypeStyles: Record<string, string> = {
  study: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  revision: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  practice: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  rest: "bg-muted/40 text-muted-foreground border-border/60",
  mock: "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

export default function PlannerPage() {
  const { user, refreshProfile } = useAuth();
  const [examDate, setExamDate] = useState("");
  const [subjects, setSubjects] = useState<string[]>([""]);
  const [prepLevel, setPrepLevel] = useState("intermediate");
  const [dailyHours, setDailyHours] = useState(4);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<StudyPlan | null>(null);

  const addSubject = () => {
    if (subjects.length < 8) setSubjects([...subjects, ""]);
  };
  const removeSubject = (i: number) => setSubjects(subjects.filter((_, idx) => idx !== i));
  const updateSubject = (i: number, val: string) => {
    const updated = [...subjects];
    updated[i] = val;
    setSubjects(updated);
  };

  const handleGenerate = async () => {
    const validSubjects = subjects.filter(Boolean);
    if (!examDate) {
      toast.error("Please select exam date");
      return;
    }
    if (validSubjects.length === 0) {
      toast.error("Please add at least one subject");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/ai/study-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examDate,
          subjects: validSubjects,
          preparationLevel: prepLevel,
          dailyHours,
          uid: user?.uid,
        }),
      });
      if (!res.ok) throw new Error();
      const result: StudyPlan = await res.json();
      setPlan(result);

      if (user) {
        await saveStudyPlan(user.uid, {
          examDate,
          subjects: validSubjects,
          preparationLevel: prepLevel,
          plan: result as unknown as Record<string, unknown>,
        });
        await incrementUserProfileField(user.uid, "aiUsageCount", 1);
        await refreshProfile();
      }
      toast.success("Study plan created!");
    } catch {
      toast.error("Failed to generate plan.");
    } finally {
      setLoading(false);
    }
  };

  const daysUntilExam = examDate
    ? Math.ceil((new Date(examDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Input Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border/80 rounded-xl p-5 sm:p-6"
      >
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h2 className="font-semibold text-base tracking-tight text-foreground">Strategic Study Planner</h2>
              <p className="text-xs text-muted-foreground">Generate time-blocked daily study schedules optimized for your target exam dates</p>
            </div>
          </div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground px-2 py-0.5 rounded bg-muted/60 border border-border/50 hidden sm:inline">
            Adaptive Schedule
          </span>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mb-5">
          {/* Exam Date */}
          <div className="p-3.5 rounded-lg border border-border/60 bg-muted/20">
            <label className="text-xs font-medium text-foreground mb-1.5 block">Target Exam Date</label>
            <input
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              className="w-full px-3.5 py-2 rounded-lg border border-border/80 bg-card text-xs sm:text-sm text-foreground focus:outline-none focus:border-indigo-500 transition-colors"
            />
            {daysUntilExam !== null && daysUntilExam > 0 && (
              <p
                className={`text-[11px] font-mono mt-2 font-medium ${
                  daysUntilExam <= 7 ? "text-rose-400" : daysUntilExam <= 14 ? "text-amber-400" : "text-emerald-400"
                }`}
              >
                Countdown: {daysUntilExam} calendar days remaining
              </p>
            )}
          </div>

          {/* Daily Hours */}
          <div className="p-3.5 rounded-lg border border-border/60 bg-muted/20">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-foreground">Daily Study Commitment</label>
              <span className="text-xs font-mono font-bold text-indigo-400">{dailyHours} Hours/Day</span>
            </div>
            <input
              type="range"
              min={1}
              max={12}
              value={dailyHours}
              onChange={(e) => setDailyHours(Number(e.target.value))}
              className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-indigo-500 mt-2"
            />
            <div className="flex justify-between text-[10px] font-mono text-muted-foreground mt-2">
              <span>1h minimum</span>
              <span>6h standard</span>
              <span>12h intensive</span>
            </div>
          </div>
        </div>

        {/* Preparation Level */}
        <div className="mb-5">
          <label className="text-xs font-medium text-foreground mb-2 block">Current Syllabus Progress</label>
          <div className="grid grid-cols-3 gap-2.5">
            {PREP_LEVELS.map((level) => (
              <button
                key={level.id}
                onClick={() => setPrepLevel(level.id)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  prepLevel === level.id
                    ? "border-indigo-500 bg-indigo-500/10 text-foreground"
                    : "border-border/70 bg-muted/20 text-muted-foreground hover:border-border"
                }`}
              >
                <div className="text-base mb-1">{level.emoji}</div>
                <div className="text-xs font-medium text-foreground">{level.label}</div>
                <div className="text-[11px] text-muted-foreground">{level.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Subjects */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2.5">
            <label className="text-xs font-medium text-foreground">Subjects & Modules</label>
            <button
              onClick={addSubject}
              disabled={subjects.length >= 8}
              className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-medium disabled:opacity-40 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Subject
            </button>
          </div>
          <div className="space-y-2">
            {subjects.map((sub, i) => (
              <div key={i} className="flex gap-2">
                <input
                  type="text"
                  placeholder={`Subject ${i + 1} (e.g. Distributed Systems)`}
                  value={sub}
                  onChange={(e) => updateSubject(i, e.target.value)}
                  className="flex-1 px-3.5 py-2 rounded-lg border border-border/80 bg-muted/30 text-xs sm:text-sm text-foreground focus:outline-none focus:border-indigo-500 focus:bg-card transition-colors placeholder:text-muted-foreground/60"
                />
                {subjects.length > 1 && (
                  <button
                    onClick={() => removeSubject(i)}
                    className="p-2 text-muted-foreground hover:text-rose-400 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={loading || !examDate || subjects.filter(Boolean).length === 0}
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-medium h-10 rounded-lg transition-colors"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Building Time-Blocked Roadmap...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Generate Adaptive Study Schedule</span>
            </div>
          )}
        </Button>
      </motion.div>

      {/* Plan Results */}
      <AnimatePresence>
        {plan && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Overview */}
            <div className="bg-card border border-border/80 rounded-xl p-5">
              <h3 className="font-semibold text-sm flex items-center gap-2 mb-2.5 text-foreground">
                <Target className="w-4 h-4 text-indigo-400" /> Strategic Overview
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{plan.overview}</p>
              <div className="grid sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-border/60">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2">Milestone Goals</p>
                  <ul className="space-y-1.5">
                    {plan.weeklyGoals.map((goal, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-foreground/90">
                        <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                        <span>{goal}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-400" /> Retention Heuristics
                  </p>
                  <ul className="space-y-1.5">
                    {plan.tips.map((tip, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <span className="text-amber-400 font-mono">✦</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Daily Plan */}
            <div className="bg-card border border-border/80 rounded-xl p-5">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-border/60">
                <h3 className="font-semibold text-sm flex items-center gap-2 text-foreground">
                  <Calendar className="w-4 h-4 text-indigo-400" /> 7-Day Precision Roadmap
                </h3>
              </div>
              <div className="space-y-3">
                {plan.dailyPlan.map((day, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="border border-border/70 rounded-lg overflow-hidden bg-muted/10"
                  >
                    <div className="flex items-center justify-between px-3.5 py-2.5 bg-muted/30 border-b border-border/50">
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 h-5 rounded bg-indigo-500/10 text-indigo-400 font-mono text-xs font-semibold flex items-center justify-center">
                          {i + 1}
                        </span>
                        <div>
                          <span className="font-medium text-xs text-foreground mr-2">{day.day}</span>
                          <span className="text-[11px] font-mono text-muted-foreground">{day.date}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-xs font-mono text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>{day.totalHours}h allocated</span>
                      </div>
                    </div>
                    <div className="px-3.5 py-2.5 space-y-2">
                      {day.tasks.map((task, j) => (
                        <div key={j} className="flex items-center gap-2.5 text-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                          <div className="flex-1 min-w-0 flex items-center gap-1.5">
                            <span className="font-medium text-foreground">{task.subject}</span>
                            <span className="text-muted-foreground">· {task.topic}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${
                                taskTypeStyles[task.type] || taskTypeStyles.study
                              }`}
                            >
                              {task.type}
                            </span>
                            <span className="font-mono text-muted-foreground">{task.duration}m</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
