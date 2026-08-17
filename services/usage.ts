// services/usage.ts
// Server-side daily usage tracking and rate limit enforcement using Firebase Admin SDK ONLY
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

export function getTodayDateString(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export interface VerificationResult {
  uid: string | null;
  error?: string;
  statusCode?: number;
}

/**
 * Extracts and strictly verifies the Firebase ID token from the Authorization header.
 * Disallows trusting a client-provided UID without matching token verification.
 */
export async function getVerifiedUid(
  req: NextRequest,
  clientUid?: string
): Promise<string | null> {
  const authHeader = req.headers.get("authorization");
  const hasAuthHeader = Boolean(authHeader);
  const isBearer = Boolean(authHeader && authHeader.startsWith("Bearer "));
  const idToken = isBearer ? authHeader!.split("Bearer ")[1]?.trim() : undefined;
  const tokenExtracted = Boolean(idToken && idToken.length > 0);

  console.log(`[Auth Diagnostic] Auth header present: ${hasAuthHeader}`);
  console.log(`[Auth Diagnostic] Bearer token extracted: ${tokenExtracted}`);

  if (tokenExtracted && idToken) {
    const adminAuth = getAdminAuth();
    if (!adminAuth) {
      console.warn("[Auth Diagnostic] Token verification failed: Admin Auth uninitialized");
      throw new Error("Firebase Admin Auth is not initialized. Check server credentials.");
    }

    try {
      const decoded = await adminAuth.verifyIdToken(idToken);
      if (!decoded || !decoded.uid) {
        console.warn("[Auth Diagnostic] Token verification failed: Invalid payload");
        throw new Error("Invalid Firebase ID token payload");
      }

      console.log("[Auth Diagnostic] Token verification: success");
      console.log("[Auth Diagnostic] Verified UID present: true");

      if (clientUid && clientUid !== "anonymous" && clientUid !== decoded.uid) {
        throw new Error("UID_MISMATCH: Supplied UID does not match authenticated token UID");
      }

      return decoded.uid;
    } catch (verifyErr) {
      console.warn(
        "[Auth Diagnostic] Token verification: failure -",
        verifyErr instanceof Error ? verifyErr.message : "Verification error"
      );
      throw verifyErr;
    }
  }

  // If no auth header but client explicitly provided a UID, reject spoofing
  if (clientUid && clientUid !== "anonymous") {
    console.warn("[Auth Diagnostic] Rejected unauthenticated request supplying a UID");
    throw new Error("UNAUTHORIZED: Client UID supplied without valid Authorization Bearer token");
  }

  return null;
}

/**
 * Get current daily usage strictly from Firestore via Firebase Admin SDK.
 * Reads dailyUsage/{uid}_{YYYY-MM-DD}.
 * Does not reset counts on subsequent requests or logins.
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
  const adminDb = getAdminFirestore();
  if (!adminDb) {
    throw new Error("Firebase Admin Firestore is not initialized");
  }

  let count = 0;
  let analysisCount = 0;
  let chatCount = 0;

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
      count =
        typeof data.count === "number"
          ? data.count
          : analysisCount + chatCount;
    }
  }

  return {
    uid,
    date: today,
    count,
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
 * Check if the user has available daily quota.
 * Does NOT increment quota.
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
 * Atomically increments daily usage strictly in Firestore using Firebase Admin SDK FieldValue.increment(1).
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

  const adminDb = getAdminFirestore();
  if (!adminDb) {
    throw new Error("Firebase Admin Firestore is not initialized");
  }

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

  console.log(`[Usage] UID: ${uid}`);
  console.log(`[Usage] Date: ${today}`);
  console.log(`[Usage] Writing document: dailyUsage/${docId}`);

  try {
    // Atomic set with merge ensures document creation and atomic counter increments in Firestore
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

    console.log("[Usage] Firestore write successful");
  } catch (writeErr) {
    const errorCode = (writeErr as { code?: string })?.code || "UNKNOWN";
    const errorMessage = writeErr instanceof Error ? writeErr.message : "Firestore write failed";
    console.error("[Usage] Firestore write failed");
    console.error(`[Usage] Error code: ${errorCode}`);
    console.error(`[Usage] Error message: ${errorMessage}`);
    throw writeErr;
  }

  // Return authoritative state directly from Firestore
  return getServerDailyUsage(uid);
}
