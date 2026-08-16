// app/dashboard/predictor/page.tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart3, Sparkles, TrendingUp, AlertTriangle, CheckCircle2, Plus, X, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { savePrediction, incrementUserProfileField } from "@/firebase/firestore";
import { toast } from "sonner";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from "recharts";
import { getGradeColor, getProbabilityColor } from "@/utils";

interface Prediction {
  passProbability: number;
  predictedMarks: number;
  grade: string;
  weakSubjects: string[];
  strengths: string[];
  recommendations: string[];
  breakdown: Array<{ factor: string; score: number; impact: string }>;
}

export default function PredictorPage() {
  const { user, refreshProfile } = useAuth();
  const [attendance, setAttendance] = useState(75);
  const [internalMarks, setInternalMarks] = useState(60);
  const [studyHours, setStudyHours] = useState(4);
  const [syllabusCompletion, setSyllabusCompletion] = useState(60);
  const [subjects, setSubjects] = useState<string[]>(["Mathematics", "Physics"]);
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState<Prediction | null>(null);

  const addSubject = () => {
    if (subjects.length < 6) setSubjects([...subjects, ""]);
  };
  const removeSubject = (i: number) => setSubjects(subjects.filter((_, idx) => idx !== i));
  const updateSubject = (i: number, val: string) => {
    const upd = [...subjects];
    upd[i] = val;
    setSubjects(upd);
  };

  const handlePredict = async () => {
    const validSubs = subjects.filter(Boolean);
    if (validSubs.length === 0) {
      toast.error("Add at least one subject");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/ai/predict-performance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attendance,
          internalMarks,
          studyHours,
          syllabusCompletion,
          subjects: validSubs,
          uid: user?.uid,
        }),
      });
      if (!res.ok) throw new Error();
      const result: Prediction = await res.json();
      setPrediction(result);
      if (user) {
        await savePrediction(user.uid, { type: "performance", ...result });
        await incrementUserProfileField(user.uid, "aiUsageCount", 1);
        await refreshProfile();
      }
      toast.success("Performance predicted!");
    } catch {
      toast.error("Prediction failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const radarData = prediction?.breakdown.map((b) => ({ factor: b.factor, score: b.score })) || [];

  const sliders = [
    { label: "Attendance Record", value: attendance, setter: setAttendance, unit: "%", min: 0, max: 100, accent: "text-blue-400" },
    { label: "Internal Assessments", value: internalMarks, setter: setInternalMarks, unit: "/100", min: 0, max: 100, accent: "text-emerald-400" },
    { label: "Daily Study Allocation", value: studyHours, setter: setStudyHours, unit: " hrs", min: 0, max: 12, accent: "text-indigo-400" },
    { label: "Syllabus Coverage", value: syllabusCompletion, setter: setSyllabusCompletion, unit: "%", min: 0, max: 100, accent: "text-amber-400" },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Input */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border/80 rounded-xl p-5 sm:p-6"
      >
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="font-semibold text-base tracking-tight text-foreground">Statistical Grade Predictor</h2>
              <p className="text-xs text-muted-foreground">Estimate exam outcomes and pass probabilities using multivariable academic modelling</p>
            </div>
          </div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground px-2 py-0.5 rounded bg-muted/60 border border-border/50 hidden sm:inline">
            Predictive Model
          </span>
        </div>

        {/* Sliders */}
        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          {sliders.map((s) => (
            <div key={s.label} className="p-3.5 rounded-lg border border-border/60 bg-muted/20">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-foreground">{s.label}</label>
                <span className={`text-xs font-mono font-bold ${s.accent}`}>
                  {s.value}{s.unit}
                </span>
              </div>
              <input
                type="range"
                min={s.min}
                max={s.max}
                value={s.value}
                onChange={(e) => s.setter(Number(e.target.value))}
                className="w-full h-1.5 bg-muted rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between text-[10px] font-mono text-muted-foreground mt-1.5">
                <span>{s.min}{s.unit}</span>
                <span>{s.max}{s.unit}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Subjects */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2.5">
            <label className="text-xs font-medium text-foreground">Target Subject Modules (Max 6)</label>
            <button
              onClick={addSubject}
              disabled={subjects.length >= 6}
              className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-medium disabled:opacity-40 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Module
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {subjects.map((s, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 bg-muted/30 border border-border/80 rounded-lg pl-3 pr-1.5 py-1 text-xs"
              >
                <input
                  type="text"
                  placeholder={`Subject ${i + 1}`}
                  value={s}
                  onChange={(e) => updateSubject(i, e.target.value)}
                  className="bg-transparent text-xs text-foreground w-28 sm:w-36 focus:outline-none placeholder:text-muted-foreground/60"
                />
                {subjects.length > 1 && (
                  <button
                    onClick={() => removeSubject(i)}
                    className="p-1 text-muted-foreground hover:text-rose-400 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <Button
          onClick={handlePredict}
          disabled={loading}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-medium h-10 rounded-lg transition-colors"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Calculating Model Outcomes...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Run Statistical Performance Forecast</span>
            </div>
          )}
        </Button>
      </motion.div>

      {/* Results */}
      <AnimatePresence>
        {prediction && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Score Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="bg-card border border-border/80 rounded-xl p-4 sm:p-5">
                <div className="flex items-center justify-between text-muted-foreground mb-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider">Pass Probability</span>
                  <Activity className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <div className={`text-3xl sm:text-4xl font-mono font-bold tracking-tight mb-2 ${getProbabilityColor(prediction.passProbability)}`}>
                  {prediction.passProbability}%
                </div>
                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${prediction.passProbability}%`,
                      background:
                        prediction.passProbability >= 70 ? "#10b981" : prediction.passProbability >= 50 ? "#f59e0b" : "#f43f5e",
                    }}
                  />
                </div>
              </div>

              <div className="bg-card border border-border/80 rounded-xl p-4 sm:p-5">
                <div className="flex items-center justify-between text-muted-foreground mb-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider">Projected Marks</span>
                  <span className="text-[10px] font-mono text-muted-foreground">/ 100</span>
                </div>
                <div className="text-3xl sm:text-4xl font-mono font-bold tracking-tight text-blue-400 mb-1">
                  {prediction.predictedMarks}
                </div>
                <p className="text-[11px] text-muted-foreground">Expected baseline score</p>
              </div>

              <div className="bg-card border border-border/80 rounded-xl p-4 sm:p-5">
                <div className="flex items-center justify-between text-muted-foreground mb-2">
                  <span className="text-[11px] font-mono uppercase tracking-wider">Projected Grade</span>
                  <span className="text-[10px] font-mono text-muted-foreground">ESTIMATE</span>
                </div>
                <div className={`text-3xl sm:text-4xl font-mono font-bold tracking-tight mb-1 ${getGradeColor(prediction.grade)}`}>
                  {prediction.grade}
                </div>
                <p className="text-[11px] text-muted-foreground">Academic boundary tier</p>
              </div>
            </div>

            {/* Radar + Breakdown */}
            <div className="grid lg:grid-cols-2 gap-4">
              {/* Radar Chart */}
              <div className="bg-card border border-border/80 rounded-xl p-5">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/60">
                  <h3 className="font-semibold text-xs font-mono uppercase tracking-wider text-muted-foreground">
                    Preparedness Vectors
                  </h3>
                </div>
                <ResponsiveContainer width="100%" height={230}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="rgba(255,255,255,0.08)" />
                    <PolarAngleAxis dataKey="factor" tick={{ fontSize: 10, fill: "rgba(255,255,255,0.6)" }} />
                    <Radar name="Score" dataKey="score" stroke="#10b981" fill="#10b981" fillOpacity={0.25} />
                    <Tooltip
                      contentStyle={{
                        background: "#111113",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: "8px",
                        fontSize: "12px",
                        color: "#fff",
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>

              {/* Strengths & Weaknesses */}
              <div className="bg-card border border-border/80 rounded-xl p-5 space-y-4">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-2.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Academic Strengths
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {prediction.strengths.map((s) => (
                      <span
                        key={s}
                        className="text-xs px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-2.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" /> Vulnerable Dimensions
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {prediction.weakSubjects.map((s) => (
                      <span
                        key={s}
                        className="text-xs px-2.5 py-1 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20 font-medium"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-border/50">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 mb-2">
                    <TrendingUp className="w-3.5 h-3.5 text-blue-400" /> Strategic Next Steps
                  </h4>
                  <ul className="space-y-1.5">
                    {prediction.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <span className="text-emerald-400 font-mono">→</span>
                        <span className="text-foreground/90">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Factor breakdown */}
            <div className="bg-card border border-border/80 rounded-xl p-5">
              <h3 className="font-semibold text-xs font-mono uppercase tracking-wider text-muted-foreground mb-4">
                Factor Weight Breakdown
              </h3>
              <div className="space-y-3">
                {prediction.breakdown.map((b, i) => (
                  <div key={i}>
                    <div className="flex items-center justify-between mb-1 text-xs">
                      <span className="font-medium text-foreground">{b.factor}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-muted-foreground uppercase px-1.5 py-0.5 rounded bg-muted/40 border border-border/60">
                          {b.impact} impact
                        </span>
                        <span className="font-mono font-bold text-foreground">{b.score}/100</span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${b.score}%`,
                          background: b.score >= 70 ? "#10b981" : b.score >= 50 ? "#f59e0b" : "#f43f5e",
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
