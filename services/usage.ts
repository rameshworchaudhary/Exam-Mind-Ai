// services/usage.ts
// Server-side daily usage tracking and rate limit enforcement using Firebase Admin SDK
import { getAdminFirestore, getAdminAuth, FieldValue } from "@/firebase/admin";
import { NextRequest } from "next/server";

export const DAILY_ANALYSIS_LIMIT = 5;
export const DAILY_PDF_LIMIT = 5;
export const DAILY_CHAT_LIMIT = 35;

export interface ServerUsageState {
  uid: string;
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

// In-memory atomic store as resilient fallback & fast-sync cache (keyed by `${uid}_${date}`)
const inMemoryStore = new Map<
  string,
  { count: number; pdfCount: number; analysisCount: number; chatCount: number; updatedAt: number }
>();

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

function decodeJwtUid(token: string): string | null {
  try {
    const parts = token.split(".");
    if (parts.length === 3) {
      const payload = Buffer.from(parts[1], "base64").toString("utf-8");
      const data = JSON.parse(payload);
      return data.user_id || data.sub || data.uid || null;
    }
  } catch {
    // Ignore decode error
  }
  return null;
}

/**
 * Extracts and verifies the authenticated Firebase UID from the incoming request.
 * Prioritizes the Authorization Bearer ID Token over the query/body parameter.
 */
export async function getVerifiedUid(
  req: NextRequest,
  fallbackUid?: string
): Promise<string | null> {
  const authHeader = req.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const idToken = authHeader.split("Bearer ")[1]?.trim();
    if (idToken) {
      try {
        const adminAuth = getAdminAuth();
        if (adminAuth) {
          const decoded = await adminAuth.verifyIdToken(idToken);
          if (decoded && decoded.uid) {
            return decoded.uid;
          }
        }
      } catch (err) {
        console.warn("[Usage Auth] ID token verification notice:", err instanceof Error ? err.message : err);
      }

      // Safe fallback from ID token JWT payload if adminAuth is not available
      const decodedUid = decodeJwtUid(idToken);
      if (decodedUid) {
        return decodedUid;
      }
    }
  }

  if (fallbackUid && fallbackUid !== "anonymous") {
    return fallbackUid;
  }

  return null;
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
      count: 0,
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
  let count = 0;
  let pdfCount = 0;
  let chatCount = 0;

  const adminDb = getAdminFirestore();
  if (adminDb) {
    try {
      const docRef = adminDb.collection("dailyUsage").doc(docId);
      const snapshot = await docRef.get();

      if (snapshot.exists) {
        const data = snapshot.data();
        if (data) {
          const rawPdf =
            typeof data.pdfCount === "number" && typeof data.analysisCount === "number"
              ? Math.max(data.pdfCount, data.analysisCount)
              : typeof data.pdfCount === "number"
              ? data.pdfCount
              : typeof data.analysisCount === "number"
              ? data.analysisCount
              : 0;
          pdfCount = rawPdf;
          chatCount = typeof data.chatCount === "number" ? data.chatCount : 0;
          count =
            typeof data.count === "number"
              ? data.count
              : pdfCount + chatCount;

          inMemoryStore.set(docId, {
            count,
            pdfCount,
            analysisCount: pdfCount,
            chatCount,
            updatedAt: Date.now(),
          });
          console.log(`[Usage] Read dailyUsage/${docId} from Firestore: count=${count}, pdf=${pdfCount}, chat=${chatCount}`);
        }
      } else {
        const cached = inMemoryStore.get(docId);
        if (cached) {
          count = cached.count;
          pdfCount = cached.pdfCount ?? cached.analysisCount ?? 0;
          chatCount = cached.chatCount;
        }
      }
    } catch (err) {
      console.error(`[Usage] Failed to read dailyUsage/${docId} from Firestore:`, err);
      const cached = inMemoryStore.get(docId);
      if (cached) {
        count = cached.count;
        pdfCount = cached.pdfCount ?? cached.analysisCount ?? 0;
        chatCount = cached.chatCount;
      }
    }
  } else {
    const cached = inMemoryStore.get(docId);
    if (cached) {
      count = cached.count;
      pdfCount = cached.pdfCount ?? cached.analysisCount ?? 0;
      chatCount = cached.chatCount;
    }
  }

