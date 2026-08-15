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
  CheckCircle,
  Sparkles,
  Zap,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/ui/Logo";

const features = [
  {
    icon: Brain,
    title: "Syllabus Analyzer",
    description: "Upload your syllabus and get instant AI analysis with topic weightage and key areas.",
    color: "from-violet-500 to-purple-600",
  },
  {
    icon: TrendingUp,
    title: "PYQ Predictions",
    description: "Analyze previous year papers to predict most likely exam questions with probability scores.",
    color: "from-blue-500 to-cyan-600",
  },
  {
    icon: BookOpen,
    title: "AI Notes Generator",
    description: "Generate short notes, long notes, revision points, formulas & definitions instantly.",
    color: "from-emerald-500 to-teal-600",
  },
  {
    icon: PenTool,
    title: "Handwritten Assignments",
    description: "Convert AI answers into beautiful handwritten-style PDFs with ruled notebook paper.",
    color: "from-amber-500 to-orange-600",
  },
  {
    icon: MessageSquare,
    title: "AI Chatbot",
    description: "ChatGPT-style assistant to explain concepts, solve doubts, and simplify topics.",
    color: "from-pink-500 to-rose-600",
  },
  {
    icon: Calendar,
    title: "Study Planner",
    description: "AI-generated daily study plans based on your exam date and preparation level.",
    color: "from-indigo-500 to-blue-600",
  },
];

const stats = [
  { value: "50+", label: "Students" },
  { value: "98%", label: "Pass Rate" },
  { value: "10+", label: "Notes Generated" },
  { value: "4.9★", label: "App Rating" },
];

