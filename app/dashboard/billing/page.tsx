// app/dashboard/billing/page.tsx
"use client";

import { motion } from "framer-motion";
import {
  FileText,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  Clock,
  Zap,
  ShieldCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";

export default function BillingPage() {
  const { dailyUsage, userProfile } = useAuth();

  const pdfCount = dailyUsage?.pdfCount ?? 0;
  const maxPdf = dailyUsage?.maxPdf ?? 5;
  const pdfPercent = Math.min(100, Math.round((pdfCount / maxPdf) * 100));

  const chatCount = dailyUsage?.chatCount ?? 0;
  const maxChat = dailyUsage?.maxChat ?? 35;
  const chatPercent = Math.min(100, Math.round((chatCount / maxChat) * 100));

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Free Plan Announcement */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl p-5 sm:p-6 border bg-card border-border/80 relative overflow-hidden"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-base tracking-tight text-foreground">Free Student Edition</h2>
                <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono uppercase px-2 py-0.5 rounded font-medium">
                  Active & Uncapped
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                All academic modules and AI engines are 100% unlocked for verified learners. No credit card or paid tiers.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground bg-muted/20 px-3 py-1.5 rounded-lg border border-border/60 shrink-0">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>Resets 00:00 UTC</span>
          </div>
        </div>
      </motion.div>

      {/* Daily Limits Grid */}
      <div className="grid sm:grid-cols-2 gap-5">
        {/* PDF / Document Analysis Quota */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="bg-card border border-border/80 rounded-xl p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                <FileText className="w-4 h-4 text-indigo-400" />
              </div>
              <div>
                <h3 className="font-semibold text-xs sm:text-sm text-foreground">PDF & Syllabus Ingestion</h3>
                <p className="text-[11px] text-muted-foreground">Document parsing capacity</p>
              </div>
            </div>
            <span className="text-sm font-mono font-bold text-foreground">
              {pdfCount} <span className="text-xs text-muted-foreground font-normal">/ {maxPdf}</span>
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  pdfCount >= maxPdf ? "bg-rose-500" : "bg-indigo-500"
                }`}
                style={{ width: `${pdfPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] font-mono text-muted-foreground">
              <span>{maxPdf - pdfCount > 0 ? `${maxPdf - pdfCount} uploads remaining` : "Daily limit reached"}</span>
              <span>{pdfPercent}%</span>
            </div>
          </div>

          <div className="pt-2.5 border-t border-border/60 text-[11px] text-muted-foreground space-y-1">
            <p className="flex items-center gap-1.5">
              <span className="text-indigo-400 font-mono">✦</span> Syllabus & PYQ question pattern extraction
            </p>
            <p className="flex items-center gap-1.5">
              <span className="text-indigo-400 font-mono">✦</span> High-concurrency neural optical parsing
            </p>
          </div>
        </motion.div>

        {/* AI Chat Messages Quota */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="bg-card border border-border/80 rounded-xl p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-semibold text-xs sm:text-sm text-foreground">AI Tutor Queries</h3>
                <p className="text-[11px] text-muted-foreground">Conversational reasoning quota</p>
              </div>
            </div>
            <span className="text-sm font-mono font-bold text-foreground">
              {chatCount} <span className="text-xs text-muted-foreground font-normal">/ {maxChat}</span>
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  chatCount >= maxChat ? "bg-rose-500" : "bg-emerald-500"
                }`}
                style={{ width: `${chatPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] font-mono text-muted-foreground">
              <span>{maxChat - chatCount > 0 ? `${maxChat - chatCount} prompts remaining` : "Daily limit reached"}</span>
              <span>{chatPercent}%</span>
            </div>
          </div>

          <div className="pt-2.5 border-t border-border/60 text-[11px] text-muted-foreground space-y-1">
            <p className="flex items-center gap-1.5">
              <span className="text-emerald-400 font-mono">✦</span> Real-time doubt resolution & problem hints
            </p>
            <p className="flex items-center gap-1.5">
              <span className="text-emerald-400 font-mono">✦</span> Context-aware session memory preserved
            </p>
          </div>
        </motion.div>
      </div>

      {/* Included Free Features Overview */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.16 }}
        className="bg-card border border-border/80 rounded-xl p-5 space-y-3.5"
      >
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <h3 className="font-semibold text-xs sm:text-sm flex items-center gap-2 text-foreground">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
            Active Academic Stack & Modules
          </h3>
          <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">Full Tier</span>
        </div>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2.5">
          {[
            "Syllabus Topic Weightage Mapping",
            "PYQ Exam Frequency Prediction",
            "Exam-Oriented Revision Notes",
            "Handwritten Assignment PDF Export",
            "Interactive Oral Viva Simulator",
            "7-Day Time-Blocked Study Schedule",
            "Academic Performance Risk Modeler",
            "Neural Flashcards & Audio TTS",
            "Firestore Cloud Persistence & Sync",
          ].map((feature, i) => (
            <div
              key={i}
              className="flex items-center gap-2 text-xs text-foreground/80 bg-muted/20 px-3 py-2 rounded-lg border border-border/60"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="truncate">{feature}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
