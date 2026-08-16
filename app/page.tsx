// app/page.tsx
"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Brain,
  BookOpen,
  PenTool,
  TrendingUp,
  MessageSquare,
  Calendar,
  Star,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Zap,
  Shield,
  ArrowDown,
  FileText,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/Logo";

const features = [
  {
    icon: FileText,
    title: "Syllabus Breakdown",
    description: "Upload your syllabus PDF. We break it into simple units, high-weight topics, and must-know concepts.",
  },
  {
    icon: TrendingUp,
    title: "Past Exam Questions (PYQ)",
    description: "Upload past question papers. Spot repeating questions and topics teachers ask every semester.",
  },
  {
    icon: BookOpen,
    title: "Clear Revision Notes",
    description: "Get crisp summary points, key formulas, and short definitions that you can quickly read before your exam.",
  },
  {
    icon: PenTool,
    title: "Handwritten Assignment Maker",
    description: "Turn typed answers into realistic notebook pages with blue ink and ruled lines, ready to print or submit.",
  },
  {
    icon: MessageSquare,
    title: "Helpful Doubt Solver",
    description: "Stuck on a tricky concept? Ask in plain words and get step-by-step answers without confusing jargon.",
  },
  {
    icon: Calendar,
    title: "Realistic Study Planner",
    description: "Tell us your exam date. We build a practical day-by-day timetable that you can actually finish.",
  },
];

const stats = [
  { value: "50+", label: "Happy Students" },
  { value: "98%", label: "Exam Pass Rate" },
  { value: "100+", label: "Notes Created" },
  { value: "4.9 ★", label: "Student Rating" },
];

