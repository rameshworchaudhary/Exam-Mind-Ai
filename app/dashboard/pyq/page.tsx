// app/dashboard/pyq/page.tsx
"use client";
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp, Upload, Sparkles, CheckCircle,
  AlertTriangle, BarChart3, Target, Repeat,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/lib/auth-context";
import { saveUpload, savePrediction, incrementUserProfileField } from "@/firebase/firestore";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { getProbabilityColor } from "@/utils";

interface PYQAnalysis {
  repeatedQuestions: Array<{ question: string; frequency: number; probability: number }>;
  importantTopics: Array<{ topic: string; weightage: number }>;
  predictions: Array<{ question: string; probability: number; reasoning: string }>;
  trends: string[];
}

export default function PYQPage() {
  const { user, refreshProfile } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [subject, setSubject] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analysis, setAnalysis] = useState<PYQAnalysis | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    if (selected.type !== "application/pdf" && !selected.type.startsWith("text/")) {
      toast.error("Please upload PDF or TXT file");
      return;
    }
    if (selected.size > 10 * 1024 * 1024) {
      toast.error("File size must be under 10MB");
      return;
    }
    setFile(selected);
    setAnalysis(null);
  };

  const handleAnalyze = async () => {
    if (!file || !user) {
      toast.error("Please select a file");
      return;
    }
    try {
      setLoading(true);
      setUploadProgress(10);

      const extractedText = await file.text();
      setUploadProgress(30);

      if (!extractedText || extractedText.trim().length < 10) {
        toast.error("File appears empty or unreadable");
        setLoading(false);
        return;
      }

      setUploadProgress(50);

      const response = await fetch("/api/ai/analyze-pyq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: extractedText.slice(0, 3000),
          subject: subject || "General",
          uid: user.uid,
        }),
      });

      const data = await response.json();
      console.log("PYQ API Response:", data);

      if (!response.ok) {
        throw new Error(data?.error || "PYQ analysis failed");
      }

      setUploadProgress(80);

      // ✅ Safe data extraction
      const safeAnalysis: PYQAnalysis = {
        repeatedQuestions: Array.isArray(data?.repeatedQuestions) ? data.repeatedQuestions : [],
        importantTopics: Array.isArray(data?.importantTopics) ? data.importantTopics : [],
        predictions: Array.isArray(data?.predictions) ? data.predictions : [],
        trends: Array.isArray(data?.trends) ? data.trends : [],
      };

      await saveUpload(user.uid, {
        type: "pyq",
        fileName: file.name,
        fileUrl: "",
        subject: subject || "General",
        analysis: JSON.parse(JSON.stringify(safeAnalysis)),
      });

      await savePrediction(user.uid, {
        type: "pyq",
        subject: subject || "General",
        ...safeAnalysis,
      });

      await incrementUserProfileField(user.uid, "aiUsageCount", 1);
      await refreshProfile();
      setUploadProgress(100);
      setAnalysis(safeAnalysis);
      toast.success("PYQ analysis complete! 🎉");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Analysis failed";
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const topicChartData = analysis?.importantTopics?.slice(0, 8).map((t) => ({
    topic: t.topic.length > 15 ? t.topic.slice(0, 15) + "..." : t.topic,
    weightage: t.weightage,
  })) || [];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Upload Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border/80 rounded-xl p-5 sm:p-6"
      >
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-sky-400" />
            </div>
            <div>
              <h2 className="font-semibold text-base tracking-tight text-foreground">PYQ Pattern & Question Predictor</h2>
              <p className="text-xs text-muted-foreground">Upload past year question papers to uncover question recurrence and high-probability topics</p>
            </div>
          </div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground px-2 py-0.5 rounded bg-muted/60 border border-border/50 hidden sm:inline">
            Multi-Year AI Analysis
          </span>
        </div>

        <div className="mb-4">
          <label className="text-xs font-medium text-foreground mb-1.5 block">
            Subject or Course Title <span className="text-muted-foreground font-normal">(Optional)</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Mathematics, Operating Systems, Database Management"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full px-3.5 py-2 rounded-lg border border-border/80 bg-muted/30 text-xs sm:text-sm text-foreground focus:outline-none focus:border-sky-500 focus:bg-card transition-colors placeholder:text-muted-foreground/60"
          />
        </div>

        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const dropped = e.dataTransfer.files[0];
            if (dropped) {
              const mockEvent = { target: { files: [dropped] } } as unknown as React.ChangeEvent<HTMLInputElement>;
              handleFileSelect(mockEvent);
            }
          }}
          className={`border border-dashed rounded-xl p-6 sm:p-8 text-center cursor-pointer transition-all ${
            file
              ? "border-sky-500/60 bg-sky-500/5"
              : "border-border/80 hover:border-sky-500/40 hover:bg-muted/20"
          }`}
        >
          <input ref={fileRef} type="file" accept=".pdf,.txt" className="hidden" onChange={handleFileSelect} />
          {file ? (
            <div className="flex items-center justify-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-left">
                <p className="font-medium text-xs sm:text-sm text-foreground">{file.name}</p>
                <p className="text-[11px] font-mono text-muted-foreground">{(file.size / 1024).toFixed(1)} KB • Click to replace file</p>
              </div>
            </div>
          ) : (
            <div>
              <div className="w-10 h-10 rounded-full bg-muted/60 border border-border/60 flex items-center justify-center mx-auto mb-2.5">
                <Upload className="w-4 h-4 text-muted-foreground" />
              </div>
              <p className="font-medium text-xs sm:text-sm text-foreground mb-0.5">Upload Past Exam Papers (PDF/TXT)</p>
              <p className="text-[11px] text-muted-foreground">Combine multiple years into single document for optimal pattern recognition</p>
            </div>
          )}
        </div>

        {loading && (
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-muted-foreground">
                {uploadProgress < 35 ? "Parsing previous questions..." : uploadProgress < 60 ? "Calculating recurrence algorithms..." : uploadProgress < 90 ? "Predicting upcoming examination questions..." : "Finalizing..."}
              </span>
              <span className="font-medium text-sky-400">{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="h-1.5" />
          </div>
        )}

        <Button
          onClick={handleAnalyze}
          disabled={!file || loading}
          className="mt-4 w-full bg-sky-600 hover:bg-sky-500 text-white text-xs sm:text-sm font-medium h-10 rounded-lg transition-colors"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Analyzing Recurrence Matrix...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Predict Probable Exam Questions</span>
            </div>
          )}
        </Button>
      </motion.div>

      {/* Results */}
      <AnimatePresence>
        {analysis && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Trends */}
            <div className="bg-card border border-border/80 rounded-xl p-5">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/60">
                <h3 className="font-semibold text-sm tracking-tight flex items-center gap-2 text-foreground">
                  <BarChart3 className="w-4 h-4 text-sky-400" />
                  Key Pattern Observations
                </h3>
                <span className="text-[10px] font-mono text-muted-foreground uppercase">{analysis.trends.length} Identified</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {analysis.trends.length > 0 ? (
                  analysis.trends.map((trend, i) => (
                    <span
                      key={i}
                      className="text-xs bg-sky-500/10 text-sky-300 border border-sky-500/20 px-2.5 py-1 rounded-md"
                    >
                      {trend}
                    </span>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">No recurring trends detected</p>
                )}
              </div>
            </div>

            {/* Chart + Repeated Questions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-card border border-border/80 rounded-xl p-5 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm tracking-tight text-foreground">Topic Recurrence Distribution</h3>
                  <span className="text-[10px] font-mono text-muted-foreground uppercase">Frequency Score</span>
                </div>
                {topicChartData.length > 0 ? (
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topicChartData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" className="opacity-40" />
                        <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                        <YAxis type="category" dataKey="topic" tick={{ fontSize: 10, fill: "hsl(var(--foreground))" }} axisLine={false} tickLine={false} width={100} />
                        <Tooltip
                          contentStyle={{
                            background: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                            fontSize: "11px",
                          }}
                        />
                        <Bar dataKey="weightage" fill="#0284c7" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No topic frequency data available</p>
                )}
              </div>

              <div className="bg-card border border-border/80 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm tracking-tight flex items-center gap-2 text-foreground">
                    <Repeat className="w-4 h-4 text-sky-400" />
                    Repeated Questions
                  </h3>
                  <span className="text-xs font-mono text-muted-foreground">{analysis.repeatedQuestions.length} Found</span>
                </div>
                {analysis.repeatedQuestions.length > 0 ? (
                  <div className="space-y-2.5 max-h-[230px] overflow-y-auto pr-1">
                    {analysis.repeatedQuestions.map((q, i) => (
                      <div key={i} className="border border-border/70 rounded-lg p-3 bg-muted/20">
                        <p className="text-xs font-medium text-foreground mb-2 leading-snug">{q.question}</p>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-muted-foreground font-mono">Appeared in {q.frequency} papers</span>
                          <span className={`font-mono font-semibold ${getProbabilityColor(q.probability)}`}>{q.probability}% probability</span>
                        </div>
                        <div className="h-1 bg-muted rounded-full mt-1.5 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${q.probability}%`,
                              background: q.probability >= 80 ? "#10b981" : q.probability >= 60 ? "#f59e0b" : "#ef4444",
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No exact recurring questions found</p>
                )}
              </div>
            </div>

            {/* Predicted Questions */}
            <div className="bg-card border border-border/80 rounded-xl p-5">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-border/60">
                <h3 className="font-semibold text-sm tracking-tight flex items-center gap-2 text-foreground">
                  <Target className="w-4 h-4 text-sky-400" />
                  High-Probability Exam Predictions
                </h3>
                <span className="text-xs font-mono text-muted-foreground">{analysis.predictions.length} Predictions</span>
              </div>
              {analysis.predictions.length > 0 ? (
                <div className="space-y-3">
                  {analysis.predictions.map((pred, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="border border-border/70 rounded-lg p-3.5 bg-muted/20 hover:border-sky-500/40 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2.5 mb-1.5">
                            <span className="w-5 h-5 rounded bg-sky-500/20 text-sky-300 font-mono text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5">
                              {i + 1}
                            </span>
                            <p className="font-medium text-xs sm:text-sm text-foreground leading-snug">{pred.question}</p>
                          </div>
                          <p className="text-[11px] text-muted-foreground pl-7 leading-relaxed">{pred.reasoning}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <div className={`text-base font-mono font-bold ${getProbabilityColor(pred.probability)}`}>
                            {pred.probability}%
                          </div>
                          <div className="text-[10px] font-mono text-muted-foreground uppercase">Probability</div>
                        </div>
                      </div>
                      <div className="h-1 bg-muted rounded-full mt-2.5 ml-7 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${pred.probability}%`,
                            background: pred.probability >= 80 ? "#10b981" : pred.probability >= 60 ? "#f59e0b" : "#ef4444",
                          }}
                        />
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No predictions generated yet</p>
              )}
            </div>

            {/* Warning */}
            <div className="bg-card border border-border/80 rounded-xl p-4 flex items-start gap-3 text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-muted-foreground">
                <strong className="text-foreground font-medium">Predictive Disclaimer:</strong> Forecasts are calculated from historical recurrence frequency. Maintain comprehensive syllabus coverage while prioritizing these target questions.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}