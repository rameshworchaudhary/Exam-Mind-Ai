// services/usage.ts
// Server-side daily usage tracking and rate limit enforcement using Firebase Admin SDK
import { getAdminFirestore, FieldValue } from "@/firebase/admin";

export const DAILY_ANALYSIS_LIMIT = 5;
export const DAILY_PDF_LIMIT = 5;
export const DAILY_CHAT_LIMIT = 35;

export interface ServerUsageState {
  uid?: string;
  date: string;
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

// In-memory atomic store as resilient fallback & fast-sync cache (keyed by `${uid}_${date}`)
const inMemoryStore = new Map<
  string,
  { analysisCount: number; chatCount: number; updatedAt: number }
>();

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Get the current daily usage for a user from Firestore via Firebase Admin SDK.
 * Reads the existing document for that UID and current date.
 * NEVER initializes existing counts back to zero.
 */
export async function getServerDailyUsage(uid: string): Promise<ServerUsageState> {
  const today = getTodayDateString();
  if (!uid || uid === "anonymous") {
    return {
      uid: "anonymous",
      date: today,
      analysisCount: 0,
      pdfCount: 0,
      chatCount: 0,
      maxAnalysis: DAILY_ANALYSIS_LIMIT,
      maxPdf: DAILY_PDF_LIMIT,
      maxChat: DAILY_CHAT_LIMIT,
      analysisRemaining: DAILY_ANALYSIS_LIMIT,
      pdfRemaining: DAILY_PDF_LIMIT,
      chatRemaining: DAILY_CHAT_LIMIT,
    };
  }

  const docId = `${uid}_${today}`;
  let analysisCount = 0;
  let chatCount = 0;

  try {
    const adminDb = getAdminFirestore();
    if (adminDb) {
      const docRef = adminDb.collection("dailyUsage").doc(docId);
      const snapshot = await docRef.get();

      if (snapshot.exists) {
        const data = snapshot.data();
        if (data) {
          analysisCount =
            typeof data.analysisCount === "number"
              ? data.analysisCount
              : typeof data.pdfCount === "number"
              ? data.pdfCount
              : 0;
          chatCount = typeof data.chatCount === "number" ? data.chatCount : 0;

          // Update memory cache with existing authoritative counts
          inMemoryStore.set(docId, {
            analysisCount,
            chatCount,
            updatedAt: Date.now(),
          });
        }
      } else {
        // Document does not exist yet in Firestore; check memory fallback
        const cached = inMemoryStore.get(docId);
        if (cached) {
          analysisCount = cached.analysisCount;
          chatCount = cached.chatCount;
        }
      }
    } else {
      const cached = inMemoryStore.get(docId);
      if (cached) {
        analysisCount = cached.analysisCount;
        chatCount = cached.chatCount;
      }
    }
  } catch (error) {
    console.warn("Notice: unable to read dailyUsage via Firebase Admin SDK:", error);
    const cached = inMemoryStore.get(docId);
    if (cached) {
      analysisCount = cached.analysisCount;
      chatCount = cached.chatCount;
    }
  }

  return {
    uid,
    date: today,
    analysisCount,
    pdfCount: analysisCount,
    chatCount,
    maxAnalysis: DAILY_ANALYSIS_LIMIT,
    maxPdf: DAILY_PDF_LIMIT,
    maxChat: DAILY_CHAT_LIMIT,
    analysisRemaining: Math.max(0, DAILY_ANALYSIS_LIMIT - analysisCount),
    pdfRemaining: Math.max(0, DAILY_PDF_LIMIT - analysisCount),
    chatRemaining: Math.max(0, DAILY_CHAT_LIMIT - chatCount),
  };
}

/**
 * Check if the user has available quota for the given operation type.
 * Does NOT increment quota.
 * Returns allowed: false if analysisCount >= 5 or chatCount >= 35.
 */
export async function checkServerDailyUsage(
  uid: string,
  type: "analysis" | "pdf" | "chat" | "both"
): Promise<{ allowed: boolean; current: number; limit: number; remaining: number; reason?: "pdf" | "ai" }> {
  if (!uid || uid === "anonymous") {
    const limit = type === "pdf" || type === "analysis" ? DAILY_PDF_LIMIT : DAILY_CHAT_LIMIT;
    return {
      allowed: true,
      current: 0,
      limit,
      remaining: limit,
    };
  }

  const usage = await getServerDailyUsage(uid);

  if (type === "pdf" || type === "analysis") {
    return {
      allowed: usage.pdfCount < DAILY_PDF_LIMIT,
      current: usage.pdfCount,
      limit: DAILY_PDF_LIMIT,
      remaining: usage.pdfRemaining,
      reason: "pdf",
    };
  }

  if (type === "both") {
    const pdfAllowed = usage.pdfCount < DAILY_PDF_LIMIT;
    const aiAllowed = usage.chatCount < DAILY_CHAT_LIMIT;

    if (!pdfAllowed) {
      return {
        allowed: false,
        current: usage.pdfCount,
        limit: DAILY_PDF_LIMIT,
        remaining: usage.pdfRemaining,
        reason: "pdf",
      };
    }

    if (!aiAllowed) {
      return {
        allowed: false,
        current: usage.chatCount,
        limit: DAILY_CHAT_LIMIT,
        remaining: usage.chatRemaining,
        reason: "ai",
      };
    }

    return {
      allowed: true,
      current: usage.chatCount,
      limit: DAILY_CHAT_LIMIT,
      remaining: usage.chatRemaining,
    };
  }

  return {
    allowed: usage.chatCount < DAILY_CHAT_LIMIT,
    current: usage.chatCount,
    limit: DAILY_CHAT_LIMIT,
    remaining: usage.chatRemaining,
    reason: "ai",
  };
}

/**
 * Atomically increment daily usage in Firestore using Firebase Admin SDK.
 * ONLY call this function after the AI request has succeeded!
 */
export async function incrementServerDailyUsage(
  uid: string,
  type: "analysis" | "pdf" | "chat" | "both"
): Promise<ServerUsageState> {
  const today = getTodayDateString();
  if (!uid || uid === "anonymous") {
    return getServerDailyUsage("anonymous");
  }

  const docId = `${uid}_${today}`;
  const isChat = type === "chat";
  const isPdf = type === "pdf" || type === "analysis";
  const isBoth = type === "both";

  const incrementChat = isChat || isBoth;
  const incrementPdf = isPdf || isBoth;

  // Persist atomically to Firestore via Firebase Admin SDK
  try {
    const adminDb = getAdminFirestore();
    if (adminDb) {
      const docRef = adminDb.collection("dailyUsage").doc(docId);

      await adminDb.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(docRef);

        if (!snapshot.exists) {
          const newDoc = {
            uid,
            date: today,
            analysisCount: incrementPdf ? 1 : 0,
            pdfCount: incrementPdf ? 1 : 0,
            chatCount: incrementChat ? 1 : 0,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          };
          transaction.set(docRef, newDoc);

          inMemoryStore.set(docId, {
            analysisCount: incrementPdf ? 1 : 0,
            chatCount: incrementChat ? 1 : 0,
            updatedAt: Date.now(),
          });
        } else {
          const data = snapshot.data() || {};
          const prevAnalysis =
            typeof data.analysisCount === "number"
              ? data.analysisCount
              : typeof data.pdfCount === "number"
              ? data.pdfCount
              : 0;
          const prevChat = typeof data.chatCount === "number" ? data.chatCount : 0;

          const nextChat = incrementChat ? prevChat + 1 : prevChat;
          const nextAnalysis = incrementPdf ? prevAnalysis + 1 : prevAnalysis;

          const updatePayload: Record<string, unknown> = {
            updatedAt: FieldValue.serverTimestamp(),
          };
          if (incrementChat) {
            updatePayload.chatCount = nextChat;
          }
          if (incrementPdf) {
            updatePayload.analysisCount = nextAnalysis;
            updatePayload.pdfCount = nextAnalysis;
          }

          transaction.update(docRef, updatePayload);

          inMemoryStore.set(docId, {
            analysisCount: nextAnalysis,
            chatCount: nextChat,
            updatedAt: Date.now(),
          });
        }
      });
    } else {
      let currentMemory = inMemoryStore.get(docId);
      if (!currentMemory) {
        currentMemory = { analysisCount: 0, chatCount: 0, updatedAt: Date.now() };
        inMemoryStore.set(docId, currentMemory);
      }
      if (incrementChat) currentMemory.chatCount += 1;
      if (incrementPdf) currentMemory.analysisCount += 1;
      currentMemory.updatedAt = Date.now();
    }
  } catch (error) {
    console.warn("Notice: Firestore transaction in Firebase Admin, using set fallback:", error);
    try {
      const adminDb = getAdminFirestore();
      if (adminDb) {
        const docRef = adminDb.collection("dailyUsage").doc(docId);
        const updatePayload: Record<string, unknown> = {
          uid,
          date: today,
          updatedAt: FieldValue.serverTimestamp(),
        };
        if (incrementChat) {
          updatePayload.chatCount = FieldValue.increment(1);
        }
        if (incrementPdf) {
          updatePayload.analysisCount = FieldValue.increment(1);
          updatePayload.pdfCount = FieldValue.increment(1);
        }
        await docRef.set(updatePayload, { merge: true });
      }
    } catch (setErr) {
      console.warn("Could not write daily usage increment to Firestore via Admin SDK:", setErr);
    }

    let currentMemory = inMemoryStore.get(docId);
    if (!currentMemory) {
      currentMemory = { analysisCount: 0, chatCount: 0, updatedAt: Date.now() };
      inMemoryStore.set(docId, currentMemory);
    }
    if (incrementChat) currentMemory.chatCount += 1;
    if (incrementPdf) currentMemory.analysisCount += 1;
    currentMemory.updatedAt = Date.now();
  }

  return getServerDailyUsage(uid);
}
