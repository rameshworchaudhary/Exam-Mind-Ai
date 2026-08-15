// app/auth/login/page.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Chrome } from "lucide-react";
import { Button } from "@/components/ui/button";
import { loginWithGoogle } from "@/firebase/auth";
import { toast } from "sonner";
import { Logo, LogoIcon } from "@/components/ui/Logo";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await loginWithGoogle();
      toast.success("Welcome back! 🎉");
      router.push("/dashboard");
    } catch {
      toast.error("Google login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#050505] border-r border-border relative overflow-hidden items-center justify-center">
        <div className="absolute inset-0 bg-grid opacity-20" />
        <div className="absolute -top-32 -left-32 w-80 h-80 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative text-center px-12 z-10 max-w-lg">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="w-24 h-24 rounded-3xl bg-[#0F0F10] p-3 mx-auto mb-8 border border-border shadow-2xl shadow-indigo-500/10 flex items-center justify-center">
              <LogoIcon className="w-16 h-16" />
            </div>
            
            <div className="flex justify-center mb-4">
              <Logo size="xl" showTagline />
            </div>

            <p className="text-muted-foreground text-base max-w-md mx-auto mt-4 leading-relaxed">
              Your AI-powered study companion. Analyze syllabi, predict
              questions, generate notes, and ace your exams.
            </p>
            <div className="mt-10 grid grid-cols-2 gap-3 text-left">
              {[
                { emoji: "🧠", text: "AI Syllabus Analysis" },
                { emoji: "📊", text: "PYQ Predictions" },
                { emoji: "✍️", text: "Handwritten Assignments" },
                { emoji: "📅", text: "Smart Study Planner" },
              ].map((item) => (
                <div
                  key={item.text}
                  className="flex items-center gap-3 bg-[#0F0F10] rounded-xl p-3 border border-border/80"
                >
                  <span className="text-xl">{item.emoji}</span>
                  <span className="text-foreground/90 text-xs font-medium">
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md text-center"
        >
          {/* Logo */}
          <div className="flex items-center justify-center mb-8">
            <Logo size="lg" href="/" />
          </div>

          <h1 className="text-3xl font-bold mb-2">Welcome!</h1>
          <p className="text-muted-foreground mb-8">
            Sign in with Google to continue your studies
          </p>

          <Button
            type="button"
            variant="outline"
            className="w-full h-12 gap-3 text-base"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <Chrome className="w-5 h-5" />
            )}
            Continue with Google
          </Button>

          <p className="text-xs text-muted-foreground mt-6">
            By signing in you agree to our Terms and Privacy Policy
          </p>
        </motion.div>
      </div>
    </div>
  );
}