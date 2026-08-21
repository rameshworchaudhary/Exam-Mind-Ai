// components/dashboard/StreakCounter.tsx
"use client";

import React, { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, Trophy, Sparkles, Check, ChevronRight } from "lucide-react";
import { db, calculateAndSyncDailyStreak } from "@/firebase/firestore";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/utils";

interface StreakCounterProps {
  compact?: boolean;
  className?: string;
  onOpenDetails?: () => void;
}

export function StreakCounter({ compact = false, className }: StreakCounterProps) {
  const { user, userProfile } = useAuth();
  const [streak, setStreak] = useState<number>(userProfile?.studyStreak || 0);
  const [lastActiveDate, setLastActiveDate] = useState<string>("");
  const [isCalculated, setIsCalculated] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // 1. Trigger consecutive daily login calculation on user mount
  useEffect(() => {
    if (!user?.uid) {
      setStreak(0);
      return;
    }

    let isMounted = true;

    async function syncStreak() {
      if (!user?.uid) return;
      try {
        const result = await calculateAndSyncDailyStreak(user.uid);
        if (isMounted) {
          setStreak(result.streak);
          if (result.lastActiveDate) {
            setLastActiveDate(result.lastActiveDate);
          }
          setIsCalculated(true);
        }
      } catch (err) {
        console.error("Failed to sync study streak:", err);
      }
    }

    syncStreak();

    // 2. Attach live Firestore listener to user document for instant real-time sync
    const userDocRef = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(
      userDocRef,
      (docSnap) => {
        if (docSnap.exists() && isMounted) {
          const data = docSnap.data();
          if (typeof data.studyStreak === "number") {
            setStreak(data.studyStreak);
          }
          if (data.lastActiveDate || data.lastLoginDate) {
            const raw = data.lastActiveDate || data.lastLoginDate;
            const dateStr = typeof raw === "string" ? raw.substring(0, 10) : "";
            setLastActiveDate(dateStr);
          }
        }
      },
      (error) => {
        console.warn("Notice: Live streak listener fallback:", error);
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [user?.uid]);

  // Today's formatted comparison
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const isActiveToday = lastActiveDate === todayStr || streak > 0;

  // Milestone targets
  const getNextMilestone = (current: number) => {
    if (current < 3) return { target: 3, label: "3-Day Starter" };
    if (current < 7) return { target: 7, label: "7-Day Scholar" };
    if (current < 14) return { target: 14, label: "14-Day Master" };
    if (current < 30) return { target: 30, label: "30-Day Champion" };
    return { target: current + 10, label: "Unstoppable Legend" };
  };

  const nextMilestone = getNextMilestone(streak);
  const milestoneProgress = Math.min(
    100,
    Math.round((streak / nextMilestone.target) * 100)
  );

  // Motivational quote
  const getStreakMessage = (count: number) => {
    if (count <= 0) return "Log in daily to build your study streak!";
    if (count === 1) return "Great start! Come back tomorrow to keep the flame alive.";
    if (count <= 3) return "Awesome consistency! You're building solid study habits.";
    if (count <= 7) return "On fire! A week of steady preparation makes exams easy.";
    if (count <= 14) return "Impressive 2-week streak! Top retention unlocked.";
    return "Legendary dedication! You're destined for exam excellence.";
  };

  // 7-day mini visual history
  const daysOfWeek = ["M", "T", "W", "T", "F", "S", "S"];
  const currentDayIndex = (now.getDay() + 6) % 7; // Monday = 0, Sunday = 6

  return (
    <div
      id="streak-counter-container"
      className={cn("relative", className)}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {compact ? (
        // Compact pill display
        <div
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold cursor-pointer transition-all",
            streak > 0
              ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20"
              : "bg-zinc-100 dark:bg-zinc-800/80 border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400"
          )}
        >
          <Flame
            className={cn(
              "w-3.5 h-3.5",
              streak > 0 ? "fill-amber-500 text-amber-500 animate-pulse" : "text-zinc-400"
            )}
          />
          <span>{streak} {streak === 1 ? "day" : "days"}</span>
        </div>
      ) : (
        // Full Sidebar Card display
        <div
          className={cn(
            "p-3 rounded-xl border transition-all duration-200 relative overflow-hidden group",
            streak > 0
              ? "bg-gradient-to-br from-amber-500/[0.08] via-orange-500/[0.04] to-transparent border-amber-500/30 dark:border-amber-500/20 shadow-xs"
              : "bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200/80 dark:border-zinc-800"
          )}
        >
          {/* Subtle flame background glow */}
          {streak > 0 && (
            <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
          )}

          {/* Header Row */}
          <div className="flex items-center justify-between gap-2 relative z-10">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-105",
                  streak > 0
                    ? "bg-gradient-to-tr from-amber-500 to-orange-500 text-white shadow-sm shadow-amber-500/30"
                    : "bg-zinc-200 dark:bg-zinc-800 text-zinc-400"
                )}
              >
                <Flame
                  className={cn(
                    "w-4 h-4",
                    streak > 0 ? "fill-white/90 animate-pulse" : ""
                  )}
                />
              </div>

              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                    {streak > 0 ? `${streak} Day Streak` : "0 Day Streak"}
                  </span>
                  {streak > 0 && (
                    <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400">
                  {streak > 0 ? "Consecutive Daily Logins" : "Start your streak today"}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowTooltip(!showTooltip)}
              className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded transition-colors"
              title="View streak details"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Mini 7-Day Dots Bar */}
          <div className="mt-2.5 pt-2 border-t border-zinc-200/60 dark:border-zinc-800/80 flex items-center justify-between gap-1 relative z-10">
            {daysOfWeek.map((day, idx) => {
              const isToday = idx === currentDayIndex;
              // Day is considered active if it falls within recent streak days leading up to today
              const daysAgo = currentDayIndex - idx;
              const isMarked = daysAgo >= 0 && daysAgo < streak;

              return (
                <div key={idx} className="flex flex-col items-center gap-1 flex-1">
                  <span
                    className={cn(
                      "text-[9px] font-medium leading-none",
                      isToday
                        ? "text-amber-600 dark:text-amber-400 font-bold"
                        : "text-zinc-400 dark:text-zinc-500"
                    )}
                  >
                    {day}
                  </span>
                  <div
                    className={cn(
                      "w-4 h-4 rounded-full flex items-center justify-center text-[8px] transition-all",
                      isMarked
                        ? "bg-amber-500 text-white font-bold shadow-xs shadow-amber-500/30"
                        : isToday
                        ? "border-2 border-dashed border-amber-500/60 bg-amber-500/10 text-amber-600"
                        : "bg-zinc-100 dark:bg-zinc-800/80 text-zinc-300 dark:text-zinc-600"
                    )}
                  >
                    {isMarked ? <Check className="w-2.5 h-2.5 stroke-[3]" /> : null}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Next Goal Progress */}
          <div className="mt-2.5 relative z-10">
            <div className="flex items-center justify-between text-[10px] text-zinc-500 dark:text-zinc-400 mb-1">
              <span className="flex items-center gap-1">
                <Trophy className="w-3 h-3 text-amber-500" />
                <span>Next: {nextMilestone.label}</span>
              </span>
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                {streak}/{nextMilestone.target}d
              </span>
            </div>
            <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${milestoneProgress}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
              />
            </div>
          </div>
        </div>
      )}

      {/* Hover / Click Details Popover */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 bottom-full mb-2 w-64 p-3.5 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xl z-50 text-zinc-900 dark:text-zinc-100 pointer-events-auto"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-md bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <h4 className="text-xs font-bold tracking-tight">Study Streak Status</h4>
            </div>

            <p className="text-[11px] text-zinc-600 dark:text-zinc-300 leading-relaxed mb-3">
              {getStreakMessage(streak)}
            </p>

            <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-100 dark:border-zinc-800 space-y-1.5 text-[10px]">
              <div className="flex justify-between text-zinc-600 dark:text-zinc-300">
                <span>Current Streak:</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">
                  {streak} {streak === 1 ? "day" : "days"}
                </span>
              </div>
              <div className="flex justify-between text-zinc-600 dark:text-zinc-300">
                <span>Today's Login:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                  Recorded
                </span>
              </div>
              <div className="flex justify-between text-zinc-600 dark:text-zinc-300">
                <span>Milestone Goal:</span>
                <span className="font-medium">{nextMilestone.target} days ({nextMilestone.label})</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
