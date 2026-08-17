// firebase/admin.ts
import { getApps, initializeApp, cert, App, ServiceAccount } from "firebase-admin/app";
import { getFirestore, Firestore, FieldValue } from "firebase-admin/firestore";
import { getAuth, Auth } from "firebase-admin/auth";

let adminApp: App | null = null;
let adminDb: Firestore | null = null;
let adminAuth: Auth | null = null;

export function resolveProjectId(): string {
  return (
    process.env.FIREBASE_ADMIN_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GCLOUD_PROJECT ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    "exam-mind-ai"
  );
}

/**
 * Normalizes only the representation of the environment value:
 * - removes matching surrounding quotes if present (double, single, or backtick)
 * - converts literal \n, \\n, and \r\n into standard newline characters
 * - trims surrounding whitespace
 * - preserves standard PEM BEGIN/END boundaries with standard 64-char lines
 */
export function normalizePrivateKey(rawKey?: string): string | undefined {
  if (!rawKey || typeof rawKey !== "string") return undefined;
  let key = rawKey.trim();

  // Strip matching surrounding quotes if present (e.g., `"..."`, `'...'`, or nested quotes)
  let prevKey = "";
  while (
    key !== prevKey &&
    ((key.startsWith('"') && key.endsWith('"')) ||
      (key.startsWith("'") && key.endsWith("'")) ||
      (key.startsWith("`") && key.endsWith("`")))
  ) {
    prevKey = key;
    key = key.slice(1, -1).trim();
  }

  // Convert literal escaped newlines and carriage returns to real newlines
  key = key
    .replace(/\\\\n/g, "\n")
    .replace(/\\r\\n/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();

  // If the key has BEGIN PRIVATE KEY and END PRIVATE KEY, ensure clean standard structure
  const beginMatch = key.match(/-----BEGIN [A-Z ]*PRIVATE KEY-----/);
  const endMatch = key.match(/-----END [A-Z ]*PRIVATE KEY-----/);

  if (beginMatch && endMatch) {
    const beginHeader = beginMatch[0];
    const endHeader = endMatch[0];
    const bodyStartIndex = key.indexOf(beginHeader) + beginHeader.length;
    const bodyEndIndex = key.indexOf(endHeader);
    const rawBody = key.substring(bodyStartIndex, bodyEndIndex);

    // Strip all non-base64 characters from the key body
    const cleanBody = rawBody.replace(/[^A-Za-z0-9+/=]/g, "");

    if (cleanBody.length > 0) {
      const formattedBody = cleanBody.match(/.{1,64}/g)?.join("\n") || cleanBody;
      key = `${beginHeader}\n${formattedBody}\n${endHeader}\n`;
    }
  }

  // Ensure trailing newline for standard OpenSSL PEM parsing
  if (!key.endsWith("\n")) {
    key += "\n";
  }

  return key;
}

export function isValidPemKey(key?: string): boolean {
  if (!key || typeof key !== "string") return false;
  const hasBegin =
    key.includes("-----BEGIN PRIVATE KEY-----") ||
    key.includes("-----BEGIN RSA PRIVATE KEY-----") ||
    key.includes("-----BEGIN EC PRIVATE KEY-----");
  const hasEnd =
    key.includes("-----END PRIVATE KEY-----") ||
    key.includes("-----END RSA PRIVATE KEY-----") ||
    key.includes("-----END EC PRIVATE KEY-----");
  return hasBegin && hasEnd && key.length > 100;
}

export function getAdminApp(): App | null {
  if (getApps().length > 0) {
    adminApp = getApps()[0]!;
    return adminApp;
  }

  if (adminApp) {
    return adminApp;
  }

  const projectId = resolveProjectId();
  const clientEmail =
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL ||
    process.env.FIREBASE_CLIENT_EMAIL;
  const rawPrivateKey =
    process.env.FIREBASE_ADMIN_PRIVATE_KEY ||
    process.env.FIREBASE_PRIVATE_KEY;
  const rawServiceAccountJson =
    process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
    process.env.FIREBASE_ADMIN_CREDENTIALS ||
    process.env.FIREBASE_CONFIG;

  const privateKey = rawPrivateKey ? normalizePrivateKey(rawPrivateKey) : undefined;
  const keyFormat = privateKey
    ? isValidPemKey(privateKey)
      ? "valid"
      : "invalid"
    : rawServiceAccountJson
    ? "service_account_json"
    : "missing";

  // 1. SERVICE ACCOUNT JSON CONFIGURATION
  if (rawServiceAccountJson) {
    console.log(`[Firebase Admin] Project configured: ${projectId}`);
    console.log(`[Firebase Admin] Credential source: FIREBASE_SERVICE_ACCOUNT_KEY`);
    console.log(`[Firebase Admin] Admin credentials detected: true`);
    console.log(`[Firebase Admin] Private key format: service_account_json`);

    try {
      let jsonStr = rawServiceAccountJson.trim();
      while (
        (jsonStr.startsWith('"') && jsonStr.endsWith('"')) ||
        (jsonStr.startsWith("'") && jsonStr.endsWith("'"))
      ) {
        jsonStr = jsonStr.slice(1, -1).trim();
      }
      if (!jsonStr.startsWith("{")) {
        try {
          jsonStr = Buffer.from(jsonStr, "base64").toString("utf-8");
        } catch {
          // retain original
        }
      }
      const serviceAccount = JSON.parse(jsonStr) as ServiceAccount & {
        project_id?: string;
        client_email?: string;
        private_key?: string;
      };

      if (serviceAccount.private_key) {
        serviceAccount.private_key = normalizePrivateKey(serviceAccount.private_key);
      }

      if (serviceAccount.client_email && serviceAccount.private_key) {
        const saProjectId = serviceAccount.project_id || projectId;
        adminApp = initializeApp({
          credential: cert(serviceAccount),
          projectId: saProjectId,
        });
        console.log("[Firebase Admin] Auth initialized successfully");
        console.log("[Firebase Admin] Firestore initialized successfully");
        return adminApp;
      }
    } catch {
      console.warn("[Firebase Admin] Private key initialization failed");
      adminApp = null;
      return null;
    }
  }

  // 2. INDIVIDUAL ENVIRONMENT VARIABLES
  if (clientEmail || rawPrivateKey) {
    console.log(`[Firebase Admin] Project configured: ${projectId}`);
    console.log(`[Firebase Admin] Credential source: environment`);
    console.log(`[Firebase Admin] Admin credentials detected: ${Boolean(clientEmail && rawPrivateKey)}`);
    console.log(`[Firebase Admin] Private key format: ${keyFormat}`);

    if (!clientEmail || !privateKey || !isValidPemKey(privateKey)) {
      console.warn("[Firebase Admin] Private key initialization failed");
      adminApp = null;
      return null;
    }

    try {
      const credential = cert({
        projectId,
        clientEmail,
        privateKey,
      });

      adminApp = initializeApp({
        credential,
        projectId,
      });
      console.log("[Firebase Admin] Auth initialized successfully");
      console.log("[Firebase Admin] Firestore initialized successfully");
      return adminApp;
    } catch {
      console.warn("[Firebase Admin] Private key initialization failed");
      adminApp = null;
      return null;
    }
  }

  // 3. CREDENTIALS MISSING IN ENVIRONMENT
  console.log(`[Firebase Admin] Project configured: ${projectId}`);
  console.log(`[Firebase Admin] Credential source: missing`);
  console.log(`[Firebase Admin] Admin credentials detected: false`);
  console.log(`[Firebase Admin] Private key format: missing`);
  console.warn("[Firebase Admin] Admin credentials are missing");
  adminApp = null;
  return null;
}

export function getAdminFirestore(): Firestore | null {
  try {
    if (!adminDb) {
      const app = getAdminApp();
      if (!app) {
        console.warn("[Firebase Admin] Firestore initialization failed: missing or invalid credentials");
        return null;
      }
      adminDb = getFirestore(app);
    }
    return adminDb;
  } catch {
    console.warn("[Firebase Admin] Firestore initialization failed: missing or invalid credentials");
    return null;
  }
}

export function getAdminAuth(): Auth | null {
  try {
    if (!adminAuth) {
      const app = getAdminApp();
      if (!app) {
        console.warn("[Firebase Admin] Auth initialization failed: missing or invalid credentials");
        return null;
      }
      adminAuth = getAuth(app);
    }
    return adminAuth;
  } catch {
    console.warn("[Firebase Admin] Auth initialization failed: missing or invalid credentials");
    return null;
  }
}

export { FieldValue };
