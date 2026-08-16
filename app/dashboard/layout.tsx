// app/dashboard/layout.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { toast } from "sonner";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-muted-foreground font-mono">Loading Study Desk...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const handleFloatingHelpClick = () => {
    window.location.href = "mailto:chaudharyishwor143@gmail.com?subject=PadhaiHub%20Assistance%20%26%20Support";
    toast.info("Need help? Email chaudharyishwor143@gmail.com");
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex transition-colors">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-h-screen lg:ml-64 bg-background transition-colors">
        <TopBar />
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto overflow-x-hidden bg-background">
          {children}
        </main>
      </div>

      {/* Floating Blue Accessibility / Support Button matching screenshot */}
      <button
        onClick={handleFloatingHelpClick}
        className="fixed bottom-6 right-6 z-40 w-11 h-11 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-lg shadow-blue-900/30 transition-transform hover:scale-105 active:scale-95"
        title="Student Support (chaudharyishwor143@gmail.com)"
        aria-label="Student Support"
      >
        <svg
          className="w-6 h-6 fill-current"
          viewBox="0 0 24 24"
        >
          <path d="M12 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm9 7h-6v13h-2v-6h-2v6H9V9H3V7h18v2z" />
        </svg>
      </button>
    </div>
  );
}
