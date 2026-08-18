// firebase/admin.ts
import type { App } from "firebase-admin/app";
import type { Firestore } from "firebase-admin/firestore";
import type { Auth } from "firebase-admin/auth";

let adminApp: App | null = null;
let adminDb: Firestore | null = null;
let adminAuth: Auth | null = null;
let initAttempted = false;

function resolveProjectId(): string {
  const pid =
    process.env.FIREBASE_ADMIN_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GCLOUD_PROJECT ||
    process.env.GOOGLE_CLOUD_PROJECT;

  return pid ? pid.trim() : "exam-mind-ai";
}

/**
 * Generates candidate formats of a private key to maximize compatibility with
 * different .env parsers, OS line-ending conventions, and escaping styles.
 */
function getPrivateKeyCandidates(rawKey?: string): string[] {
  if (!rawKey) return [];
  const candidates: string[] = [];

  let key = rawKey.trim();

  // Strip wrapping quotes
  while (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'")) ||
    (key.startsWith("`") && key.endsWith("`"))
  ) {
    key = key.slice(1, -1).trim();
  }

  // Candidate 1: Standard literal \n replacement
  const simpleReplaced = key.replace(/\\n/g, "\n").replace(/\\r/g, "\r");
  candidates.push(simpleReplaced);

  // Candidate 2: Normalized \r\n to \n
  const unixNewlines = simpleReplaced.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (!candidates.includes(unixNewlines)) {
    candidates.push(unixNewlines);
  }

  // Candidate 3: Base64 decoded if string was base64 encoded
  if (!key.includes("BEGIN PRIVATE KEY") && !key.includes("BEGIN RSA PRIVATE KEY")) {
    try {
      const decoded = Buffer.from(key, "base64").toString("utf-8");
      if (decoded.includes("BEGIN PRIVATE KEY") || decoded.includes("BEGIN RSA PRIVATE KEY")) {
        const decodedNorm = decoded.replace(/\\n/g, "\n").replace(/\r\n/g, "\n");
        if (!candidates.includes(decodedNorm)) {
          candidates.push(decodedNorm);
        }
      }
    } catch {}
  }

  // Candidate 4: Reconstructed PEM with strict 64-char lines
  const pemMatch = unixNewlines.match(/-----BEGIN (?:RSA )?PRIVATE KEY-----([\s\S]*?)-----END (?:RSA )?PRIVATE KEY-----/);
  if (pemMatch) {
    const isRsa = unixNewlines.includes("BEGIN RSA PRIVATE KEY");
    const header = isRsa ? "-----BEGIN RSA PRIVATE KEY-----" : "-----BEGIN PRIVATE KEY-----";
    const footer = isRsa ? "-----END RSA PRIVATE KEY-----" : "-----END PRIVATE KEY-----";
    const body = pemMatch[1].replace(/[^A-Za-z0-9+/=]/g, "");
    if (body.length > 0) {
      const chunked = body.match(/.{1,64}/g) || [body];
      const reconstructed = `${header}\n${chunked.join("\n")}\n${footer}\n`;
      if (!candidates.includes(reconstructed)) {
        candidates.push(reconstructed);
      }
    }
  }

  // Candidate 5: Raw key as is
  if (!candidates.includes(rawKey)) {
    candidates.push(rawKey);
  }

  return candidates;
}

export function getAdminApp(): App | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const adminAppModule = require("firebase-admin/app");
    const { getApps, initializeApp, cert } = adminAppModule;

    if (getApps().length > 0) {
      return getApps()[0]!;
    }

    if (adminApp || initAttempted) {
      return adminApp;
    }

    initAttempted = true;

    const projectId = resolveProjectId();
    const clientEmail = (
      process.env.FIREBASE_ADMIN_CLIENT_EMAIL ||
      process.env.FIREBASE_CLIENT_EMAIL ||
      ""
    ).trim();
    const rawPrivateKey =
      process.env.FIREBASE_ADMIN_PRIVATE_KEY ||
      process.env.FIREBASE_PRIVATE_KEY;

    const rawServiceAccountJson =
      process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
      process.env.FIREBASE_ADMIN_CREDENTIALS ||
      process.env.FIREBASE_CONFIG;

    // 1. Try service account JSON if present
    if (rawServiceAccountJson) {
      try {
        let jsonStr = rawServiceAccountJson.trim();
        if (!jsonStr.startsWith("{")) {
          try {
            jsonStr = Buffer.from(jsonStr, "base64").toString("utf-8");
          } catch {}
        }
        const serviceAccount = JSON.parse(jsonStr);
        adminApp = initializeApp({
          credential: cert(serviceAccount),
          projectId: serviceAccount.project_id || projectId,
        });
        return adminApp;
      } catch (parseErr) {
        console.warn("[Firebase Admin] Service account JSON notice:", parseErr instanceof Error ? parseErr.message : parseErr);
      }
    }

    // 2. Try clientEmail + privateKey candidates
    if (clientEmail && rawPrivateKey) {
      const candidates = getPrivateKeyCandidates(rawPrivateKey);
      for (const keyCandidate of candidates) {
        try {
          adminApp = initializeApp({
            credential: cert({
              projectId,
              clientEmail,
              privateKey: keyCandidate,
            }),
            projectId,
          });
          return adminApp;
        } catch {
          // Continue to next candidate
        }
      }
      console.info("[Firebase Admin] Service account key not configured or format requires standard PEM. Using resilient in-memory store for session usage.");
    }

    // 3. Try GCP environment ADC if hosted
    if (projectId && projectId !== "placeholder-project" && (process.env.K_SERVICE || process.env.VERCEL)) {
      try {
        adminApp = initializeApp({
          projectId,
        });
        return adminApp;
      } catch {}
    }

    return adminApp;
  } catch (error) {
    console.warn("[Firebase Admin] App module notice:", error instanceof Error ? error.message : error);
    return null;
  }
}

export function getAdminFirestore(): Firestore | null {
  try {
    if (!adminDb) {
      const app = getAdminApp();
      if (app) {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { getFirestore } = require("firebase-admin/firestore");
        adminDb = getFirestore(app);
      }
    }
    return adminDb;
  } catch {
    return null;
  }
}

export function getAdminAuth(): Auth | null {
  try {
    if (!adminAuth) {
      const app = getAdminApp();
      if (app) {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { getAuth } = require("firebase-admin/auth");
        adminAuth = getAuth(app);
      }
    }
    return adminAuth;
  } catch {
    return null;
  }
}

// Safe FieldValue helper that doesn't crash if firestore isn't present
export const FieldValue = {
  increment: (n: number) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { FieldValue: AdminFieldValue } = require("firebase-admin/firestore");
      return AdminFieldValue.increment(n);
    } catch {
      return { _increment: n };
    }
  },
  serverTimestamp: () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { FieldValue: AdminFieldValue } = require("firebase-admin/firestore");
      return AdminFieldValue.serverTimestamp();
    } catch {
      return new Date();
    }
  },
};


