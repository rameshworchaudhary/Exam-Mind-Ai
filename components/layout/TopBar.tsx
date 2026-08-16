// components/layout/TopBar.tsx
"use client";

import { useState, useEffect } from "react";
import {
  ChevronDown,
  FileText,
  MessageSquare,
  LogOut,
  Settings,
  Gauge,
  User,
  Sun,
  Moon,
  Mail,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { logout } from "@/firebase/auth";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/utils";

const pageTitles: Record<string, string> = {
  "/dashboard": "Courses",
  "/dashboard/syllabus": "Syllabus Breakdown",
  "/dashboard/pyq": "Past Exam Questions",
  "/dashboard/notes": "Quick Revision Notes",
  "/dashboard/assignments": "Handwritten Assignments",
  "/dashboard/viva": "Viva & Oral Test",
  "/dashboard/planner": "Study Schedule",
  "/dashboard/chatbot": "Ask a Doubt",
  "/dashboard/predictor": "Exam Readiness",
  "/dashboard/billing": "Daily Usage & Limits",
  "/dashboard/settings": "Settings",
};

export function TopBar() {
  const { user, userProfile, dailyUsage } = useAuth();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const currentTitle = pageTitles[pathname] || "Courses";

  const pdfCount = dailyUsage?.pdfCount ?? 0;
  const maxPdf = dailyUsage?.maxPdf ?? 5;
  const chatCount = dailyUsage?.chatCount ?? 0;
  const maxChat = dailyUsage?.maxChat ?? 35;

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully");
      router.push("/");
    } catch {
      toast.error("Failed to log out");
    }
  };

  // User display name & email
  const displayName = userProfile?.displayName || user?.displayName || "Rameshwor Chaudhary";
  const displayEmail = user?.email || "chaudharyishwor143@gmail.com";

  const toggleTheme = () => {
    if (resolvedTheme === "dark" || theme === "dark") {
      setTheme("light");
      toast.success("Switched to Light Mode");
    } else {
      setTheme("dark");
      toast.success("Switched to Dark Mode");
    }
  };

  return (
    <header className="sticky top-0 z-20 h-14 bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 px-4 md:px-8 flex items-center justify-between transition-colors">
      {/* Breadcrumb title */}
      <div className="flex items-center gap-2 ml-10 lg:ml-0">
        <span className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
          {currentTitle}
        </span>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Free Quotas Pill */}
        <Link
          href="/dashboard/billing"
          className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-md bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          title="Daily free study quota"
        >
          <div className="flex items-center gap-1 font-medium">
            <FileText className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
            <span>PDF: {pdfCount}/{maxPdf}</span>
          </div>
          <span className="text-zinc-300 dark:text-zinc-700">|</span>
          <div className="flex items-center gap-1 font-medium">
            <MessageSquare className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            <span>Chat: {chatCount}/{maxChat}</span>
          </div>
        </Link>

        {/* Theme Toggle Button (Light/Dark) */}
        {mounted && (
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800"
            title={resolvedTheme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-label="Toggle theme"
          >
            {resolvedTheme === "dark" ? (
              <Sun className="w-4 h-4 text-amber-400 animate-in spin-in-90 duration-200" />
            ) : (
              <Moon className="w-4 h-4 text-zinc-700 animate-in spin-in-90 duration-200" />
            )}
          </button>
        )}

        {/* User Name Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors focus:outline-none"
          >
            <Avatar className="w-6 h-6 border border-zinc-200 dark:border-zinc-800">
              <AvatarImage src={user?.photoURL || ""} />
              <AvatarFallback className="bg-indigo-600 text-white text-[10px] font-bold">
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
            <span className="max-w-[160px] sm:max-w-[200px] truncate">{displayName}</span>
            <ChevronDown className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
          </button>

          {dropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-20"
                onClick={() => setDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-1.5 w-60 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 shadow-xl py-1 z-30 text-xs text-zinc-700 dark:text-zinc-300 divide-y divide-zinc-100 dark:divide-zinc-800 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-2.5">
                  <p className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                    {displayName}
                  </p>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">{displayEmail}</p>
                </div>

                <div className="py-1">
                  <Link
                    href="/dashboard"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100"
                  >
                    <User className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Your Courses</span>
                  </Link>

                  <button
                    onClick={() => {
                      toggleTheme();
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 text-left"
                  >
                    <div className="flex items-center gap-2">
                      {resolvedTheme === "dark" ? (
                        <Sun className="w-3.5 h-3.5 text-amber-400" />
                      ) : (
                        <Moon className="w-3.5 h-3.5 text-zinc-400" />
                      )}
                      <span>{resolvedTheme === "dark" ? "Light Theme" : "Dark Theme"}</span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-mono">
                      {resolvedTheme === "dark" ? "Dark" : "Light"}
                    </span>
                  </button>

                  <Link
                    href="/dashboard/billing"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100"
                  >
                    <Gauge className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Daily Quota & Limits</span>
                  </Link>
                  <Link
                    href="/dashboard/settings"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100"
                  >
                    <Settings className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Account Settings</span>
                  </Link>
                </div>

                {/* Help support info in dropdown */}
                <div className="py-1">
                  <a
                    href="mailto:chaudharyishwor143@gmail.com"
                    className="flex items-center gap-2 px-3 py-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-left"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span className="truncate">Support: chaudharyishwor143@gmail.com</span>
                  </a>
                </div>

                <div className="py-1">
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-left"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