const testimonials = [
  {
    name: "Ishwor Chaudhary",
    college: "Chandigarh University",
    text: "PadhaiHub helped me spot 8 out of 10 questions that actually appeared in our final exam! The past paper tool is a lifesaver.",
    avatar: "IC",
  },
  {
    name: "Rahul Chaudhary",
    college: "Chandigarh University",
    text: "The handwritten assignment maker saved my weekends. The notebook ruled paper looks completely genuine and neat.",
    avatar: "RC",
  },
  {
    name: "Rajkapoor Chaudhary",
    college: "Pokhara University Nepal",
    text: "The study planner is so practical. Instead of making unrealistic 12-hour timetables, it gave me a simple daily plan that got me 85%.",
    avatar: "RC",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between selection:bg-neutral-200 selection:text-black">
      {/* Navigation matching Reference UI */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/80 bg-background/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-8">
              <Logo size="md" href="/" />
              <div className="hidden md:flex items-center gap-6 text-xs font-medium text-muted-foreground">
                <Link href="#features" className="hover:text-foreground transition-colors">Features</Link>
                <Link href="#quotas" className="hover:text-foreground transition-colors">Daily Quotas</Link>
                <Link href="#testimonials" className="hover:text-foreground transition-colors">Reviews</Link>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/auth/login">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-lg text-xs font-medium border-border/80 hover:bg-muted"
                >
                  Sign in
                </Button>
              </Link>
              <Link href="/auth/login">
                <Button
                  size="sm"
                  className="bg-foreground text-background hover:opacity-90 rounded-lg text-xs font-medium px-4 shadow-sm"
                >
                  Get Started Free
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 sm:pt-36 pb-16 px-4 sm:px-6 relative">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          {/* Friendly badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 border border-zinc-200 text-xs font-medium text-zinc-700 mx-auto">
            <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
            <span>Built for college students • 100% Free Daily Access</span>
          </div>

          {/* Main Display Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-foreground leading-[1.1]"
          >
            Study, revise and score higher{" "}
            <span className="font-extrabold text-foreground underline decoration-indigo-500/40 decoration-wavy underline-offset-8">
              without panic.
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed"
          >
            Turn your bulky syllabus and past question papers into clean revision summaries, predicted exam questions, realistic handwritten notes, and realistic daily study schedules.
          </motion.p>

          {/* Dual Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2"
          >
            <Link href="#features" className="w-full sm:w-auto">
              <Button
                variant="outline"
                className="w-full sm:w-auto h-11 px-6 rounded-lg text-xs font-medium border-border hover:bg-muted text-foreground flex items-center justify-center gap-2"
              >
                <span>See all tools</span>
                <ArrowDown className="w-3.5 h-3.5" />
              </Button>
            </Link>
            <Link href="/auth/login" className="w-full sm:w-auto">
              <Button
                className="w-full sm:w-auto h-11 px-6 rounded-lg text-xs font-medium bg-foreground text-background hover:opacity-90 shadow-sm flex items-center justify-center gap-2"
              >
                <span>Start Studying Free</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </motion.div>

          {/* Value props subtitle */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="text-xs text-muted-foreground flex items-center justify-center gap-2 pt-1"
          >
            <Shield className="w-3.5 h-3.5 text-emerald-500" />
            <span>100% Free • 5 PDF uploads & 35 doubt questions daily • No credit card</span>
          </motion.p>

          {/* Stats Bar */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12 pt-8 border-t border-border/80 max-w-3xl mx-auto"
          >
            {stats.map((stat) => (
              <div key={stat.label} className="p-3 bg-card rounded-xl border border-border/70 text-center">
                <div className="text-2xl font-bold font-mono text-foreground">{stat.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 border-t border-border/80 bg-muted/20">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2.5">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Everything you need for your semester exams
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              No complicated tools or tech jargon. Just practical help for studying, making notes, and scoring marks.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className="bg-card border border-border/80 rounded-xl p-5 space-y-3 hover:border-foreground/40 transition-colors shadow-xs"
              >
                <div className="w-9 h-9 rounded-lg bg-foreground/5 border border-border/80 flex items-center justify-center">
                  <feature.icon className="w-4 h-4 text-foreground" />
                </div>
                <h3 className="font-semibold text-sm text-foreground">{feature.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Daily Quotas & Free Access Section */}
      <section id="quotas" className="py-20 px-4 sm:px-6 border-t border-border/80">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded">
              100% Free For All Students
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground pt-1">
              Generous Daily Free Quotas
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Every tool is unlocked. Your quotas refresh every single night at 12:00 AM automatically.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* PDF Analysis Quota Card */}
            <div className="bg-card border border-border/80 rounded-xl p-6 space-y-5 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-indigo-400" />
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-border/80 text-muted-foreground">
                  Resets Daily
                </span>
              </div>
              <div>
                <div className="text-3xl font-bold font-mono tracking-tight text-foreground">5 PDFs / Day</div>
                <div className="text-xs text-muted-foreground mt-0.5">Syllabus & PYQ Paper Analysis</div>
              </div>
              <ul className="space-y-2.5 pt-2 border-t border-border/60">
                {[
                  "Full unit & topic weightage extraction",
                  "PYQ frequency & recurring question predictor",
                  "AI trend analysis & exam probability scores",
                  "Direct upload of PDF and TXT documents",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link href="/auth/login" className="block pt-2">
                <Button className="w-full bg-foreground text-background hover:opacity-90 rounded-lg text-xs font-medium h-10">
                  Try Syllabus Analyzer
                </Button>
              </Link>
            </div>

            {/* AI Chat Messages Quota Card */}
            <div className="bg-card border border-border/80 rounded-xl p-6 space-y-5 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-border/80 text-muted-foreground">
                  Resets Daily
                </span>
              </div>
              <div>
                <div className="text-3xl font-bold font-mono tracking-tight text-foreground">35 Chats / Day</div>
                <div className="text-xs text-muted-foreground mt-0.5">Interactive AI Tutor Queries</div>
              </div>
              <ul className="space-y-2.5 pt-2 border-t border-border/60">
                {[
                  "Step-by-step doubt resolution & concept breakdown",
                  "Subject-aware study assistance",
                  "Notes generation & instant formulas",
                  "Handwritten style assignment exports",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link href="/auth/login" className="block pt-2">
                <Button variant="outline" className="w-full rounded-lg text-xs font-medium h-10 border-border/80 hover:bg-muted">
                  Start Free Chat
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Reviews Section */}
      <section id="testimonials" className="py-20 px-4 sm:px-6 border-t border-border/80 bg-muted/20">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Loved by Students Across Universities
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Real feedback from learners using PadhaiHub every semester.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className="bg-card border border-border/80 rounded-xl p-5 space-y-3 shadow-xs"
              >
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, idx) => (
                    <Star key={idx} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">&ldquo;{t.text}&rdquo;</p>
                <div className="flex items-center gap-2.5 pt-1 border-t border-border/60">
                  <div className="w-7 h-7 rounded-full bg-foreground text-background flex items-center justify-center text-[10px] font-bold">
                    {t.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-xs text-foreground">{t.name}</div>
                    <div className="text-[11px] text-muted-foreground">{t.college}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Box matching Reference UI */}
      <section className="py-20 px-4 sm:px-6 border-t border-border/80">
        <div className="max-w-3xl mx-auto text-center space-y-6 bg-card border border-border/80 rounded-2xl p-8 sm:p-12 shadow-sm">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Ready to ace your exams?
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            Join thousands of students scoring higher and preparing smarter with PadhaiHub.
          </p>
          <div className="pt-2">
            <Link href="/auth/login">
              <Button
                size="lg"
                className="h-11 px-7 rounded-lg text-xs font-medium bg-foreground text-background hover:opacity-90 shadow-sm"
              >
                Start Studying for Free
              </Button>
            </Link>
          </div>
          <p className="text-[11px] font-mono text-muted-foreground">
            No credit card required • Instant access
          </p>
        </div>
      </section>

      {/* Minimalist Cookie / Status Strip matching Reference Image Bottom Bar */}
      <div className="border-t border-border/80 bg-background px-4 sm:px-6 py-3 text-xs text-muted-foreground flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-[11px]">
          We use local session state to improve your study experience and track your daily usage.
        </p>
        <div className="flex items-center gap-3">
          <Link href="/privacy" className="text-[11px] hover:text-foreground underline">Privacy</Link>
          <Link href="/terms" className="text-[11px] hover:text-foreground underline">Terms</Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border/80 py-6 px-4 sm:px-6 bg-card">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo size="sm" href="/" showTagline />
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} PadhaiHub. All rights reserved. Built for students.
          </p>
        </div>
      </footer>
    </div>
  );
}
