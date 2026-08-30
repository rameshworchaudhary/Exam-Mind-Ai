// firebase/firestore.ts
import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  increment,
  getFirestore,
  runTransaction,
} from "firebase/firestore";
import app, { auth } from "./config";

export const db = getFirestore(app);

// Daily limit constants
export const DAILY_PDF_LIMIT = 5;
export const DAILY_CHAT_LIMIT = 35;

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error("Firestore Error:", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// =========================================
// USER SERVICES
// =========================================

export async function updateUserProfile(
  uid: string,
  data: Record<string, unknown>
) {
  if (!uid) return;
  const path = `users/${uid}`;
  try {
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, { ...data, updatedAt: serverTimestamp() });
  } catch (error) {
    console.error("Error updating user profile:", error);
  }
}

export async function incrementUserProfileField(
  uid: string,
  field: string,
  value: number
) {
  if (!uid || uid === "anonymous") return;
  const path = `users/${uid}`;
  try {
    const userRef = doc(db, "users", uid);
    await setDoc(
      userRef,
      {
        [field]: increment(value),
        lastActiveDate: new Date().toISOString(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error("Error incrementing user profile field:", error);
  }
}

export async function getUserProfile(uid: string) {
  if (!uid) return null;
  const path = `users/${uid}`;
  try {
    const userRef = doc(db, "users", uid);
    const snap = await getDoc(userRef);
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch (error) {
    console.error("Error getting user profile:", error);
    return null;
  }
}

// =========================================
// DAILY USAGE TRACKING & LIMITS
// =========================================

export interface DailyUsageData {
  uid?: string;
  date: string;
  count: number;
  analysisCount: number;
  pdfCount: number;
  chatCount: number;
  maxAnalysis: number;
  maxPdf: number;
  maxChat: number;
  analysisRemaining: number;
  pdfRemaining: number;
  chatRemaining: number;
}

export function getTodayDateString(): string {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = parts.find((p) => p.type === "year")?.value;
  const month = parts.find((p) => p.type === "month")?.value;
  const day = parts.find((p) => p.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

export async function getDailyUsage(uid: string): Promise<DailyUsageData> {
  const today = getTodayDateString();
  if (!uid || uid === "anonymous") {
    return {
      uid: "anonymous",
      date: today,
      count: 0,
      analysisCount: 0,
      pdfCount: 0,
      chatCount: 0,
      maxAnalysis: DAILY_PDF_LIMIT,
      maxPdf: DAILY_PDF_LIMIT,
      maxChat: DAILY_CHAT_LIMIT,
      analysisRemaining: DAILY_PDF_LIMIT,
      pdfRemaining: DAILY_PDF_LIMIT,
      chatRemaining: DAILY_CHAT_LIMIT,
    };
  }

  // 1. Fetch authoritative server-side usage from /api/user/usage if in browser
  if (typeof window !== "undefined") {
    try {
      const headers: Record<string, string> = {};
      if (auth?.currentUser) {
        try {
          const token = await auth.currentUser.getIdToken();
          if (token) {
            headers["Authorization"] = `Bearer ${token}`;
          }
        } catch {
          // ignore token fetch error
        }
      }
      const res = await fetch(`/api/user/usage?uid=${encodeURIComponent(uid)}`, {
        cache: "no-store",
        headers,
      });
      if (res.ok) {
        const json = await res.json();
        const data = json.data || json;
        if (
          data &&
          (typeof data.count === "number" ||
            typeof data.analysisCount === "number" ||
            typeof data.pdfCount === "number" ||
            typeof data.chatCount === "number")
        ) {
          const analysisCount =
            typeof data.analysisCount === "number"
              ? data.analysisCount
              : typeof data.pdfCount === "number"
              ? data.pdfCount
              : 0;
          const chatCount = typeof data.chatCount === "number" ? data.chatCount : 0;
          const count =
            typeof data.count === "number"
              ? data.count
              : analysisCount + chatCount;
          return {
            uid,
            date: data.date || today,
            count,
            analysisCount,
            pdfCount: analysisCount,
            chatCount,
            maxAnalysis: DAILY_PDF_LIMIT,
            maxPdf: DAILY_PDF_LIMIT,
            maxChat: DAILY_CHAT_LIMIT,
            analysisRemaining: Math.max(0, DAILY_PDF_LIMIT - analysisCount),
            pdfRemaining: Math.max(0, DAILY_PDF_LIMIT - analysisCount),
            chatRemaining: Math.max(0, DAILY_CHAT_LIMIT - chatCount),
          };
        }
      }
    } catch (apiErr) {
      console.warn("Notice: unable to fetch daily usage via /api/user/usage:", apiErr);
    }
  }

  // 2. Client Firestore fallback
  const docId = `${uid}_${today}`;
  const usageRef = doc(db, "dailyUsage", docId);

  try {
    const snap = await getDoc(usageRef);
    if (snap.exists()) {
      const data = snap.data();
      const analysisCount =
        typeof data.analysisCount === "number"
          ? data.analysisCount
          : typeof data.pdfCount === "number"
          ? data.pdfCount
          : 0;
      const chatCount = typeof data.chatCount === "number" ? data.chatCount : 0;
      const count =
        typeof data.count === "number"
          ? data.count
          : analysisCount + chatCount;
      return {
        uid,
        date: today,
        count,
        analysisCount,
        pdfCount: analysisCount,
        chatCount,
        maxAnalysis: DAILY_PDF_LIMIT,
        maxPdf: DAILY_PDF_LIMIT,
        maxChat: DAILY_CHAT_LIMIT,
        analysisRemaining: Math.max(0, DAILY_PDF_LIMIT - analysisCount),
        pdfRemaining: Math.max(0, DAILY_PDF_LIMIT - analysisCount),
        chatRemaining: Math.max(0, DAILY_CHAT_LIMIT - chatCount),
      };
    }
  } catch (error) {
    // Client read may catch if doc does not exist yet; gracefully return empty initial quota
  }

  return {
    uid,
    date: today,
    count: 0,
    analysisCount: 0,
    pdfCount: 0,
    chatCount: 0,
    maxAnalysis: DAILY_PDF_LIMIT,
    maxPdf: DAILY_PDF_LIMIT,
    maxChat: DAILY_CHAT_LIMIT,
    analysisRemaining: DAILY_PDF_LIMIT,
    pdfRemaining: DAILY_PDF_LIMIT,
    chatRemaining: DAILY_CHAT_LIMIT,
  };
}

export async function checkDailyUsageLimit(
  uid: string,
  type: "pdf" | "chat" | "analysis"
): Promise<{ allowed: boolean; current: number; limit: number; remaining: number }> {
  const usage = await getDailyUsage(uid);
  const isChat = type === "chat";
  const maxLimit = isChat ? DAILY_CHAT_LIMIT : DAILY_PDF_LIMIT;
  const current = isChat ? usage.chatCount : usage.analysisCount;
  return {
    allowed: current < maxLimit,
    current,
    limit: maxLimit,
    remaining: Math.max(0, maxLimit - current),
  };
}

// =========================================
// UPLOADS / SYLLABUS
// =========================================

export async function saveUpload(
  uid: string,
  data: {
    type: string;
    fileName: string;
    fileUrl: string;
    analysis?: Record<string, unknown>;
    subject?: string;
  }
) {
  if (!uid) return null;
  const path = "uploads";
  try {
    const ref = await addDoc(collection(db, "uploads"), {
      uid,
      ...data,
      createdAt: serverTimestamp(),
    });
    return ref.id;
  } catch (error) {
    console.error("Error saving upload:", error);
    return null;
  }
}

export async function getUserUploads(uid: string) {
  if (!uid) return [];
  const path = "uploads";
  try {
    const q = query(
      collection(db, "uploads"),
      where("uid", "==", uid),
      orderBy("createdAt", "desc"),
      limit(20)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error("Error fetching uploads:", error);
    return [];
  }
}

export async function saveStudySyllabusSession(
  uid: string,
  data: {
    subject: string;
    courseCode?: string;
    units: Array<Record<string, unknown>>;
    totalTopics: number;
    completedTopicIds: string[];
    currentUnitId?: string;
    currentTopicId?: string;
    language: "english" | "hinglish";
    coverageMode: "one-by-one" | "unit-by-unit";
    summary?: string;
  }
) {
  if (!uid || uid === "anonymous") return null;
  try {
    const ref = await addDoc(collection(db, "uploads"), {
      uid,
      type: "study-from-syllabus",
      fileName: `${data.subject} Study Session`,
      fileUrl: "",
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  } catch (error) {
    console.error("Error saving study session:", error);
    return null;
  }
}

export async function updateStudySyllabusSession(
  sessionId: string,
  updates: Record<string, unknown>
) {
  if (!sessionId) return;
  try {
    const docRef = doc(db, "uploads", sessionId);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating study session:", error);
  }
}

export async function getUserStudySyllabusSessions(uid: string) {
  if (!uid || uid === "anonymous") return [];
  try {
    const q = query(
      collection(db, "uploads"),
      where("uid", "==", uid),
      where("type", "==", "study-from-syllabus"),
      orderBy("createdAt", "desc"),
      limit(10)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error("Error fetching study sessions:", error);
    return [];
  }
}

// =========================================
// NOTES
// =========================================

export async function saveNote(
  uid: string,
  data: {
    subject: string;
    topic: string;
    type: string;
    content: string;
  }
) {
  if (!uid) return null;
  const path = "notes";
  try {
    const ref = await addDoc(collection(db, "notes"), {
      uid,
      ...data,
      createdAt: serverTimestamp(),
    });
    return ref.id;
  } catch (error) {
    console.error("Error saving note:", error);
    return null;
  }
}

export async function getUserNotes(uid: string) {
  if (!uid) return [];
  const path = "notes";
  try {
    const q = query(
      collection(db, "notes"),
      where("uid", "==", uid),
      orderBy("createdAt", "desc"),
      limit(50)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error("Error fetching notes:", error);
    return [];
  }
}

// =========================================
// ASSIGNMENTS
// =========================================

export async function saveAssignment(
  uid: string,
  data: {
    question: string;
    answer: string;
    subject?: string;
    pdfUrl?: string;
  }
) {
  if (!uid) return null;
  const path = "assignments";
  try {
    const ref = await addDoc(collection(db, "assignments"), {
      uid,
      ...data,
      createdAt: serverTimestamp(),
    });
    return ref.id;
  } catch (error) {
    console.error("Error saving assignment:", error);
    return null;
  }
}

export async function getUserAssignments(uid: string) {
  if (!uid) return [];
  const path = "assignments";
  try {
    const q = query(
      collection(db, "assignments"),
      where("uid", "==", uid),
      orderBy("createdAt", "desc"),
      limit(20)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error("Error fetching assignments:", error);
    return [];
  }
}

// =========================================
// CHAT HISTORY
// =========================================

export async function saveChatMessage(
  uid: string,
  data: {
    role: "user" | "assistant";
    content: string;
    sessionId: string;
  }
) {
  if (!uid) return null;
  const path = "chatHistory";
  try {
    const ref = await addDoc(collection(db, "chatHistory"), {
      uid,
      ...data,
      createdAt: serverTimestamp(),
    });
    return ref.id;
  } catch (error) {
    console.error("Error saving chat message:", error);
    return null;
  }
}

export async function getChatHistory(uid: string, sessionId: string) {
  if (!uid) return [];
  const path = "chatHistory";
  try {
    const q = query(
      collection(db, "chatHistory"),
      where("uid", "==", uid),
      where("sessionId", "==", sessionId),
      orderBy("createdAt", "asc"),
      limit(100)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error("Error fetching chat history:", error);
    return [];
  }
}

// =========================================
// STUDY PLANS
// =========================================

export async function saveStudyPlan(
  uid: string,
  data: {
    examDate: string;
    subjects: string[];
    preparationLevel: string;
    plan: Record<string, unknown>;
  }
) {
  if (!uid) return null;
  const path = "studyPlans";
  try {
    const ref = await addDoc(collection(db, "studyPlans"), {
      uid,
      ...data,
      createdAt: serverTimestamp(),
    });
    return ref.id;
  } catch (error) {
    console.error("Error saving study plan:", error);
    return null;
  }
}

export async function getUserStudyPlans(uid: string) {
  if (!uid) return [];
  const path = "studyPlans";
  try {
    const q = query(
      collection(db, "studyPlans"),
      where("uid", "==", uid),
      orderBy("createdAt", "desc"),
      limit(10)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error("Error fetching study plans:", error);
    return [];
  }
}

// =========================================
// PREDICTIONS
// =========================================

export async function savePrediction(
  uid: string,
  data: Record<string, unknown>
) {
  if (!uid) return null;
  const path = "predictions";
  try {
    const ref = await addDoc(collection(db, "predictions"), {
      uid,
      ...data,
      createdAt: serverTimestamp(),
    });
    return ref.id;
  } catch (error) {
    console.error("Error saving prediction:", error);
    return null;
  }
}

// =========================================
// STUDY STREAK
// =========================================

export async function calculateAndSyncDailyStreak(uid: string): Promise<{
  streak: number;
  updated: boolean;
  lastActiveDate?: string;
  isConsecutive: boolean;
}> {
  if (!uid || uid === "anonymous") {
    return { streak: 0, updated: false, isConsecutive: false };
  }

  const userRef = doc(db, "users", uid);
  const todayStr = getTodayDateString();

  try {
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      return { streak: 1, updated: false, isConsecutive: false };
    }

    const data = userSnap.data();
    const currentStreak = typeof data.studyStreak === "number" ? data.studyStreak : 0;
    const lastActiveRaw = data.lastActiveDate || data.lastLoginDate;

    let lastDateStr = "";
    if (lastActiveRaw) {
      if (typeof lastActiveRaw === "string") {
        lastDateStr = lastActiveRaw.substring(0, 10);
      } else if (lastActiveRaw.toDate && typeof lastActiveRaw.toDate === "function") {
        lastDateStr = lastActiveRaw.toDate().toISOString().substring(0, 10);
      }
    }

    // If already logged in and recorded today
    if (lastDateStr === todayStr) {
      const streak = currentStreak > 0 ? currentStreak : 1;
      if (currentStreak === 0) {
        await updateDoc(userRef, {
          studyStreak: 1,
          lastActiveDate: new Date().toISOString(),
          lastLoginDate: todayStr,
          updatedAt: serverTimestamp(),
        });
      }
      return { streak, updated: false, lastActiveDate: lastDateStr, isConsecutive: true };
    }

    // Calculate if consecutive from yesterday
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;

    let newStreak = 1;
    let isConsecutive = false;

    if (lastDateStr === yesterdayStr) {
      // Consecutive login yesterday!
      newStreak = currentStreak + 1;
      isConsecutive = true;
    } else {
      // Broken streak or first login
      newStreak = 1;
      isConsecutive = false;
    }

    await updateDoc(userRef, {
      studyStreak: newStreak,
      lastActiveDate: new Date().toISOString(),
      lastLoginDate: todayStr,
      updatedAt: serverTimestamp(),
    });

    return {
      streak: newStreak,
      updated: true,
      lastActiveDate: todayStr,
      isConsecutive,
    };
  } catch (error) {
    console.error("Error calculating daily streak:", error);
    return { streak: 1, updated: false, isConsecutive: false };
  }
}

export async function updateStudyStreak(uid: string) {
  const result = await calculateAndSyncDailyStreak(uid);
  return result.streak;
}

