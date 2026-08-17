// firebase/admin.ts
import { getApps, initializeApp, cert, App } from "firebase-admin/app";
import { getFirestore, Firestore, FieldValue } from "firebase-admin/firestore";
import { getAuth, Auth } from "firebase-admin/auth";

let adminApp: App | null = null;
let adminDb: Firestore | null = null;
let adminAuth: Auth | null = null;

function resolveProjectId(): string {
  return (
    process.env.FIREBASE_ADMIN_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GCLOUD_PROJECT ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    "exam-mind-ai"
  );
}

function parsePrivateKey(rawKey?: string): string | undefined {
  if (!rawKey) return undefined;
  let key = rawKey.trim();
  // Strip surrounding quotes if present
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1);
  }
  // Convert literal escaped newlines to real newlines
  key = key.replace(/\\n/g, "\n");
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
  const clientEmail =
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL ||
    process.env.FIREBASE_CLIENT_EMAIL;
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
          // Attempt base64 decode
          try {
            jsonStr = Buffer.from(jsonStr, "base64").toString("utf-8");
          } catch {
            // keep as-is
          }
        }
        const serviceAccount = JSON.parse(jsonStr);
        adminApp = initializeApp({
          credential: cert(serviceAccount),
          projectId: serviceAccount.project_id || projectId,
        });
        return adminApp;
      } catch (parseErr) {
        console.warn("[Firebase Admin] Failed parsing service account JSON, falling back to credentials:", parseErr);
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

    // Initialize with application default credentials or project config
    adminApp = initializeApp({
      projectId,
    });
  } catch (error) {
    if (getApps().length > 0) {
      adminApp = getApps()[0]!;
    } else {
      console.warn("[Firebase Admin] Default initializeApp warning:", error);
      try {
        adminApp = initializeApp();
      } catch (_e) {
        adminApp = null;
      }
    }
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
    console.error("[Firebase Admin] Firestore initialization error:", error);
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
    console.error("[Firebase Admin] Auth initialization error:", error);
    return null;
  }
}

export { FieldValue };

