// app/dashboard/notes/page.tsx
"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Sparkles, Copy, Download, Save, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { saveNote, getUserNotes, incrementUserProfileField } from "@/firebase/firestore";
import { toast } from "sonner";

const NOTE_TYPES = [
  { id: "short", label: "Short Notes", emoji: "📝", desc: "Concise bullet points" },
  { id: "long", label: "Detailed Notes", emoji: "📚", desc: "Comprehensive explanations" },
  { id: "revision", label: "Revision Points", emoji: "🔄", desc: "Quick revision list" },
  { id: "formulas", label: "Formulas", emoji: "🔢", desc: "Key formulas & equations" },
  { id: "definitions", label: "Definitions", emoji: "📖", desc: "Terms & meanings" },
] as const;

type NoteType = typeof NOTE_TYPES[number]["id"];

interface GeneratedNote {
  title: string;
  content: string;
  keyPoints: string[];
  formulas?: string[];
  definitions?: Record<string, string>;
}

interface SavedNote {
  id: string;
  subject: string;
  topic: string;
  type: string;
  content: string;
}

export default function NotesPage() {
  const { user, refreshProfile } = useAuth();
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [noteType, setNoteType] = useState<NoteType>("short");
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState<GeneratedNote | null>(null);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [savedNotes, setSavedNotes] = useState<SavedNote[]>([]);

  useEffect(() => {
    if (user) {
      getUserNotes(user.uid).then((notes) => setSavedNotes(notes as SavedNote[]));
    }
  }, [user]);

  const handleGenerate = async () => {
    if (!subject || !topic) {
      toast.error("Please enter subject and topic");
      return;
    }

    setLoading(true);
    setSaved(false);

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (user) {
        try {
          const token = await user.getIdToken();
          if (token) headers["Authorization"] = `Bearer ${token}`;
        } catch {}
      }

      const response = await fetch("/api/ai/generate-notes", {
        method: "POST",
        headers,
        body: JSON.stringify({ subject, topic, noteType, uid: user?.uid }),
      });

      let data: any = null;
      try {
        const text = await response.text();
        data = text ? JSON.parse(text) : null;
      } catch {}

      if (!response.ok) {
        throw new Error(data?.error || "Generation failed. Please try again.");
      }

      const result = data?.data || data;
      setNote(result);
      if (user) {
        await incrementUserProfileField(user.uid, "aiUsageCount", 1);
        await refreshProfile();
      }
      toast.success("Notes generated successfully!");
    } catch (err: any) {
      toast.error(err?.message || "Failed to generate notes. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!note || !user) return;
    try {
      await saveNote(user.uid, {
        subject,
        topic,
        type: noteType,
        content: note.content,
      });
      setSaved(true);
      toast.success("Notes saved to your library!");
      // Refresh saved notes
      const notes = await getUserNotes(user.uid);
      setSavedNotes(notes as SavedNote[]);
    } catch {
      toast.error("Failed to save notes");
    }
  };

  const handleCopy = () => {
    if (!note) return;
    const text = `${note.title}\n\n${note.content}\n\nKey Points:\n${note.keyPoints.map((p) => `• ${p}`).join("\n")}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Copied to clipboard!");
  };

  const handleDownload = () => {
    if (!note) return;
    const text = `${note.title}\n${"=".repeat(50)}\n\n${note.content}\n\nKey Points:\n${note.keyPoints.map((p) => `• ${p}`).join("\n")}`;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${topic.replace(/\s+/g, "_")}_notes.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h2 className="font-semibold text-base tracking-tight text-foreground">AI Study Notes Generator</h2>
              <p className="text-xs text-muted-foreground">Synthesize high-yield study guides, formula sheets, and key definition compendiums</p>
            </div>
          </div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground px-2 py-0.5 rounded bg-muted/60 border border-border/50 hidden sm:inline">
            5 Note Archetypes
          </span>
        </div>

        {/* Note Type Selection */}
        <div className="mb-5">
          <label className="text-xs font-medium text-foreground mb-2 block">Select Synthesis Format</label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {NOTE_TYPES.map((type) => (
              <button
                key={type.id}
                onClick={() => setNoteType(type.id)}
                className={`p-3 rounded-lg border text-left transition-all ${
                  noteType === type.id
                    ? "border-emerald-500/60 bg-emerald-500/10 text-foreground"
                    : "border-border/70 bg-muted/20 hover:border-border hover:bg-muted/40 text-muted-foreground"
                }`}
              >
                <div className="text-base mb-1">{type.emoji}</div>
                <div className="text-xs font-medium text-foreground">{type.label}</div>
                <div className="text-[10px] text-muted-foreground truncate">{type.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Inputs */}
        <div className="grid sm:grid-cols-2 gap-3.5 mb-4">
          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">Subject or Domain</label>
            <input
              type="text"
              placeholder="e.g. Data Structures & Algorithms, Organic Chemistry"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-border/80 bg-muted/30 text-xs sm:text-sm text-foreground focus:outline-none focus:border-emerald-500 focus:bg-card transition-colors placeholder:text-muted-foreground/60"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">Specific Topic or Chapter</label>
            <input
              type="text"
              placeholder="e.g. Binary Search Trees & AVL Rotations"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-border/80 bg-muted/30 text-xs sm:text-sm text-foreground focus:outline-none focus:border-emerald-500 focus:bg-card transition-colors placeholder:text-muted-foreground/60"
            />
          </div>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={!subject || !topic || loading}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-medium h-10 rounded-lg transition-colors"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Generating Structured Notes...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Synthesize Study Notes</span>
            </div>
          )}
        </Button>
      </motion.div>

      {/* Generated Notes */}
      <AnimatePresence>
        {note && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border/80 rounded-xl overflow-hidden"
          >
            {/* Header */}
            <div className="px-5 py-3.5 border-b border-border/60 flex flex-wrap items-center justify-between gap-3 bg-muted/20">
              <div>
                <h3 className="font-semibold text-sm sm:text-base text-foreground tracking-tight">{note.title}</h3>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-muted border border-border/60 text-muted-foreground">{subject}</span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 capitalize">{noteType}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleCopy} className="h-8 text-xs gap-1.5 border-border/70">
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownload} className="h-8 text-xs gap-1.5 border-border/70">
                  <Download className="w-3.5 h-3.5" />
                  Export .txt
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={saved}
                  className="h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5"
                >
                  {saved ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
                  {saved ? "Saved" : "Save to Library"}
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-4">
                <div>
                  <h4 className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-2.5">Comprehensive Notes</h4>
                  <div className="prose prose-sm dark:prose-invert max-w-none text-xs sm:text-sm text-foreground/90 leading-relaxed bg-muted/20 p-4 rounded-lg border border-border/60">
                    <div
                      dangerouslySetInnerHTML={{
                        __html: note.content
                          .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                          .replace(/\*(.*?)\*/g, "<em>$1</em>")
                          .replace(/^• /gm, "• ")
                          .replace(/\n/g, "<br/>"),
                      }}
                    />
                  </div>
                </div>

                {/* Formulas */}
                {note.formulas && note.formulas.length > 0 && (
                  <div className="bg-card border border-border/70 rounded-lg p-4">
                    <h4 className="text-xs font-semibold text-foreground mb-2.5 flex items-center gap-1.5">
                      <span>📐</span> Key Formulas & Equations
                    </h4>
                    <div className="space-y-1.5">
                      {note.formulas.map((formula, i) => (
                        <div key={i} className="bg-muted/40 rounded px-3 py-2 font-mono text-xs text-foreground border border-border/50">
                          {formula}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Definitions */}
                {note.definitions && Object.keys(note.definitions).length > 0 && (
                  <div className="bg-card border border-border/70 rounded-lg p-4">
                    <h4 className="text-xs font-semibold text-foreground mb-2.5 flex items-center gap-1.5">
                      <span>📖</span> Essential Definitions
                    </h4>
                    <div className="space-y-2">
                      {Object.entries(note.definitions).map(([term, def]) => (
                        <div key={term} className="border border-border/50 rounded-md p-2.5 bg-muted/20">
                          <span className="font-semibold text-emerald-400 text-xs">{term}: </span>
                          <span className="text-xs text-muted-foreground">{def}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Key Points */}
              <div>
                <h4 className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-2.5">High-Yield Takeaways</h4>
                <div className="space-y-2">
                  {note.keyPoints.map((point, i) => (
                    <div key={i} className="flex items-start gap-2.5 p-3 bg-muted/20 rounded-lg border border-border/60">
                      <div className="w-5 h-5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[11px] font-semibold flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </div>
                      <p className="text-xs text-foreground leading-snug">{point}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Saved Notes Library */}
      {savedNotes.length > 0 && (
        <div className="bg-card border border-border/80 rounded-xl p-5">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/60">
            <h3 className="font-semibold text-sm tracking-tight flex items-center gap-2 text-foreground">
              <BookOpen className="w-4 h-4 text-emerald-400" />
              Saved Notes Library
            </h3>
            <span className="text-xs font-mono text-muted-foreground">{savedNotes.length} Items</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {savedNotes.map((n) => (
              <div key={n.id} className="border border-border/70 rounded-lg p-3 bg-muted/20 hover:border-emerald-500/40 hover:bg-muted/40 transition-colors">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border/50 inline-block mb-1.5">
                  {n.subject}
                </span>
                <p className="font-medium text-xs text-foreground truncate">{n.topic}</p>
                <p className="text-[11px] text-muted-foreground capitalize mt-0.5">{n.type} notes</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
