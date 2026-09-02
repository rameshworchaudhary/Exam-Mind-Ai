// app/dashboard/syllabus/page.tsx
"use client";
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, FileText, Brain, ChevronDown, ChevronUp,
  Sparkles, AlertCircle, CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/lib/auth-context";
import { saveUpload, incrementUserProfileField } from "@/firebase/firestore";
import { toast } from "sonner";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

const COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe", "#3b82f6"];

interface SyllabusAnalysis {
  units: Array<{ name: string; topics: string[]; weightage: number }>;
  summary: string;
  importantTopics: string[];
  totalTopics: number;
}

export default function SyllabusAnalyzerPage() {
  const { user, refreshProfile } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [analysis, setAnalysis] = useState<SyllabusAnalysis | null>(null);
  const [expandedUnit, setExpandedUnit] = useState<number | null>(null);
  const [subject, setSubject] = useState("");

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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (!dropped) return;
    const mockEvent = {
      target: { files: [dropped] },
    } as unknown as React.ChangeEvent<HTMLInputElement>;
    handleFileSelect(mockEvent);
  };

  const handleAnalyze = async () => {
    if (!file || !user) {
      toast.error("Please select a file");
      return;
    }
    try {
      setLoading(true);
      setProgress(15);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("subject", subject || "General");

      setProgress(40);

      const headers: Record<string, string> = {};
      try {
        const token = await user.getIdToken();
        if (token) headers["Authorization"] = `Bearer ${token}`;
      } catch {}

      setProgress(60);

      const response = await fetch("/api/ai/analyze-syllabus", {
        method: "POST",
        headers,
        body: formData,
      });

      let data: any = null;
      try {
        const resText = await response.text();
        data = resText ? JSON.parse(resText) : null;
      } catch {}

      if (!response.ok) {
        throw new Error(data?.error || "Analysis failed");
      }

      setProgress(80);

      // ✅ Direct data use karo — no result wrapper
      const analysisData: SyllabusAnalysis = {
        units: Array.isArray(data?.units) ? data.units : [],
        summary: data?.summary || "No summary available",
        importantTopics: Array.isArray(data?.importantTopics) ? data.importantTopics : [],
        totalTopics: typeof data?.totalTopics === "number" ? data.totalTopics : 0,
      };

      setAnalysis(analysisData);

      await saveUpload(user.uid, {
        type: "syllabus",
        fileName: file.name,
        fileUrl: "",
        subject: subject || "General",
        analysis: JSON.parse(JSON.stringify(analysisData)),
      });

      await incrementUserProfileField(user.uid, "aiUsageCount", 1);
      await refreshProfile();
      setProgress(100);
      toast.success("Syllabus analyzed successfully! 🎉");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Analysis failed";
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const chartData = analysis?.units?.map((unit) => ({
    name: unit?.name?.length > 20 ? unit.name.substring(0, 20) + "..." : unit?.name || "Unit",
    value: unit?.weightage || 0,
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
            <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <FileText className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <h2 className="font-semibold text-base tracking-tight text-foreground">Syllabus Breakdown</h2>
              <p className="text-xs text-muted-foreground">Upload your syllabus to see units, chapter marks, and high-weight topics</p>
            </div>
          </div>
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground px-2 py-0.5 rounded bg-muted/60 border border-border/50 hidden sm:inline">
            PDF • TXT
          </span>
        </div>

        {/* Subject Input */}
        <div className="mb-4">
          <label className="text-xs font-medium text-foreground mb-1.5 block">
            Subject or Course Name <span className="text-muted-foreground font-normal">(Optional)</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Data Structures & Algorithms (Unit 1 to 5)"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full px-3.5 py-2 rounded-lg border border-border/80 bg-muted/30 text-xs sm:text-sm text-foreground focus:outline-none focus:border-indigo-500 focus:bg-card transition-colors placeholder:text-muted-foreground/60"
          />
        </div>

        {/* Upload Zone */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileRef.current?.click()}
          className={`border border-dashed rounded-xl p-6 sm:p-8 text-center cursor-pointer transition-all ${
            file
              ? "border-indigo-500/60 bg-indigo-500/5"
              : "border-border/80 hover:border-indigo-500/40 hover:bg-muted/20"
          }`}
        >
          <input ref={fileRef} type="file" accept=".pdf,.txt" className="hidden" onChange={handleFileSelect} />
          {file ? (
            <div className="flex items-center justify-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-left">
                <p className="font-medium text-xs sm:text-sm text-foreground">{file.name}</p>
                <p className="text-[11px] text-muted-foreground">{(file.size / 1024).toFixed(1)} KB • Click to choose a different file</p>
              </div>
            </div>
          ) : (
            <div>
              <div className="w-10 h-10 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center mx-auto mb-2.5">
                <Upload className="w-4 h-4 text-zinc-600" />
              </div>
              <p className="font-medium text-xs sm:text-sm text-foreground mb-0.5">Drop your syllabus file here</p>
              <p className="text-[11px] text-muted-foreground">or click to browse from your device • PDF or TXT up to 10MB</p>
            </div>
          )}
        </div>

        {/* Progress */}
        {loading && (
          <div className="mt-4 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">
                {progress < 40 ? "Reading syllabus text..." : progress < 70 ? "Finding units and chapter topics..." : progress < 90 ? "Calculating topic marks & weightage..." : "Almost ready..."}
              </span>
              <span className="font-medium text-indigo-600">{progress}%</span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>
        )}

        <Button
          onClick={handleAnalyze}
          disabled={!file || loading}
          className="mt-4 w-full bg-zinc-900 hover:bg-zinc-800 text-white text-xs sm:text-sm font-medium h-10 rounded-lg transition-colors"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Analyzing Syllabus...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Break Down Syllabus</span>
            </div>
          )}
        </Button>
      </motion.div>

      {/* Results */}
      <AnimatePresence>
        {analysis && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Summary */}
            <div className="bg-card border border-border/80 rounded-xl p-5 sm:p-6">
              <div className="flex justify-between items-center pb-3 mb-3 border-b border-border/60">
                <h3 className="font-semibold text-sm tracking-tight flex items-center gap-2 text-foreground">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  Executive Summary
                </h3>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border/50">
                  {analysis.totalTopics} Topics Detected
                </span>
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{analysis.summary}</p>
              
              {analysis.importantTopics?.length > 0 && (
                <div className="mt-4 pt-3 border-t border-border/50">
                  <p className="text-xs font-medium text-foreground mb-2 flex items-center gap-1.5">
                    <span className="text-amber-400">★</span> High-Yield Focus Topics
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.importantTopics.map((topic) => (
                      <span
                        key={topic}
                        className="text-[11px] font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2 py-0.5 rounded-md"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Chart + Units */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-card border border-border/80 rounded-xl p-5 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm tracking-tight text-foreground">Weightage Distribution</h3>
                  <span className="text-[10px] font-mono text-muted-foreground uppercase">Estimated %</span>
                </div>
                <div className="h-60 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {chartData.map((_, index) => (
                          <Cell key={index} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value) => [`${value}%`, "Weightage"]}
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-card border border-border/80 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-sm tracking-tight text-foreground">Unit Breakdown</h3>
                  <span className="text-xs font-mono text-muted-foreground">{analysis.units.length} Modules</span>
                </div>
                <div className="space-y-2">
                  {analysis.units.map((unit, i) => (
                    <div key={i} className="border border-border/70 rounded-lg overflow-hidden bg-muted/20">
                      <button
                        onClick={() => setExpandedUnit(expandedUnit === i ? null : i)}
                        className="w-full flex items-center gap-3 p-2.5 hover:bg-muted/40 transition-colors text-left"
                      >
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{unit.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${unit.weightage}%`, background: COLORS[i % COLORS.length] }}
                              />
                            </div>
                            <span className="text-[10px] font-mono text-muted-foreground shrink-0">{unit.weightage}%</span>
                          </div>
                        </div>
                        {expandedUnit === i ? <ChevronUp className="w-3.5 h-3.5 shrink-0 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />}
                      </button>
                      <AnimatePresence>
                        {expandedUnit === i && (
                          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                            <div className="px-3 pb-3 pt-1 border-t border-border/50 bg-muted/30">
                              <p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground mb-1.5">Subtopics Covered:</p>
                              <div className="flex flex-wrap gap-1">
                                {unit.topics.map((topic) => (
                                  <span key={topic} className="text-[11px] bg-card border border-border/60 px-2 py-0.5 rounded text-foreground">
                                    {topic}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Strategic note */}
            <div className="bg-card border border-border/80 rounded-xl p-4 flex items-start gap-3 text-xs">
              <AlertCircle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <p className="text-muted-foreground">
                <strong className="text-foreground font-medium">Strategic Tip:</strong> Prioritize top 2 modules by weightage first to guarantee foundational exam score before moving to lower-yield chapters.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}