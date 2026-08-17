// app/dashboard/assignments/page.tsx
"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PenTool, Sparkles, Download, Eye, FileText, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { saveAssignment, incrementUserProfileField } from "@/firebase/firestore";
import { getAuthHeaders } from "@/firebase/auth";
import { toast } from "sonner";

interface AssignmentData {
  answer: string;
  wordCount: number;
  sections: Array<{ heading: string; content: string }>;
}

export default function AssignmentsPage() {
  const { user, userProfile, refreshProfile } = useAuth();
  const previewRef = useRef<HTMLDivElement>(null);
  const [question, setQuestion] = useState("");
  const [subject, setSubject] = useState("");
  const [studentName, setStudentName] = useState(userProfile?.displayName || "");
  const [inkColor, setInkColor] = useState("#1a3a6b");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [assignment, setAssignment] = useState<AssignmentData | null>(null);
  const [htmlContent, setHtmlContent] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  const handleGenerate = async () => {
    if (!question || !subject) {
      toast.error("Please enter question and subject");
      return;
    }
    setLoading(true);
    setAssignment(null);
    setHtmlContent("");
    setShowPreview(false);

    try {
      const authHeaders = await getAuthHeaders(user);
      const response = await fetch("/api/ai/generate-assignment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({
          question,
          subject,
          uid: user?.uid,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => null);
        throw new Error(errData?.error || "Generation failed");
      }

      const result = await response.json();
      const assignmentData: AssignmentData = {
        answer: result.answer || result.data?.answer || "",
        wordCount: result.wordCount || result.data?.wordCount || 0,
        sections: Array.isArray(result.sections) && result.sections.length > 0
          ? result.sections
          : Array.isArray(result.data?.sections) && result.data.sections.length > 0
          ? result.data.sections
          : [{ heading: "Solution", content: result.answer || result.data?.answer || "" }],
      };
      setAssignment(assignmentData);
      if (user) {
        await incrementUserProfileField(user.uid, "aiUsageCount", 1);
        await refreshProfile();
      }
      toast.success("Assignment answer generated!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to generate assignment. Try again.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePDF = async () => {
    if (!assignment) return;
    setGenerating(true);

    try {
      // Generate handwritten HTML
      const authHeaders = await getAuthHeaders(user);
      const response = await fetch("/api/ai/generate-handwriting", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({
          question,
          answer: assignment.answer,
          studentName: studentName || userProfile?.displayName || "Student",
          subject,
          inkColor,
          uid: user?.uid,
        }),
      });

      if (!response.ok) throw new Error("HTML generation failed");

      const { html } = await response.json();
      setHtmlContent(html);
      setShowPreview(true);

      // Save to Firestore
      if (user) {
        await saveAssignment(user.uid, {
          question,
          answer: assignment.answer,
          subject,
        });
        await incrementUserProfileField(user.uid, "aiUsageCount", 1);
        await refreshProfile();
      }

      toast.success("Handwritten assignment ready! Click Download PDF.");
    } catch {
      toast.error("Failed to generate handwritten PDF");
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!htmlContent) return;
    const toastId = toast.loading("Generating PDF...");

    try {
      const { generatePDF } = await import("@/hooks");
      const fileName = `${subject.replace(/\s+/g, "_")}_assignment.pdf`;
      await generatePDF(htmlContent, fileName);
      toast.dismiss(toastId);
      toast.success("PDF downloaded successfully!");
    } catch {
      toast.dismiss(toastId);
      toast.error("PDF download failed. Please try again.");
    }
  };

  const inkColors = [
    { color: "#1a3a6b", label: "Navy Blue" },
    { color: "#1a1a2e", label: "Dark Blue" },
    { color: "#000080", label: "Royal Blue" },
    { color: "#2c5f2e", label: "Dark Green" },
    { color: "#1a1a1a", label: "Black" },
    { color: "#6b1a1a", label: "Dark Red" },
  ];

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
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <PenTool className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h2 className="font-semibold text-base tracking-tight text-foreground">Handwritten Assignment Generator</h2>
              <p className="text-xs text-muted-foreground">Draft academic responses formatted with organic handwriting ink on ruled paper</p>
            </div>
          </div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground px-2 py-0.5 rounded bg-muted/60 border border-border/50 hidden sm:inline">
            PDF Renderer
          </span>
        </div>

        {/* Student Name + Subject */}
        <div className="grid sm:grid-cols-2 gap-3.5 mb-4">
          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 flex items-center gap-1">
              <User className="w-3 h-3 text-muted-foreground" />
              Student / Submitter Name
            </label>
            <input
              type="text"
              placeholder="e.g. Alex Henderson"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-border/80 bg-muted/30 text-xs sm:text-sm text-foreground focus:outline-none focus:border-amber-500 focus:bg-card transition-colors placeholder:text-muted-foreground/60"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">Subject / Module</label>
            <input
              type="text"
              placeholder="e.g. CS302 Database Architecture"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-border/80 bg-muted/30 text-xs sm:text-sm text-foreground focus:outline-none focus:border-amber-500 focus:bg-card transition-colors placeholder:text-muted-foreground/60"
            />
          </div>
        </div>

        {/* Question */}
        <div className="mb-4">
          <label className="text-xs font-medium text-foreground mb-1.5 block">Assignment Prompt or Question</label>
          <textarea
            rows={3}
            placeholder="Type or paste the full assignment problem statement or essay prompt..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-lg border border-border/80 bg-muted/30 text-xs sm:text-sm text-foreground focus:outline-none focus:border-amber-500 focus:bg-card transition-colors placeholder:text-muted-foreground/60 resize-none"
          />
        </div>

        {/* Ink Color */}
        <div className="mb-5">
          <label className="text-xs font-medium text-foreground mb-2 block">Ink Simulation Color</label>
          <div className="flex flex-wrap gap-2">
            {inkColors.map((ink) => (
              <button
                key={ink.color}
                onClick={() => setInkColor(ink.color)}
                title={ink.label}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-medium transition-all ${
                  inkColor === ink.color
                    ? "border-amber-500 bg-amber-500/10 text-foreground"
                    : "border-border/60 bg-muted/20 text-muted-foreground hover:border-border"
                }`}
              >
                <span className="w-3 h-3 rounded-full border border-black/20" style={{ background: ink.color }} />
                <span>{ink.label}</span>
              </button>
            ))}
          </div>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={!question || !subject || loading}
          className="w-full bg-amber-600 hover:bg-amber-500 text-white text-xs sm:text-sm font-medium h-10 rounded-lg transition-colors"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Synthesizing Academic Answer...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Generate Assignment Solution</span>
            </div>
          )}
        </Button>
      </motion.div>

      {/* Generated Answer Preview */}
      <AnimatePresence>
        {assignment && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border/80 rounded-xl p-5 sm:p-6"
          >
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-border/60">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-400" />
                <h3 className="font-semibold text-sm tracking-tight text-foreground">Generated Solution</h3>
                <span className="text-[11px] font-mono text-muted-foreground">({assignment.wordCount} words)</span>
              </div>
              <Button
                onClick={handleGeneratePDF}
                disabled={generating}
                size="sm"
                className="h-8 text-xs bg-amber-600 hover:bg-amber-500 text-white gap-1.5"
              >
                {generating ? (
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <PenTool className="w-3.5 h-3.5" />
                )}
                {generating ? "Formatting..." : "Convert to Handwriting"}
              </Button>
            </div>

            {/* Answer Sections */}
            <div className="space-y-3">
              {Array.isArray(assignment?.sections) && assignment.sections.length > 0 ? (
                assignment.sections.map((section, i) => (
                  <div key={i} className="border-l-2 border-amber-500/80 pl-3.5 py-0.5">
                    <h4 className="font-medium text-xs text-amber-400 mb-1">{section.heading}</h4>
                    <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed">{section.content}</p>
                  </div>
                ))
              ) : (
                <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
                  {assignment?.answer || "No answer generated"}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Handwritten Preview */}
      <AnimatePresence>
        {showPreview && htmlContent && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border/80 rounded-xl overflow-hidden"
          >
            <div className="px-5 py-3.5 border-b border-border/60 flex items-center justify-between bg-muted/20">
              <h3 className="font-semibold text-sm tracking-tight flex items-center gap-2 text-foreground">
                <Eye className="w-4 h-4 text-amber-400" />
                Handwritten Notebook Render
              </h3>
              <Button
                onClick={handleDownloadPDF}
                className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5"
                size="sm"
              >
                <Download className="w-3.5 h-3.5" />
                Download PDF
              </Button>
            </div>

            {/* Notebook Style Preview */}
            <div className="p-4 sm:p-6 bg-muted/30">
              <div
                className="max-w-2xl mx-auto bg-[#faf8f0] text-slate-900 rounded-lg shadow-sm border border-border/50 overflow-hidden"
                style={{
                  backgroundImage: `
                    repeating-linear-gradient(
                      transparent,
                      transparent 37px,
                      #d4dceb 37px,
                      #d4dceb 38px
                    )
                  `,
                  minHeight: "360px",
                  padding: "36px 40px 36px 70px",
                  position: "relative",
                  fontFamily: "'Caveat', cursive, sans-serif",
                  fontSize: "18px",
                  color: inkColor,
                  lineHeight: "38px",
                }}
              >
                {/* Red margin line */}
                <div
                  style={{
                    position: "absolute",
                    left: "55px",
                    top: 0,
                    bottom: 0,
                    width: "1.5px",
                    background: "#e88080",
                    opacity: 0.6,
                  }}
                />

                {/* Header */}
                <div style={{ marginBottom: "38px", transform: "rotate(-0.2deg)" }}>
                  <strong>Q: {question}</strong>
                </div>

                {/* Answer sections */}
                <div style={{ transform: "rotate(-0.1deg)" }}>
                  <strong>Ans: </strong>
                  {assignment?.sections.map((s, i) => (
                    <div key={i} style={{ marginBottom: "10px" }}>
                      <u>{s.heading}</u>
                      <br />
                      {s.content.slice(0, 200)}...
                    </div>
                  ))}
                </div>

                <p className="mt-4 text-[11px] opacity-60 font-sans">[Preview Mode — Click Download PDF for high-res vector rendering]</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info Banner */}
      <div className="bg-card border border-border/80 rounded-xl p-4 flex items-start gap-3 text-xs">
        <PenTool className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <p className="text-muted-foreground">
          <strong className="text-foreground font-medium">Assignment Engine:</strong> Enter problem statement → AI constructs an academic rubric solution → Convert into high-resolution ruled paper with natural stroke variation and margin lines.
        </p>
      </div>
    </div>
  );
}
