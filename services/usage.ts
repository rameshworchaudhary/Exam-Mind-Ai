// services/usage.ts
// Server-side daily usage tracking and rate limit enforcement

export const DAILY_PDF_LIMIT = 5;
export const DAILY_CHAT_LIMIT = 35;

export interface ServerUsageState {
  date: string;
  pdfCount: number;
  chatCount: number;
  maxPdf: number;
  maxChat: number;
  pdfRemaining: number;
  chatRemaining: number;
}

// In-memory atomic store for server runtime (keyed by `${uid}_${date}`)
const inMemoryStore = new Map<string, { pdfCount: number; chatCount: number; updatedAt: number }>();

export function getTodayDateString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/**
 * Get the current usage for a user for today
 */
export async function getServerDailyUsage(uid: string): Promise<ServerUsageState> {
  const today = getTodayDateString();
  const key = `${uid}_${today}`;

  let record = inMemoryStore.get(key);
  if (!record) {
    record = { pdfCount: 0, chatCount: 0, updatedAt: Date.now() };
    inMemoryStore.set(key, record);
  }

  const pdfCount = Math.max(0, record.pdfCount);
  const chatCount = Math.max(0, record.chatCount);

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

/**
 * Check if the user has available quota for the given operation type.
 * Does NOT increment quota.
 */
export async function checkServerDailyUsage(
  uid: string,
  type: "pdf" | "chat"
): Promise<{ allowed: boolean; current: number; limit: number; remaining: number }> {
  if (!uid) {
    // If no UID is provided (e.g. unauthenticated preview test), allow by default
    return {
      allowed: true,
      current: 0,
      limit: type === "pdf" ? DAILY_PDF_LIMIT : DAILY_CHAT_LIMIT,
      remaining: type === "pdf" ? DAILY_PDF_LIMIT : DAILY_CHAT_LIMIT,
    };
  }

  const usage = await getServerDailyUsage(uid);
  const limit = type === "pdf" ? DAILY_PDF_LIMIT : DAILY_CHAT_LIMIT;
  const current = type === "pdf" ? usage.pdfCount : usage.chatCount;

  return {
    allowed: current < limit,
    current,
    limit,
    remaining: Math.max(0, limit - current),
  };
}

/**
 * Atomically increment usage ONLY AFTER successful AI completion.
 */
export async function incrementServerDailyUsage(
  uid: string,
  type: "pdf" | "chat"
): Promise<ServerUsageState> {
  if (!uid) {
    return getServerDailyUsage("anonymous");
  }

  const today = getTodayDateString();
  const key = `${uid}_${today}`;

  let record = inMemoryStore.get(key);
  if (!record) {
    record = { pdfCount: 0, chatCount: 0, updatedAt: Date.now() };
    inMemoryStore.set(key, record);
  }

  if (type === "pdf") {
    record.pdfCount += 1;
  } else {
    record.chatCount += 1;
  }
  record.updatedAt = Date.now();

  const pdfCount = record.pdfCount;
  const chatCount = record.chatCount;

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
