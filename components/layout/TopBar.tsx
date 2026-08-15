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
    <header className="sticky top-0 z-20 bg-background/75 backdrop-blur-md border-b border-border/80 px-4 md:px-6 lg:px-8 py-3.5">
      <div className="flex items-center gap-4">
        {/* Page Title (space for mobile hamburger) */}
        <div className="flex-1 ml-12 lg:ml-0">
          <h1 className="font-semibold text-lg tracking-tight text-foreground">{pageTitle}</h1>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[11px] font-medium text-muted-foreground/80 hidden sm:inline">Daily Quota:</span>
            <div className="flex items-center gap-1.5">
              <Badge
                variant="outline"
                className={`text-[11px] font-medium py-0.5 px-2 flex items-center gap-1.5 rounded-md ${
                  (dailyUsage?.pdfCount ?? 0) >= (dailyUsage?.maxPdf ?? 5)
                    ? "border-red-500/40 text-red-400 bg-red-950/20"
                    : "border-border/80 text-foreground/80 bg-muted/40"
                }`}
              >
                <FileText className="w-3 h-3 text-indigo-400" />
                <span>{dailyUsage?.pdfCount ?? 0}/{dailyUsage?.maxPdf ?? 5} PDFs</span>
              </Badge>
              <Badge
                variant="outline"
                className={`text-[11px] font-medium py-0.5 px-2 flex items-center gap-1.5 rounded-md ${
                  (dailyUsage?.chatCount ?? 0) >= (dailyUsage?.maxChat ?? 35)
                    ? "border-red-500/40 text-red-400 bg-red-950/20"
                    : "border-border/80 text-foreground/80 bg-muted/40"
                }`}
              >
                <MessageSquare className="w-3 h-3 text-emerald-400" />
                <span>{dailyUsage?.chatCount ?? 0}/{dailyUsage?.maxChat ?? 35} Chats</span>
              </Badge>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="hidden md:flex relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/70" />
          <Input
            placeholder="Search anything..."
            className="pl-9 h-9 text-xs bg-muted/30 border-border/70 focus-visible:bg-background focus-visible:border-indigo-500/50 rounded-xl"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            title="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-700" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 relative"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-indigo-500 rounded-full" />
          </Button>
        </div>
      </div>
    </header>
  );
}