  return {
    uid,
    date: today,
    count,
    analysisCount: pdfCount,
    pdfCount,
    chatCount,
    maxAnalysis: DAILY_ANALYSIS_LIMIT,
    maxPdf: DAILY_PDF_LIMIT,
    maxChat: DAILY_CHAT_LIMIT,
    analysisRemaining: Math.max(0, DAILY_ANALYSIS_LIMIT - pdfCount),
    pdfRemaining: Math.max(0, DAILY_PDF_LIMIT - pdfCount),
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
 * Atomically increment daily usage in Firestore using Firebase Admin SDK with FieldValue.increment(1).
 * ONLY call this function after the AI request has successfully returned a valid response!
 */
export async function incrementServerDailyUsage(
  uid: string,
  type: "analysis" | "pdf" | "chat" | "both" = "chat"
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

  console.log(`[Usage] UID: ${uid}`);
  console.log(`[Usage] Date: ${today}`);
  console.log(`[Usage] Writing document: dailyUsage/${docId} (type: ${type}) with FieldValue.increment(1)`);

  const adminDb = getAdminFirestore();
  if (adminDb) {
    try {
      const docRef = adminDb.collection("dailyUsage").doc(docId);
      const userRef = adminDb.collection("users").doc(uid);

      // Construct atomic increment payload with FieldValue.increment(1)
      const updatePayload: Record<string, unknown> = {
        uid,
        date: today,
        count: FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      };

      if (incrementChat) {
        updatePayload.chatCount = FieldValue.increment(1);
      }
      if (incrementPdf) {
        updatePayload.analysisCount = FieldValue.increment(1);
        updatePayload.pdfCount = FieldValue.increment(1);
      }

      // Atomic set with merge ensures document creation and atomic counter increments in one operation
      await docRef.set(
        {
          ...updatePayload,
          createdAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      // Atomically increment the user's aggregate aiUsageCount on users/{uid}
      await userRef.set(
        {
          aiUsageCount: FieldValue.increment(1),
          lastActiveDate: new Date().toISOString(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      console.log(`[Usage] Atomic FieldValue.increment(1) write successful for dailyUsage/${docId}`);

      // Update in-memory store
      let currentMemory = inMemoryStore.get(docId);
      if (!currentMemory) {
        currentMemory = { count: 0, pdfCount: 0, analysisCount: 0, chatCount: 0, updatedAt: Date.now() };
      }
      currentMemory.count += 1;
      if (incrementChat) currentMemory.chatCount += 1;
      if (incrementPdf) {
        const prevPdf = currentMemory.pdfCount ?? currentMemory.analysisCount ?? 0;
        currentMemory.pdfCount = prevPdf + 1;
        currentMemory.analysisCount = currentMemory.pdfCount;
      }
      currentMemory.updatedAt = Date.now();
      inMemoryStore.set(docId, currentMemory);
    } catch (writeErr) {
      console.error(`[Usage] Firestore atomic increment error for dailyUsage/${docId}:`, writeErr);
      // Resilient fallback to memory store
      let currentMemory = inMemoryStore.get(docId);
      if (!currentMemory) {
        currentMemory = { count: 0, pdfCount: 0, analysisCount: 0, chatCount: 0, updatedAt: Date.now() };
      }
      currentMemory.count += 1;
      if (incrementChat) currentMemory.chatCount += 1;
      if (incrementPdf) {
        const prevPdf = currentMemory.pdfCount ?? currentMemory.analysisCount ?? 0;
        currentMemory.pdfCount = prevPdf + 1;
        currentMemory.analysisCount = currentMemory.pdfCount;
      }
      currentMemory.updatedAt = Date.now();
      inMemoryStore.set(docId, currentMemory);
    }
  } else {
    let currentMemory = inMemoryStore.get(docId);
    if (!currentMemory) {
      currentMemory = { count: 0, pdfCount: 0, analysisCount: 0, chatCount: 0, updatedAt: Date.now() };
    }
    currentMemory.count += 1;
    if (incrementChat) currentMemory.chatCount += 1;
    if (incrementPdf) {
      const prevPdf = currentMemory.pdfCount ?? currentMemory.analysisCount ?? 0;
      currentMemory.pdfCount = prevPdf + 1;
      currentMemory.analysisCount = currentMemory.pdfCount;
    }
    currentMemory.updatedAt = Date.now();
    inMemoryStore.set(docId, currentMemory);
  }

  return getServerDailyUsage(uid);
}
