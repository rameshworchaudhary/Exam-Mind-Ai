// app/dashboard/settings/page.tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { User, Shield, Moon, Sun, Monitor, Save } from "lucide-react";
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
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-500 to-gray-600 flex items-center justify-center">
            <User className="w-5 h-5 text-white" />
          </div>
          <div><h2 className="font-semibold text-lg">Profile Settings</h2>
            <p className="text-sm text-muted-foreground">Manage your account details</p>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-6">
          <Avatar className="w-16 h-16">
            <AvatarImage src={user?.photoURL || ""} />
            <AvatarFallback className="bg-indigo-600 text-white text-xl">
              {getInitials(userProfile?.displayName || user?.email || "U")}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold">{userProfile?.displayName || "Student"}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <p className="text-xs text-indigo-400 capitalize mt-1">Free Student Edition</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Display Name</label>
            <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-muted/50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Email</label>
            <input type="email" value={user?.email || ""} disabled
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-muted/50 text-sm opacity-60 cursor-not-allowed" />
          </div>
          <Button onClick={handleSaveProfile} disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
            {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
            Save Profile
          </Button>
        </div>
      </motion.div>

      {/* Theme Settings */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Monitor className="w-5 h-5 text-white" />
          </div>
          <div><h2 className="font-semibold text-lg">Appearance</h2>
            <p className="text-sm text-muted-foreground">Customize how ExamMind AI looks</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {themeOptions.map((opt) => (
            <button key={opt.value} onClick={() => setTheme(opt.value)}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${theme === opt.value ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30" : "border-border hover:border-indigo-400"}`}>
              <opt.icon className={`w-5 h-5 ${theme === opt.value ? "text-indigo-500" : "text-muted-foreground"}`} />
              <span className="text-sm font-medium">{opt.label}</span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Security */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div><h2 className="font-semibold text-lg">Security</h2>
            <p className="text-sm text-muted-foreground">Keep your account secure</p>
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 border border-border rounded-xl">
            <div>
              <p className="text-sm font-medium">Email Verified</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${user?.emailVerified ? "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400" : "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"}`}>
              {user?.emailVerified ? "✓ Verified" : "Pending"}
            </span>
          </div>
          <div className="flex items-center justify-between p-4 border border-border rounded-xl">
            <div>
              <p className="text-sm font-medium">Account Created</p>
              <p className="text-xs text-muted-foreground">
                {user?.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "N/A"}
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="bg-card border border-border rounded-2xl p-6">
        <h2 className="font-semibold text-lg mb-4">Your Stats & Quota</h2>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: "Study Streak", value: `${userProfile?.studyStreak || 0} days` },
            { label: "Total AI Operations", value: userProfile?.aiUsageCount || 0 },
            { label: "Today's PDFs", value: `${dailyUsage?.pdfCount || 0} / ${dailyUsage?.maxPdf || 5}` },
            { label: "Today's Chat Queries", value: `${dailyUsage?.chatCount || 0} / ${dailyUsage?.maxChat || 35}` },
          ].map((stat) => (
            <div key={stat.label} className="bg-muted/50 rounded-xl p-4 border border-border/50">
              <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
              <p className="text-lg font-bold capitalize">{stat.value}</p>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