const testimonials = [
  {
    name: "Ishwor Chaudhary",
    college: "Chandigarh University",
    text: "ExamMind AI helped me predict 8 out of 10 exam questions correctly! The PYQ analysis is insane.",
    avatar: "RC",
  },
  {
    name: "Rahul Chaudhary",
    college: "Chandigarh University",
    text: "The handwritten assignment generator saved me hours. Professors can't even tell it's AI-generated!",
    avatar: "RC",
  },
  {
    name: "Rajkapoor Chaudhary",
    college: "prokhara University Nepal",
    text: "Study planner is a game changer. I went from failing to scoring 85% in just one semester.",
    avatar: "RC",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Logo size="md" href="/" />
            <div className="hidden md:flex items-center gap-8">
              <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</Link>
              <Link href="#allowances" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Daily Quotas</Link>
              <Link href="#testimonials" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Reviews</Link>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/auth/login">
                <Button variant="ghost" size="sm">Sign In</Button>
              </Link>
              <Link href="/auth/register">
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  Get Started Free
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4">
        {/* Background effects */}
        <div className="absolute inset-0 bg-grid opacity-50" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-examind-500/10 rounded-full blur-3xl" />
        <div className="absolute top-40 left-20 w-[300px] h-[300px] bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute top-40 right-20 w-[300px] h-[300px] bg-blue-500/10 rounded-full blur-3xl" />

        <div className="relative max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Badge className="mb-6 bg-examind-50 text-examind-700 dark:bg-examind-950 dark:text-examind-300 border-examind-200 dark:border-examind-800">
              <Sparkles className="w-3 h-3 mr-1" />
              AI-Powered Student OS
            </Badge>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl md:text-7xl font-bold tracking-tight mb-6"
          >
            Study Smarter,{" "}
            <span className="gradient-text">Score Higher</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8"
          >
            ExamMind AI analyzes your syllabus, predicts exam questions, generates
            AI notes, creates handwritten assignments, and plans your entire study
            schedule — all powered by AI.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link href="/auth/register">
              <Button
                size="lg"
                className="bg-indigo-600 hover:bg-indigo-700 text-white h-12 px-8 text-base shadow-lg shadow-indigo-500/20"
              >
                <Zap className="w-4 h-4 mr-2" />
                Start Studying Free — No Card Needed
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button variant="outline" size="lg" className="h-12 px-8 text-base">
                Sign In
              </Button>
            </Link>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-4 text-sm text-muted-foreground"
          >
            <Shield className="w-3.5 h-3.5 inline mr-1 text-emerald-400" />
            100% Free for students. 5 PDF analyses + 35 AI chats refreshed daily.
          </motion.p>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-16 pt-16 border-t border-border"
          >
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-bold gradient-text">{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Everything You Need to Excel</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              A complete AI toolkit designed specifically for students to maximize exam performance.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="feature-card group relative bg-card border border-border rounded-2xl p-6 overflow-hidden"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 transition-opacity`} />
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Daily Quotas & Free Access Section */}
      <section id="allowances" className="py-20 px-4 bg-muted/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-3 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              100% Free For All Students
            </Badge>
            <h2 className="text-4xl font-bold mb-4">Generous Daily AI Quotas</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Every feature is completely unlocked. Daily quotas automatically reset every 24 hours at midnight.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* PDF Analysis Quota Card */}
            <div className="bg-card border border-border rounded-2xl p-8 relative space-y-6">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
                  <Brain className="w-6 h-6 text-indigo-400" />
                </div>
                <Badge variant="outline" className="text-xs border-indigo-500/30 text-indigo-400 bg-indigo-500/10">
                  Resets Daily
                </Badge>
              </div>
              <div>
                <div className="text-4xl font-extrabold tracking-tight">5 PDFs / Day</div>
                <div className="text-muted-foreground text-sm mt-1">Syllabus & PYQ Paper Analysis</div>
              </div>
              <ul className="space-y-3 pt-2 border-t border-border">
                {[
                  "Full unit & topic weightage extraction",
                  "PYQ frequency & recurring question predictor",
                  "AI trend analysis & exam probability scores",
                  "Direct upload of PDF and TXT documents",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link href="/auth/register" className="block pt-2">
                <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white">
                  Try Syllabus Analyzer
                </Button>
              </Link>
            </div>

            {/* AI Chat Messages Quota Card */}
            <div className="bg-card border border-border rounded-2xl p-8 relative space-y-6">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-emerald-400" />
                </div>
                <Badge variant="outline" className="text-xs border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
                  Resets Daily
                </Badge>
              </div>
              <div>
                <div className="text-4xl font-extrabold tracking-tight">35 Chats / Day</div>
                <div className="text-muted-foreground text-sm mt-1">Interactive AI Tutor Queries</div>
              </div>
              <ul className="space-y-3 pt-2 border-t border-border">
                {[
                  "Step-by-step doubt resolution & concept breakdown",
                  "Subject-aware study assistance",
                  "Notes generation & instant formulas",
                  "Handwritten style assignment exports",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link href="/auth/register" className="block pt-2">
                <Button variant="outline" className="w-full">
                  Start Free Chat
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Loved by Students Across India and Nepal</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="bg-card border border-border rounded-2xl p-6"
              >
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mb-4">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-examind-600 flex items-center justify-center text-white text-sm font-bold">
                    {t.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-sm">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.college}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-xl mx-auto text-center">
          <div className="bg-[#050505] border border-[#1C1C20] rounded-3xl p-8 sm:p-12 relative overflow-hidden shadow-2xl shadow-black/80">
            {/* Subtle ambient corner violet glows */}
            <div className="absolute -top-24 -left-24 w-64 h-64 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/20 via-[#050505]/40 to-transparent pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center">
              {/* Heading */}
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-[1.15] mb-3">
                Ready to Ace
                <span className="block text-white drop-shadow-[0_0_20px_rgba(99,102,241,0.35)]">
                  Your Exams?
                </span>
              </h2>

              {/* Subtle neon glow line beneath heading */}
              <div className="w-40 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/60 to-transparent blur-[0.5px] mb-6" />

              {/* Subheading */}
              <p className="text-[#D4D4D8] text-base sm:text-lg max-w-md mx-auto leading-relaxed mb-8">
                Join students already scoring higher with ExamMind AI
              </p>

              {/* Button */}
              <div className="relative group w-full sm:w-auto">
                <Link href="/auth/register" className="inline-block w-full sm:w-auto">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto h-14 px-8 bg-[#0F0F10] hover:bg-[#151518] text-white font-semibold text-base rounded-2xl border-2 border-indigo-500/60 hover:border-indigo-400 shadow-[0_0_24px_rgba(99,102,241,0.25)] hover:shadow-[0_0_35px_rgba(99,102,241,0.45)] transition-all duration-300"
                  >
                    Get Started for Free
                    <ArrowRight className="w-4 h-4 ml-2.5 text-white group-hover:translate-x-0.5 transition-transform" />
                  </Button>
                </Link>
                {/* Subtle bottom flare under button */}
                <div className="w-28 h-[1px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent mx-auto mt-2 blur-[0.5px]" />
              </div>

              {/* Bottom text */}
              <p className="text-[#A1A1AA] text-sm mt-4 tracking-normal">
                No credit card required <span className="text-indigo-400/80 mx-1">•</span> Instant access
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <Logo size="sm" href="/" showTagline />
          <p className="text-sm text-muted-foreground">
            © 2026 ExamMind AI. Built with ❤️ for students.
          </p>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="/support" className="hover:text-foreground transition-colors">Support</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
