// firebase/auth.ts
import {
  signInWithPopup,
  signOut,
  User,
  onAuthStateChanged,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, googleProvider, db } from "./config";

// Create user profile
async function createUserProfile(user: User) {
  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) {
    const { email, displayName, photoURL, uid } = user;
    await setDoc(userRef, {
      uid,
      email,
      displayName: displayName || email?.split("@")[0],
      photoURL: photoURL || null,
      plan: "free",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      studyStreak: 0,
      lastActiveDate: new Date().toISOString(),
      subjects: [],
      aiUsageCount: 0,
      examReadiness: 0,
    });
  }
  return userRef;
}

// Google login only
export async function loginWithGoogle() {
  const userCredential = await signInWithPopup(auth, googleProvider);
  await createUserProfile(userCredential.user);
  return userCredential.user;
}

// Logout
export async function logout() {
  await signOut(auth);
}

// Get user profile
export async function getUserProfile(uid: string) {
  const userRef = doc(db, "users", uid);
  const userSnap = await getDoc(userRef);
  if (userSnap.exists()) {
    return { id: userSnap.id, ...userSnap.data() };
  }
  return null;
}

// Auth state observer
export function onAuthChange(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

// Get Authorization headers with current user ID token
export async function getAuthHeaders(explicitUser?: User | null): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};
  const targetUser = explicitUser || auth?.currentUser;

  if (targetUser) {
    try {
      const token = await targetUser.getIdToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
        return headers;
      }
    } catch (err) {
      console.warn("Notice: unable to get ID token from user:", err);
    }
  }

  if (auth && typeof auth.authStateReady === "function") {
    try {
      await auth.authStateReady();
      const readyUser = auth.currentUser;
      if (readyUser) {
        const token = await readyUser.getIdToken();
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
      }
    } catch {
      // ignore
    }
  }
  return headers;
}
