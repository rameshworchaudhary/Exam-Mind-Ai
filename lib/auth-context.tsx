// lib/auth-context.tsx
"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
} from "react";
import { User } from "firebase/auth";
import { onAuthChange, logout } from "@/firebase/auth";
import { toast } from "sonner";
import {
  getUserProfile,
  getDailyUsage,
  DailyUsageData,
} from "@/firebase/firestore";

interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  plan: string;
  trialActive: boolean;
  trialEndsAt: string;
  studyStreak: number;
  subjects: string[];
  aiUsageCount: number;
  examReadiness: number;
  [key: string]: unknown;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  dailyUsage: DailyUsageData | null;
  loading: boolean;
  isAuthenticated: boolean;
  emailVerified: boolean;
  logout: () => Promise<void>;
  refreshProfile: (targetUid?: string) => Promise<void>;
  refreshDailyUsage: (targetUid?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  dailyUsage: null,
  loading: true,
  isAuthenticated: false,
  emailVerified: false,
  logout: async () => {},
  refreshProfile: async () => {},
  refreshDailyUsage: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [dailyUsage, setDailyUsage] = useState<DailyUsageData | null>(null);
  const [emailVerified, setEmailVerified] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  const refreshDailyUsage = useCallback(async (targetUid?: string) => {
    const activeUid = targetUid || user?.uid;
    if (activeUid) {
      try {
        const usage = await getDailyUsage(activeUid);
        setDailyUsage(usage);
      } catch (err) {
        console.error("Failed to load daily usage:", err);
      }
    }
  }, [user]);

  const refreshProfile = useCallback(async (targetUid?: string) => {
    const activeUid = targetUid || user?.uid;
    if (activeUid) {
      const profile = await getUserProfile(activeUid);
      setUserProfile(profile as unknown as UserProfile);
      await refreshDailyUsage(activeUid);
    }
  }, [user, refreshDailyUsage]);

  useEffect(() => {
    const unsubscribe = onAuthChange(async (firebaseUser) => {
      setLoading(true);

      if (!firebaseUser) {
        setUser(null);
        setUserProfile(null);
        setDailyUsage(null);
        setEmailVerified(false);
        setLoading(false);
        return;
      }

      try {
        await firebaseUser.reload().catch(() => {});
        if (!firebaseUser.emailVerified && firebaseUser.providerData[0]?.providerId === "password") {
          await logout();
          toast.error("Please verify your email first.");
          setUser(null);
          setUserProfile(null);
          setDailyUsage(null);
          setEmailVerified(false);
          setLoading(false);
          return;
        }

        setUser(firebaseUser);
        setEmailVerified(true);
        const profile = await getUserProfile(firebaseUser.uid);
        setUserProfile(profile as unknown as UserProfile);
        const usage = await getDailyUsage(firebaseUser.uid);
        setDailyUsage(usage);
      } catch (error) {
        console.error("Failed to refresh authentication state:", error);
        setUser(null);
        setUserProfile(null);
        setDailyUsage(null);
        setEmailVerified(false);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const isAuthenticated = !!user;

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setUserProfile(null);
    setDailyUsage(null);
    setEmailVerified(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        dailyUsage,
        loading,
        isAuthenticated,
        emailVerified,
        logout: handleLogout,
        refreshProfile,
        refreshDailyUsage,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
