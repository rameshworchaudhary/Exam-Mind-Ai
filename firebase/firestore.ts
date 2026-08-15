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
import app from "./config";

export const db = getFirestore(app);

// Daily limit constants
export const DAILY_PDF_LIMIT = 5;
export const DAILY_CHAT_LIMIT = 35;

// =========================================
// USER SERVICES
// =========================================

export async function updateUserProfile(
  uid: string,
  data: Record<string, unknown>
) {
  if (!uid) return;
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
  if (!uid) return;
  try {
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, {
      [field]: increment(value),
      lastActiveDate: new Date().toISOString(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error incrementing user profile field:", error);
  }
}

export async function getUserProfile(uid: string) {
  if (!uid) return null;
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
  date: string;
  pdfCount: number;
  chatCount: number;
  maxPdf: number;
  maxChat: number;
  pdfRemaining: number;
  chatRemaining: number;
}

export function getTodayDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export async function getDailyUsage(uid: string): Promise<DailyUsageData> {
  const today = getTodayDateString();
  const docId = `${uid}_${today}`;
  const usageRef = doc(db, "dailyUsage", docId);
  
  try {
    const snap = await getDoc(usageRef);
    if (snap.exists()) {
      const data = snap.data();
      const pdfCount = typeof data.pdfCount === "number" ? data.pdfCount : 0;
      const chatCount = typeof data.chatCount === "number" ? data.chatCount : 0;
      return {
        date: today,
        pdfCount,
        chatCount,
        maxPdf: DAILY_PDF_LIMIT,
        maxChat: DAILY_CHAT_LIMIT,
        pdfRemaining: Math.max(0, DAILY_PDF_LIMIT - pdfCount),
        chatRemaining: Math.max(0, DAILY_CHAT_LIMIT - chatCount),
      };
    }
  } catch (error) {
    console.error("Error fetching daily usage:", error);
  }

  return {
    date: today,
    pdfCount: 0,
    chatCount: 0,
    maxPdf: DAILY_PDF_LIMIT,
    maxChat: DAILY_CHAT_LIMIT,
    pdfRemaining: DAILY_PDF_LIMIT,
    chatRemaining: DAILY_CHAT_LIMIT,
  };
}

export async function incrementDailyUsage(
  uid: string,
  type: "pdf" | "chat"
): Promise<{ success: boolean; currentCount: number; limit: number; remaining: number }> {
  const today = getTodayDateString();
  const docId = `${uid}_${today}`;
  const usageRef = doc(db, "dailyUsage", docId);
  const maxLimit = type === "pdf" ? DAILY_PDF_LIMIT : DAILY_CHAT_LIMIT;
  const field = type === "pdf" ? "pdfCount" : "chatCount";

  try {
    const result = await runTransaction(db, async (transaction) => {
      const usageDoc = await transaction.get(usageRef);
      let currentCount = 0;
      let otherCount = 0;
      const otherField = type === "pdf" ? "chatCount" : "pdfCount";

      if (usageDoc.exists()) {
        const data = usageDoc.data();
        currentCount = typeof data[field] === "number" ? data[field] : 0;
        otherCount = typeof data[otherField] === "number" ? data[otherField] : 0;
      }

      if (currentCount >= maxLimit) {
        return {
          success: false,
          currentCount,
          limit: maxLimit,
          remaining: 0,
        };
      }

      const nextCount = currentCount + 1;
      transaction.set(
        usageRef,
        {
          uid,
          date: today,
          [field]: nextCount,
          [otherField]: otherCount,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      return {
        success: true,
        currentCount: nextCount,
        limit: maxLimit,
        remaining: Math.max(0, maxLimit - nextCount),
      };
    });

    return result;
  } catch (error) {
    console.error("Transaction failed in incrementDailyUsage, using setDoc fallback:", error);
    // Fallback using atomic setDoc with increment
    await setDoc(
      usageRef,
      {
        uid,
        date: today,
        [field]: increment(1),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    const updated = await getDailyUsage(uid);
    const count = type === "pdf" ? updated.pdfCount : updated.chatCount;
    return {
      success: count <= maxLimit,
      currentCount: count,
      limit: maxLimit,
      remaining: Math.max(0, maxLimit - count),
    };
  }
}

export async function checkDailyUsageLimit(
  uid: string,
  type: "pdf" | "chat"
): Promise<{ allowed: boolean; current: number; limit: number; remaining: number }> {
  const usage = await getDailyUsage(uid);
  const maxLimit = type === "pdf" ? DAILY_PDF_LIMIT : DAILY_CHAT_LIMIT;
  const current = type === "pdf" ? usage.pdfCount : usage.chatCount;
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

export async function updateStudyStreak(uid: string) {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    const userData = userSnap.data();
    const lastActive = new Date(userData.lastActiveDate || "");
    const today = new Date();
    const diffDays = Math.floor(
      (today.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24)
    );

    let newStreak = userData.studyStreak || 0;
    if (diffDays === 1) {
      newStreak += 1;
    } else if (diffDays > 1) {
      newStreak = 1;
    }

    await updateDoc(userRef, {
      studyStreak: newStreak,
      lastActiveDate: today.toISOString(),
      updatedAt: serverTimestamp(),
    });

    return newStreak;
  }
  return 0;
}
