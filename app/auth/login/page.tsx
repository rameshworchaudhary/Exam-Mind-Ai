// app/auth/login/page.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Chrome } from "lucide-react";
import { Button } from "@/components/ui/button";
import { loginWithGoogle } from "@/firebase/auth";
import { toast } from "sonner";
import { Logo } from "@/components/ui/Logo";

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
    <div className="min-h-screen bg-background flex flex-col justify-between">
      {/* Top bar with Logo */}
      <header className="border-b border-border/80 px-6 py-4 flex items-center justify-between">
        <Logo size="md" href="/" />
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/")}
          className="text-xs"
        >
          Back to Home
        </Button>
      </header>

      {/* Main Login Card */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-sm border border-border/80 bg-card rounded-2xl p-7 text-center space-y-6 shadow-sm"
        >
          <div className="flex justify-center">
            <Logo size="lg" />
          </div>

          <div className="space-y-1.5">
            <h1 className="text-xl font-bold tracking-tight text-foreground">Sign in to PadhaiHub</h1>
            <p className="text-xs text-muted-foreground">
              Continue with your Google account to access your workspace
            </p>
          </div>

          <Button
            type="button"
            className="w-full h-11 bg-foreground text-background hover:opacity-90 font-medium text-sm flex items-center justify-center gap-2.5 rounded-lg transition-all"
            onClick={handleGoogleLogin}
            disabled={loading}
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            ) : (
              <Chrome className="w-4 h-4" />
            )}
            <span>Continue with Google</span>
          </Button>

          <div className="pt-4 border-t border-border/60 text-[11px] text-muted-foreground space-y-1">
            <p>100% Free for verified learners • No card needed</p>
            <p>
              By signing in you agree to our{" "}
              <a href="/terms" className="underline hover:text-foreground">Terms</a> and{" "}
              <a href="/privacy" className="underline hover:text-foreground">Privacy Policy</a>
            </p>
          </div>
        </motion.div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border/60 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} PadhaiHub. All rights reserved.
      </footer>
    </div>
  );
}