// app/dashboard/settings/page.tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { User, Shield, Moon, Sun, Monitor, Save, CheckCircle2, Flame, Cpu, FileText, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { updateUserProfile } from "@/firebase/firestore";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getInitials } from "@/utils";

export default function SettingsPage() {
  const { user, userProfile, dailyUsage, refreshProfile } = useAuth();
  const { theme, setTheme } = useTheme();
  const [displayName, setDisplayName] = useState(userProfile?.displayName || "");
  const [saving, setSaving] = useState(false);

  const handleSaveProfile = async () => {
    if (!user || !displayName.trim()) return;
    setSaving(true);
    try {
      await updateUserProfile(user.uid, { displayName: displayName.trim() });
      await refreshProfile();
      toast.success("Profile updated!");
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const themeOptions = [
    { value: "light", label: "Light Mode", icon: Sun },
    { value: "dark", label: "Dark Mode", icon: Moon },
    { value: "system", label: "System Sync", icon: Monitor },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {/* Profile Settings */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border/80 rounded-xl p-5 sm:p-6"
      >
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <User className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h2 className="font-semibold text-sm tracking-tight text-foreground">User Profile</h2>
              <p className="text-xs text-muted-foreground">Manage your identity and display preferences</p>
            </div>
          </div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
            Free Student Edition
          </span>
        </div>

        <div className="flex items-center gap-4 mb-5 p-3.5 rounded-lg border border-border/60 bg-muted/20">
          <Avatar className="w-12 h-12 border border-border/80 rounded-lg">
            <AvatarImage src={user?.photoURL || ""} />
            <AvatarFallback className="bg-indigo-600/30 text-indigo-300 font-mono text-sm font-semibold rounded-lg">
              {getInitials(userProfile?.displayName || user?.email || "U")}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm text-foreground truncate">{userProfile?.displayName || "Student Scholar"}</p>
            <p className="text-xs font-mono text-muted-foreground truncate">{user?.email}</p>
          </div>
        </div>

        <div className="space-y-3.5">
          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">Full Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your academic display name"
              className="w-full px-3.5 py-2 rounded-lg border border-border/80 bg-muted/30 text-xs sm:text-sm text-foreground focus:outline-none focus:border-indigo-500 focus:bg-card transition-colors placeholder:text-muted-foreground/60"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground mb-1.5 block">Registered Email Address</label>
            <input
              type="email"
              value={user?.email || ""}
              disabled
              className="w-full px-3.5 py-2 rounded-lg border border-border/60 bg-muted/20 text-xs sm:text-sm text-muted-foreground font-mono cursor-not-allowed"
            />
          </div>
          <div className="pt-2">
            <Button
              onClick={handleSaveProfile}
              disabled={saving}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium h-9 px-4 rounded-lg transition-colors gap-2"
            >
              {saving ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-3.5 h-3.5" />
              )}
              <span>Save Changes</span>
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Appearance */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="bg-card border border-border/80 rounded-xl p-5 sm:p-6"
      >
        <div className="flex items-center gap-3 pb-4 mb-4 border-b border-border/60">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <Monitor className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <h2 className="font-semibold text-sm tracking-tight text-foreground">Theme & Interface</h2>
            <p className="text-xs text-muted-foreground">Select your preferred color workspace</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {themeOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                setTheme(opt.value);
                toast.success(`Switched to ${opt.label}`);
              }}
              className={`flex flex-col items-center justify-center gap-2 p-3.5 rounded-lg border transition-all ${
                theme === opt.value
                  ? "border-indigo-500 bg-indigo-500/10 text-foreground"
                  : "border-border/70 bg-muted/20 text-muted-foreground hover:border-border"
              }`}
            >
              <opt.icon className={`w-4 h-4 ${theme === opt.value ? "text-indigo-400" : "text-muted-foreground"}`} />
              <span className="text-xs font-medium">{opt.label}</span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Support & Help Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-card border border-border/80 rounded-xl p-5 sm:p-6"
      >
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 text-sm font-bold">
              ?
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground">Need Help or Have Questions?</h3>
              <p className="text-xs text-muted-foreground">Reach our official PadhaiHub student help desk</p>
            </div>
          </div>
          <a
            href="mailto:chaudharyishwor143@gmail.com?subject=PadhaiHub%20Help%20Request"
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors"
          >
            Email Support
          </a>
        </div>
        <p className="text-xs text-muted-foreground">
          Official Support Email:{" "}
          <a
            href="mailto:chaudharyishwor143@gmail.com"
            className="font-medium text-foreground hover:underline font-mono"
          >
            chaudharyishwor143@gmail.com
          </a>
        </p>
      </motion.div>

      {/* Account Security & Telemetry */}
      <div className="grid sm:grid-cols-2 gap-5">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          className="bg-card border border-border/80 rounded-xl p-5"
        >
          <div className="flex items-center gap-2.5 pb-3 mb-3 border-b border-border/60">
            <Shield className="w-4 h-4 text-emerald-400" />
            <h3 className="font-semibold text-xs text-foreground uppercase tracking-wider font-mono">Account Security</h3>
          </div>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/20 border border-border/60 text-xs">
              <span className="text-muted-foreground">Auth Verification</span>
              <span className="font-mono text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Verified
              </span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/20 border border-border/60 text-xs">
              <span className="text-muted-foreground">Account Created</span>
              <span className="font-mono text-foreground">
                {user?.metadata.creationTime
                  ? new Date(user.metadata.creationTime).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : "Active"}
              </span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
          className="bg-card border border-border/80 rounded-xl p-5"
        >
          <div className="flex items-center gap-2.5 pb-3 mb-3 border-b border-border/60">
            <Cpu className="w-4 h-4 text-indigo-400" />
            <h3 className="font-semibold text-xs text-foreground uppercase tracking-wider font-mono">Usage Telemetry</h3>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 rounded-lg bg-muted/20 border border-border/60">
              <p className="text-[10px] font-mono text-muted-foreground">Study Streak</p>
              <p className="text-sm font-mono font-bold text-amber-400 mt-0.5">{userProfile?.studyStreak || 0} Days</p>
            </div>
            <div className="p-2.5 rounded-lg bg-muted/20 border border-border/60">
              <p className="text-[10px] font-mono text-muted-foreground">AI Operations</p>
              <p className="text-sm font-mono font-bold text-indigo-400 mt-0.5">{userProfile?.aiUsageCount || 0}</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
