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