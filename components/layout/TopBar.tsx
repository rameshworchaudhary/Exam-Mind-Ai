// components/layout/TopBar.tsx
"use client";

import { useTheme } from "next-themes";
import { Sun, Moon, Bell, Search, FileText, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/dashboard/syllabus": "Syllabus Analyzer",
  "/dashboard/pyq": "PYQ Predictions",
  "/dashboard/notes": "AI Notes Generator",
  "/dashboard/assignments": "Handwritten Assignments",
  "/dashboard/viva": "Viva Preparation",
  "/dashboard/planner": "Study Planner",
  "/dashboard/chatbot": "AI Chatbot",
  "/dashboard/predictor": "Performance Predictor",
  "/dashboard/billing": "Usage & Plan",
  "/dashboard/settings": "Settings",
};

export function TopBar() {
  const { theme, setTheme } = useTheme();
  const { dailyUsage } = useAuth();
  const pathname = usePathname();

  const pageTitle = pageTitles[pathname] || "ExamMind AI";

  return (
    <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border px-4 md:px-6 lg:px-8 py-4">
      <div className="flex items-center gap-4">
        {/* Page Title (space for mobile hamburger) */}
        <div className="flex-1 ml-12 lg:ml-0">
          <h1 className="font-semibold text-lg leading-tight">{pageTitle}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground hidden sm:inline">Daily Quota:</span>
            <div className="flex items-center gap-1.5">
              <Badge
                variant="outline"
                className={`text-[11px] font-medium py-0 px-2 flex items-center gap-1 ${
                  (dailyUsage?.pdfCount ?? 0) >= (dailyUsage?.maxPdf ?? 5)
                    ? "border-red-500/40 text-red-400 bg-red-950/20"
                    : "border-border text-muted-foreground bg-muted/30"
                }`}
              >
                <FileText className="w-3 h-3 text-indigo-400" />
                {dailyUsage?.pdfCount ?? 0}/{dailyUsage?.maxPdf ?? 5} PDFs
              </Badge>
              <Badge
                variant="outline"
                className={`text-[11px] font-medium py-0 px-2 flex items-center gap-1 ${
                  (dailyUsage?.chatCount ?? 0) >= (dailyUsage?.maxChat ?? 35)
                    ? "border-red-500/40 text-red-400 bg-red-950/20"
                    : "border-border text-muted-foreground bg-muted/30"
                }`}
              >
                <MessageSquare className="w-3 h-3 text-emerald-400" />
                {dailyUsage?.chatCount ?? 0}/{dailyUsage?.maxChat ?? 35} Chats
              </Badge>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="hidden md:flex relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search anything..."
            className="pl-9 h-9 text-sm bg-muted/50 border-border"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="w-9 h-9"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </Button>
          <Button variant="ghost" size="icon" className="w-9 h-9 relative">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-500 rounded-full" />
          </Button>
        </div>
      </div>
    </header>
  );
}
