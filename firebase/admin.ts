// firebase/admin.ts
import { getApps, initializeApp, cert, App } from "firebase-admin/app";
import { getFirestore, Firestore, FieldValue } from "firebase-admin/firestore";
import { getAuth, Auth } from "firebase-admin/auth";

let adminApp: App | null = null;
let adminDb: Firestore | null = null;
let adminAuth: Auth | null = null;

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
 * Robustly parses and formats PKCS#8 or RSA private keys for Firebase Admin.
 * Handles literal `\n`, `\r\n`, escaped backslashes, base64-encoded PEMs,
 * surrounding quotes, and unformatted raw base64.
 */
function parsePrivateKey(rawKey?: string): string | undefined {
  if (!rawKey) return undefined;
  let key = rawKey.trim();

  // If the whole key is base64 encoded (e.g. from an env variable encoded in base64)
  if (!key.includes("BEGIN PRIVATE KEY") && !key.includes("BEGIN RSA PRIVATE KEY")) {
    try {
      const decoded = Buffer.from(key, "base64").toString("utf-8");
      if (decoded.includes("BEGIN PRIVATE KEY") || decoded.includes("BEGIN RSA PRIVATE KEY")) {
        key = decoded.trim();
      }
    } catch {
      // not base64
    }
  }

  // Strip leading/trailing surrounding quotes or backticks
  while (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'")) ||
    (key.startsWith("`") && key.endsWith("`"))
  ) {
    key = key.slice(1, -1).trim();
  }

  // Unescape backslash sequences: \\n -> \n, \\r -> \r, \r\n -> \n
  key = key.replace(/\\r\\n/g, "\n").replace(/\\n/g, "\n").replace(/\\r/g, "\n");
  key = key.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // If the key has standard PEM headers, extract and clean the base64 payload
  const match = key.match(/-----BEGIN (?:RSA )?PRIVATE KEY-----([\s\S]*?)-----END (?:RSA )?PRIVATE KEY-----/);
  if (match) {
    // Keep only valid base64 characters in the body
    const base64Body = match[1].replace(/[^A-Za-z0-9+/=]/g, "");
    if (base64Body.length > 0) {
      // Format into 64-character PEM lines
      const chunked = base64Body.match(/.{1,64}/g) || [base64Body];
      return `-----BEGIN PRIVATE KEY-----\n${chunked.join("\n")}\n-----END PRIVATE KEY-----\n`;
    }
  }

  // If no PEM header exists, but a raw base64 string was provided
  const cleanBase64 = key.replace(/[^A-Za-z0-9+/=]/g, "");
  if (cleanBase64.length >= 100) {
    const chunked = cleanBase64.match(/.{1,64}/g) || [cleanBase64];
    return `-----BEGIN PRIVATE KEY-----\n${chunked.join("\n")}\n-----END PRIVATE KEY-----\n`;
  }

  return key;
}

export function getAdminApp(): App | null {
  if (getApps().length > 0) {
    return getApps()[0]!;
  }

  if (adminApp) {
    return adminApp;
  }

  const projectId = resolveProjectId();
  const clientEmail = (
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL ||
    process.env.FIREBASE_CLIENT_EMAIL ||
    ""
  ).trim();
  const rawPrivateKey =
    process.env.FIREBASE_ADMIN_PRIVATE_KEY ||
    process.env.FIREBASE_PRIVATE_KEY;
  const privateKey = parsePrivateKey(rawPrivateKey);

  const rawServiceAccountJson =
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
    process.env.FIREBASE_ADMIN_CREDENTIALS ||
    process.env.FIREBASE_CONFIG;

  try {
    if (rawServiceAccountJson) {
      try {
        let jsonStr = rawServiceAccountJson.trim();
        if (!jsonStr.startsWith("{")) {
          try {
            jsonStr = Buffer.from(jsonStr, "base64").toString("utf-8");
          } catch {
            // keep as is
          }
        }
        const serviceAccount = JSON.parse(jsonStr);
        if (serviceAccount.private_key) {
          serviceAccount.private_key =
            parsePrivateKey(serviceAccount.private_key) || serviceAccount.private_key;
        }
        adminApp = initializeApp({
          credential: cert(serviceAccount),
          projectId: serviceAccount.project_id || projectId,
        });
        return adminApp;
      } catch (parseErr) {
        console.warn("[Firebase Admin] Service account JSON parse error, falling back to credentials:", parseErr);
      }
    }

    if (clientEmail && privateKey) {
      adminApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        projectId,
      });
      return adminApp;
    }

    // If explicit project id is available and on GCP environment
    if (projectId && projectId !== "placeholder-project" && (process.env.K_SERVICE || process.env.VERCEL)) {
      adminApp = initializeApp({
        projectId,
      });
      return adminApp;
    }
  } catch (error) {
    if (getApps().length > 0) {
      adminApp = getApps()[0]!;
      return adminApp;
    }
    console.warn("[Firebase Admin] Initialization notice:", error instanceof Error ? error.message : error);
    adminApp = null;
  }

  return adminApp;
}

export function getAdminFirestore(): Firestore | null {
  try {
    if (!adminDb) {
      const app = getAdminApp();
      if (app) {
        adminDb = getFirestore(app);
      }
    }
    return adminDb;
  } catch (error) {
    console.warn("[Firebase Admin] Firestore unavailable:", error instanceof Error ? error.message : error);
    return null;
  }
}

export function getAdminAuth(): Auth | null {
  try {
    if (!adminAuth) {
      const app = getAdminApp();
      if (app) {
        adminAuth = getAuth(app);
      }
    }
    return adminAuth;
  } catch (error) {
    console.warn("[Firebase Admin] Auth unavailable:", error instanceof Error ? error.message : error);
    return null;
  }
}

export { FieldValue };

