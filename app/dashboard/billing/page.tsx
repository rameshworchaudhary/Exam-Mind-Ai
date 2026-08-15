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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Free Plan Announcement */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl p-6 border bg-card border-border relative overflow-hidden"
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-lg">Free Student Edition</h2>
                <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs">
                  Active & Free
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                All features are 100% unlocked. No subscriptions, trials, or payment cards required.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 px-3 py-1.5 rounded-lg border border-border">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            <span>Quotas reset daily at midnight</span>
          </div>
        </div>
      </motion.div>

      {/* Daily Limits Grid */}
      <div className="grid sm:grid-cols-2 gap-6">
        {/* PDF / Document Analysis Quota */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-2xl p-6 space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                <FileText className="w-4 h-4 text-indigo-400" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">PDF & Syllabus Analysis</h3>
                <p className="text-xs text-muted-foreground">Daily upload allowance</p>
              </div>
            </div>
            <span className="text-lg font-bold">
              {pdfCount} <span className="text-xs text-muted-foreground font-normal">/ {maxPdf}</span>
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  pdfCount >= maxPdf ? "bg-red-500" : "bg-indigo-500"
                }`}
                style={{ width: `${pdfPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{maxPdf - pdfCount > 0 ? `${maxPdf - pdfCount} remaining today` : "Quota reached for today"}</span>
              <span>{pdfPercent}%</span>
            </div>
          </div>

          <div className="pt-2 border-t border-border/60 text-xs text-muted-foreground space-y-1">
            <p>• Applies to Syllabus Analyzer & PYQ Analyzer</p>
            <p>• Powered by high-speed AI processing</p>
          </div>
        </motion.div>

        {/* AI Chat Messages Quota */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-card border border-border rounded-2xl p-6 space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">AI Chat Messages</h3>
                <p className="text-xs text-muted-foreground">Daily conversational queries</p>
              </div>
            </div>
            <span className="text-lg font-bold">
              {chatCount} <span className="text-xs text-muted-foreground font-normal">/ {maxChat}</span>
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  chatCount >= maxChat ? "bg-red-500" : "bg-emerald-500"
                }`}
                style={{ width: `${chatPercent}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{maxChat - chatCount > 0 ? `${maxChat - chatCount} remaining today` : "Quota reached for today"}</span>
              <span>{chatPercent}%</span>
            </div>
          </div>

          <div className="pt-2 border-t border-border/60 text-xs text-muted-foreground space-y-1">
            <p>• Applies to the interactive AI Tutor Chatbot</p>
            <p>• Chat histories are safely preserved</p>
          </div>
        </motion.div>
      </div>

      {/* Included Free Features Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-card border border-border rounded-2xl p-6 space-y-4"
      >
        <h3 className="font-semibold flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          Included Tools & Capabilities
        </h3>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
          {[
            "Syllabus Topic Weightage",
            "PYQ Exam Predictions",
            "Full & Summary Notes",
            "Handwritten Assignment PDF",
            "Interactive Viva Prep & Audio",
            "7-Day Smart Study Planner",
            "Academic Performance Predictor",
            "NVIDIA & High-Speed Groq AI",
            "Durable Firestore Cloud Sync",
          ].map((feature, i) => (
            <div
              key={i}
              className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 px-3 py-2 rounded-xl border border-border/50"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{feature}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
