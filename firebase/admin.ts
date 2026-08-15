// firebase/admin.ts
import { getApps, initializeApp, cert, App } from "firebase-admin/app";
import { getFirestore, Firestore, FieldValue } from "firebase-admin/firestore";

let adminApp: App | null = null;
let adminDb: Firestore | null = null;

export function getAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0]!;
  }

  if (adminApp) {
    return adminApp;
  }

  const projectId =
    process.env.FIREBASE_ADMIN_PROJECT_ID ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    process.env.GCLOUD_PROJECT ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    "examind-ai";

  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (privateKey) {
    privateKey = privateKey.replace(/\\n/g, "\n");
  }

  try {
    if (clientEmail && privateKey) {
      adminApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
        projectId,
      });
    } else {
      adminApp = initializeApp({
        projectId,
      });
    }
  } catch (error) {
    console.warn("Notice during Firebase Admin initialization, attempting default init:", error);
    if (getApps().length > 0) {
      adminApp = getApps()[0]!;
    } else {
      adminApp = initializeApp();
    }
  }

  return adminApp;
}

export function getAdminFirestore(): Firestore | null {
  try {
    if (!adminDb) {
      const app = getAdminApp();
      adminDb = getFirestore(app);
    }
    return adminDb;
  } catch (error) {
    console.warn("Firebase Admin Firestore unavailable:", error instanceof Error ? error.message : error);
    return null;
  }
}

export { FieldValue };
