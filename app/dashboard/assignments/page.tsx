// app/dashboard/assignments/page.tsx
"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PenTool, Sparkles, Download, Eye, FileText, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { saveAssignment, incrementUserProfileField } from "@/firebase/firestore";
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
      const response = await fetch("/api/ai/generate-assignment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      const response = await fetch("/api/ai/generate-handwriting", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          answer: assignment.answer,
          studentName: studentName || userProfile?.displayName || "Student",
          subject,
          inkColor,
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
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-2xl p-6"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <PenTool className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">Handwritten Assignment Generator</h2>
            <p className="text-sm text-muted-foreground">Generate AI answers in handwritten notebook style</p>
          </div>
        </div>

        {/* Student Name + Subject */}
        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              <User className="w-3.5 h-3.5 inline mr-1" />
              Student Name
            </label>
            <input
              type="text"
              placeholder="Your name for the assignment"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-muted/50 text-sm focus:outline-none focus:ring-2 focus:ring-examind-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Subject</label>
            <input
              type="text"
              placeholder="e.g., Computer Science"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-muted/50 text-sm focus:outline-none focus:ring-2 focus:ring-examind-500"
            />
          </div>
        </div>

        {/* Question */}
        <div className="mb-4">
          <label className="text-sm font-medium mb-2 block">Assignment Question</label>
          <textarea
            rows={3}
            placeholder="Enter your assignment question here..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-border bg-muted/50 text-sm focus:outline-none focus:ring-2 focus:ring-examind-500 resize-none"
          />
        </div>

        {/* Ink Color */}
        <div className="mb-5">
          <label className="text-sm font-medium mb-2 block">Ink Color</label>
          <div className="flex gap-2">
            {inkColors.map((ink) => (
              <button
                key={ink.color}
                onClick={() => setInkColor(ink.color)}
                title={ink.label}
                className={`w-8 h-8 rounded-full border-2 transition-all ${
                  inkColor === ink.color ? "border-examind-500 scale-110" : "border-transparent hover:border-muted-foreground"
                }`}
                style={{ background: ink.color }}
              />
            ))}
          </div>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={!question || !subject || loading}
          className="w-full bg-examind-600 hover:bg-examind-700 text-white h-11"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Generating Answer...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Generate Assignment Answer
            </div>
          )}
        </Button>
      </motion.div>

      {/* Generated Answer Preview */}
      <AnimatePresence>
        {assignment && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-2xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-500" />
                Generated Answer
                <span className="text-xs text-muted-foreground font-normal">({assignment.wordCount} words)</span>
              </h3>
              <Button
                onClick={handleGeneratePDF}
                disabled={generating}
                size="sm"
                className="bg-amber-500 hover:bg-amber-600 text-white gap-1.5"
              >
                {generating ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <PenTool className="w-3.5 h-3.5" />
                )}
                {generating ? "Creating..." : "Make Handwritten"}
              </Button>
            </div>

            {/* Answer Sections */}
           {/* Answer Sections */}
         <div className="space-y-4">
  {Array.isArray(assignment?.sections) && assignment.sections.length > 0 ? (
    assignment.sections.map((section, i) => (
      <div key={i} className="border-l-2 border-examind-500 pl-4">
        <h4 className="font-semibold text-sm text-examind-600 mb-2">
          {section.heading}
        </h4>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {section.content}
        </p>
      </div>
    ))
  ) : (
    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-2xl overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2">
                <Eye className="w-4 h-4 text-amber-500" />
                Handwritten Preview
              </h3>
              <Button
                onClick={handleDownloadPDF}
                className="bg-green-600 hover:bg-green-700 text-white gap-1.5"
                size="sm"
              >
                <Download className="w-3.5 h-3.5" />
                Download PDF
              </Button>
            </div>

            {/* Notebook Style Preview */}
            <div className="p-6 bg-gray-100 dark:bg-gray-900">
              <div
                className="max-w-2xl mx-auto bg-amber-50 rounded-lg shadow-lg overflow-hidden"
                style={{
                  backgroundImage: `
                    repeating-linear-gradient(
                      transparent,
                      transparent 37px,
                      #c8d3e8 37px,
                      #c8d3e8 38px
                    )
                  `,
                  minHeight: "400px",
                  padding: "40px 60px 40px 100px",
                  position: "relative",
                  fontFamily: "'Caveat', cursive",
                  fontSize: "18px",
                  color: inkColor,
                  lineHeight: "38px",
                }}
              >
                {/* Red margin line */}
                <div
                  style={{
                    position: "absolute",
                    left: "80px",
                    top: 0,
                    bottom: 0,
                    width: "2px",
                    background: "#e88080",
                    opacity: 0.7,
                  }}
                />

                {/* Header */}
                <div style={{ marginBottom: "38px", transform: "rotate(-0.3deg)" }}>
                  <strong>Q: {question}</strong>
                </div>

                {/* Answer sections */}
                <div style={{ transform: "rotate(-0.2deg)" }}>
                  <strong>Ans: </strong>
                  {assignment?.sections.map((s, i) => (
                    <div key={i} style={{ marginBottom: "10px" }}>
                      <u>{s.heading}</u>
                      <br />
                      {s.content.slice(0, 200)}...
                    </div>
                  ))}
                </div>

                <p className="mt-4 text-xs opacity-60">[Preview — Download PDF for full content]</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-2xl p-4">
        <p className="text-sm text-blue-700 dark:text-blue-400">
          <strong>✍️ How it works:</strong> Enter your assignment question → AI generates a proper academic answer →
          Click "Make Handwritten" → Get a beautiful notebook-style PDF with blue ink, ruled lines, and margins.
          The PDF looks like genuine handwritten work!
        </p>
      </div>
    </div>
  );
}
