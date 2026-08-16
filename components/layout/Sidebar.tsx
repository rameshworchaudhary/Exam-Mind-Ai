// components/layout/Sidebar.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronsLeft,
  LayoutDashboard,
  FileText,
  TrendingUp,
  BookOpen,
  PenTool,
  Mic,
  Calendar,
  MessageSquare,
  Gauge,
  Settings,
  LogOut,
  Menu,
  X,
  Mail,
} from "lucide-react";
import { cn } from "@/utils";
import { useAuth } from "@/lib/auth-context";
import { logout } from "@/firebase/auth";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/utils";

const mainNavItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Your Courses" },
  { href: "/dashboard/syllabus", icon: FileText, label: "Syllabus Breakdown" },
  { href: "/dashboard/pyq", icon: TrendingUp, label: "Past Exam Questions" },
  { href: "/dashboard/notes", icon: BookOpen, label: "Quick Notes" },
  { href: "/dashboard/assignments", icon: PenTool, label: "Handwritten Notes" },
  { href: "/dashboard/viva", icon: Mic, label: "Viva & Oral Test" },
  { href: "/dashboard/planner", icon: Calendar, label: "Study Schedule" },
  { href: "/dashboard/chatbot", icon: MessageSquare, label: "Ask a Doubt" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, userProfile } = useAuth();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const displayEmail = user?.email || "chaudharyishwor143@gmail.com";

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Signed out successfully");
      router.push("/");
    } catch {
      toast.error("Failed to sign out");
    }
  };

  const handleSupportClick = () => {
    window.location.href = "mailto:chaudharyishwor143@gmail.com?subject=PadhaiHub%20Student%20Support%20Request";
    toast.info("Opening email to chaudharyishwor143@gmail.com");
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 select-none transition-colors">
      {/* Top Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-zinc-200/80 dark:border-zinc-800">
        <Link href="/dashboard" className="flex items-center gap-2">
          {/* Stylized PadhaiHub typography */}
          <div className="flex items-center font-bold tracking-tight text-lg text-zinc-900 dark:text-white">
            <span className="text-indigo-600 dark:text-indigo-400 font-black text-xl tracking-tight">Padhai</span>
            <span className="font-bold tracking-tight text-base text-zinc-900 dark:text-white">Hub</span>
          </div>
        </Link>

        {/* Collapse toggle icon << */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900 p-1.5 rounded-md transition-colors hidden lg:flex items-center justify-center"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Intro section matching reference */}
      <div className="px-4 pt-5 pb-3">
        <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">Your Courses</h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
          Enter a course on the right to take an assessment or study materials.
        </p>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        {mainNavItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors group",
                isActive
                  ? "bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-semibold"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-900/60"
              )}
            >
              <item.icon
                className={cn(
                  "w-4 h-4 shrink-0 transition-colors",
                  isActive
                    ? "text-indigo-600 dark:text-indigo-400"
                    : "text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300"
                )}
              />
              <span className="flex-1 truncate">{item.label}</span>
              {isActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400 shrink-0" />
              )}
            </Link>
          );
        })}

        <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80 mt-3 space-y-1">
          <Link
            href="/dashboard/billing"
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors",
              pathname === "/dashboard/billing"
                ? "bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-semibold"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-900/60"
            )}
          >
            <Gauge className="w-4 h-4 text-zinc-400" />
            <span>Daily Usage & Limits</span>
          </Link>
          <Link
            href="/dashboard/settings"
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors",
              pathname === "/dashboard/settings"
                ? "bg-zinc-100 dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 font-semibold"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-900/60"
            )}
          >
            <Settings className="w-4 h-4 text-zinc-400" />
            <span>Settings</span>
          </Link>
        </div>
      </nav>

      {/* Bottom Help / Support matching screenshot */}
      <div className="border-t border-zinc-200/80 dark:border-zinc-800 p-3 space-y-2 bg-white dark:bg-zinc-950">
        <button
          onClick={handleSupportClick}
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
          title="Contact chaudharyishwor143@gmail.com"
        >
          <div className="w-5 h-5 rounded border border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-zinc-600 dark:text-zinc-400 shrink-0 text-[11px] font-bold">
            ?
          </div>
          <span className="truncate">PadhaiHub Support</span>
        </button>

        {/* User Account Tile */}
        <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800">
          <Avatar className="w-7 h-7 shrink-0">
            <AvatarImage src={user?.photoURL || ""} />
            <AvatarFallback className="bg-indigo-600 text-white text-[10px] font-bold">
              {getInitials(userProfile?.displayName || displayEmail)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
              {userProfile?.displayName || "Student"}
            </p>
            <p className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
              {displayEmail}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 p-1.5 rounded transition-colors"
            title="Sign out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 flex-col z-30 transition-colors">
        <SidebarContent />
      </aside>

      {/* Mobile Hamburger Button */}
      <button
        type="button"
        aria-label="Toggle navigation menu"
        className="lg:hidden fixed top-3 left-3 z-50 w-9 h-9 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg flex items-center justify-center text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shadow-sm"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
      </button>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-xs z-40"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
              className="lg:hidden fixed inset-y-0 left-0 w-64 bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 z-50 flex flex-col shadow-2xl"
            >
              <SidebarContent />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
