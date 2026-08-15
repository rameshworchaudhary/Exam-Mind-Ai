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

          // Update memory cache
          inMemoryStore.set(docId, {
            analysisCount,
            chatCount,
            updatedAt: Date.now(),
          });
        }
      } else {
        // Document does not exist yet; check in-memory cache
        const cached = inMemoryStore.get(docId);
        if (cached) {
          analysisCount = cached.analysisCount;
          chatCount = cached.chatCount;
        }
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
  type: "analysis" | "pdf" | "chat"
): Promise<{ allowed: boolean; current: number; limit: number; remaining: number }> {
  if (!uid || uid === "anonymous") {
    const limit = type === "chat" ? DAILY_CHAT_LIMIT : DAILY_ANALYSIS_LIMIT;
    return {
      allowed: true,
      current: 0,
      limit,
      remaining: limit,
    };
  }

  const usage = await getServerDailyUsage(uid);
  const isChat = type === "chat";
  const limit = isChat ? DAILY_CHAT_LIMIT : DAILY_ANALYSIS_LIMIT;
  const current = isChat ? usage.chatCount : usage.analysisCount;

  return {
    allowed: current < limit,
    current,
    limit,
    remaining: Math.max(0, limit - current),
  };
}

/**
 * Atomically increment daily usage in Firestore using Firebase Admin SDK.
 * ONLY call this function after the AI request has succeeded!
 */
export async function incrementServerDailyUsage(
  uid: string,
  type: "analysis" | "pdf" | "chat"
): Promise<ServerUsageState> {
  const today = getTodayDateString();
  if (!uid || uid === "anonymous") {
    return getServerDailyUsage("anonymous");
  }

  const docId = `${uid}_${today}`;
  const isChat = type === "chat";

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
            analysisCount: isChat ? 0 : 1,
            pdfCount: isChat ? 0 : 1,
            chatCount: isChat ? 1 : 0,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          };
          transaction.set(docRef, newDoc);

          inMemoryStore.set(docId, {
            analysisCount: isChat ? 0 : 1,
            chatCount: isChat ? 1 : 0,
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

          const nextChat = isChat ? prevChat + 1 : prevChat;
          const nextAnalysis = isChat ? prevAnalysis : prevAnalysis + 1;

          if (isChat) {
            transaction.update(docRef, {
              chatCount: nextChat,
              updatedAt: FieldValue.serverTimestamp(),
            });
          } else {
            transaction.update(docRef, {
              analysisCount: nextAnalysis,
              pdfCount: nextAnalysis,
              updatedAt: FieldValue.serverTimestamp(),
            });
          }

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
      if (isChat) {
        currentMemory.chatCount += 1;
      } else {
        currentMemory.analysisCount += 1;
      }
      currentMemory.updatedAt = Date.now();
    }
  } catch (error) {
    console.warn("Notice: Firestore transaction in Firebase Admin, using set fallback:", error);
    try {
      const adminDb = getAdminFirestore();
      if (adminDb) {
        const docRef = adminDb.collection("dailyUsage").doc(docId);
        const incrementField = isChat ? "chatCount" : "analysisCount";
        const updatePayload: Record<string, unknown> = {
          uid,
          date: today,
          [incrementField]: FieldValue.increment(1),
          updatedAt: FieldValue.serverTimestamp(),
        };
        if (!isChat) {
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
    if (isChat) {
      currentMemory.chatCount += 1;
    } else {
      currentMemory.analysisCount += 1;
    }
    currentMemory.updatedAt = Date.now();
  }

  return getServerDailyUsage(uid);
}
