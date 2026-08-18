// app/dashboard/viva/page.tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Sparkles, ChevronDown, ChevronUp, HelpCircle, MessageCircle, ArrowRight, ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { incrementUserProfileField } from "@/firebase/firestore";
import { toast } from "sonner";

interface VivaQuestion {
  question: string;
  answer: string;
  difficulty: "easy" | "medium" | "hard";
  followUps: string[];
}

const difficultyBadgeStyle: Record<string, string> = {
  easy: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  hard: "bg-rose-500/10 text-rose-400 border-rose-500/20",
};

export default function VivaPage() {
  const { user, refreshProfile } = useAuth();
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<VivaQuestion[]>([]);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [practiceMode, setPracticeMode] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  const handleGenerate = async () => {
    if (!subject || !topic) {
      toast.error("Please enter subject and topic");
      return;
    }
    setLoading(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (user) {
        try {
          const token = await user.getIdToken();
          if (token) headers["Authorization"] = `Bearer ${token}`;
        } catch {}
      }

      const res = await fetch("/api/ai/viva-questions", {
        method: "POST",
        headers,
        body: JSON.stringify({ subject, topic, uid: user?.uid }),
      });

      let data: any = null;
      try {
        const text = await res.text();
        data = text ? JSON.parse(text) : null;
      } catch {}

      if (!res.ok) throw new Error(data?.error || "Failed to generate questions.");
      const qs = data?.questions || data?.data?.questions || [];
      setQuestions(qs);
      setExpandedIdx(null);
      setPracticeMode(false);
      if (user) {
        await incrementUserProfileField(user.uid, "aiUsageCount", 1);
        await refreshProfile();
      }
      toast.success("Viva questions generated!");
    } catch (err: any) {
      toast.error(err?.message || "Failed to generate questions.");
    } finally {
      setLoading(false);
    }
  };

  const startPractice = () => {
    setPracticeMode(true);
    setCurrentQ(0);
    setShowAnswer(false);
  };
  const nextQ = () => {
    setCurrentQ((c) => Math.min(c + 1, questions.length - 1));
    setShowAnswer(false);
  };
  const prevQ = () => {
    setCurrentQ((c) => Math.max(c - 1, 0));
    setShowAnswer(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Input Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border/80 rounded-xl p-5 sm:p-6"
      >
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center">
              <Mic className="w-4 h-4 text-pink-400" />
            </div>
            <div>
              <h2 className="font-semibold text-base tracking-tight text-foreground">Oral Exam & Viva Simulation</h2>
              <p className="text-xs text-muted-foreground">Generate comprehensive oral examiner questions with model concise answers and probe follow-ups</p>
            </div>
          </div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground px-2 py-0.5 rounded bg-muted/60 border border-border/50 hidden sm:inline">
            Interactive Flashcard
          </span>
        </div>

        <div className="grid sm:grid-cols-2 gap-3.5 mb-4">
          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">Course or Subject</label>
            <input
              type="text"
              placeholder="e.g. Operating Systems, Computer Networks"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-border/80 bg-muted/30 text-xs sm:text-sm text-foreground focus:outline-none focus:border-pink-500 focus:bg-card transition-colors placeholder:text-muted-foreground/60"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">Specific Topic / Lab Practical</label>
            <input
              type="text"
              placeholder="e.g. Deadlock Detection & Semaphores"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-border/80 bg-muted/30 text-xs sm:text-sm text-foreground focus:outline-none focus:border-pink-500 focus:bg-card transition-colors placeholder:text-muted-foreground/60"
            />
          </div>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={!subject || !topic || loading}
          className="w-full bg-pink-600 hover:bg-pink-500 text-white text-xs sm:text-sm font-medium h-10 rounded-lg transition-colors"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Synthesizing Viva Questions...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Generate Viva Question Bank</span>
            </div>
          )}
        </Button>
      </motion.div>

      {/* Results */}
      <AnimatePresence>
        {questions.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Controls */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-muted-foreground">{questions.length} Questions Generated</span>
              <div className="flex items-center gap-1.5 p-0.5 rounded-lg border border-border/70 bg-muted/20">
                <button
                  onClick={() => setPracticeMode(false)}
                  className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                    !practiceMode
                      ? "bg-card text-foreground shadow-sm border border-border/60"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Index Mode
                </button>
                <button
                  onClick={startPractice}
                  className={`px-3 py-1 rounded text-xs font-medium transition-all ${
                    practiceMode
                      ? "bg-card text-pink-400 shadow-sm border border-border/60"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Flashcard Simulator
                </button>
              </div>
            </div>

            {/* Practice Mode */}
            {practiceMode ? (
              <div className="bg-card border border-border/80 rounded-xl p-5 sm:p-6">
                <div className="flex items-center justify-between pb-4 mb-5 border-b border-border/60">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">
                      Question {currentQ + 1} of {questions.length}
                    </span>
                    <span
                      className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${
                        difficultyBadgeStyle[questions[currentQ].difficulty]
                      }`}
                    >
                      {questions[currentQ].difficulty}
                    </span>
                  </div>
                  <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-pink-500 rounded-full transition-all"
                      style={{ width: `${((currentQ + 1) / questions.length) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="bg-muted/20 border border-border/60 rounded-xl p-6 sm:p-8 mb-5 text-center">
                  <p className="text-base sm:text-lg font-medium text-foreground leading-snug">
                    "{questions[currentQ].question}"
                  </p>
                </div>

                {!showAnswer ? (
                  <Button
                    onClick={() => setShowAnswer(true)}
                    className="w-full bg-pink-600 hover:bg-pink-500 text-white text-xs sm:text-sm font-medium h-10 rounded-lg"
                  >
                    Reveal Model Answer
                  </Button>
                ) : (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                    <div className="bg-muted/20 border border-emerald-500/30 rounded-xl p-4 sm:p-5">
                      <p className="text-xs font-semibold text-emerald-400 mb-1.5 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Model Answer
                      </p>
                      <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">
                        {questions[currentQ].answer}
                      </p>
                    </div>

                    {questions[currentQ].followUps?.length > 0 && (
                      <div className="border border-border/60 rounded-lg p-3.5 bg-muted/10">
                        <p className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-2">
                          Potential Examiner Follow-Up Probes:
                        </p>
                        <div className="space-y-1.5">
                          {questions[currentQ].followUps.map((fq, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                              <MessageCircle className="w-3 h-3 shrink-0 mt-0.5 text-pink-400" />
                              <span>{fq}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        onClick={prevQ}
                        disabled={currentQ === 0}
                        className="flex-1 h-9 text-xs border-border/70"
                      >
                        <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Previous
                      </Button>
                      {currentQ < questions.length - 1 ? (
                        <Button onClick={nextQ} className="flex-1 h-9 text-xs bg-pink-600 hover:bg-pink-500 text-white">
                          Next Question <ArrowRight className="w-3.5 h-3.5 ml-1" />
                        </Button>
                      ) : (
                        <Button
                          onClick={() => {
                            setPracticeMode(false);
                            toast.success("Practice drill complete! 🎉");
                          }}
                          className="flex-1 h-9 text-xs bg-emerald-600 hover:bg-emerald-500 text-white"
                        >
                          Complete Drill ✓
                        </Button>
                      )}
                    </div>
                  </motion.div>
                )}
              </div>
            ) : (
              /* Study Mode - all questions */
              <div className="space-y-2.5">
                {questions.map((q, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="bg-card border border-border/80 rounded-lg overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}
                      className="w-full flex items-center gap-3 p-3.5 hover:bg-muted/30 transition-colors text-left"
                    >
                      <span className="w-6 h-6 rounded bg-pink-500/10 text-pink-300 font-mono text-xs font-semibold flex items-center justify-center shrink-0">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs sm:text-sm font-medium text-foreground truncate">{q.question}</p>
                      </div>
                      <span
                        className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${
                          difficultyBadgeStyle[q.difficulty]
                        } shrink-0`}
                      >
                        {q.difficulty}
                      </span>
                      {expandedIdx === i ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                      )}
                    </button>

                    <AnimatePresence>
                      {expandedIdx === i && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: "auto" }}
                          exit={{ height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-4 pb-4 pt-1 border-t border-border/50 bg-muted/20">
                            <div className="pt-2 space-y-3">
                              <div>
                                <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1">
                                  Model Response
                                </p>
                                <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">{q.answer}</p>
                              </div>
                              {q.followUps?.length > 0 && (
                                <div className="pt-2 border-t border-border/40">
                                  <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5">
                                    Follow-up questions
                                  </p>
                                  <div className="space-y-1">
                                    {q.followUps.map((fq, j) => (
                                      <div key={j} className="flex items-start gap-2 text-xs text-muted-foreground">
                                        <MessageCircle className="w-3 h-3 shrink-0 mt-0.5 text-pink-400" />
                                        <span>{fq}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
