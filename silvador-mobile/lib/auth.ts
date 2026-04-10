import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth } from './firebase';
import { registerUser } from './api';
import type { UserRole } from '../types';

export { onAuthStateChanged };

export function login(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function register(
  email: string,
  password: string,
  displayName: string,
  role: UserRole
) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  // Create Firestore user doc via API
  await registerUser({ email, password, displayName, role });
  return credential;
}

export function resetPassword(email: string) {
  return sendPasswordResetEmail(auth, email);
}

export function logout() {
  return signOut(auth);
}

export function getCurrentFirebaseUser(): FirebaseUser | null {
  return auth.currentUser;
}

export async function getToken(): Promise<string | null> {
  return auth.currentUser?.getIdToken() ?? null;
}
