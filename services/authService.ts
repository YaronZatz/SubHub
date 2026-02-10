
import { auth } from '../lib/firebase';
// Fix: Use separate type and value imports to resolve "no exported member" errors in certain environments
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  updateProfile
} from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { User } from '../types';

/** Local storage key for mock user only. Used only when Firebase is not configured (e.g. dev). Not for production. */
const LOCAL_USER_KEY = 'subhub_local_user';

export const authService = {
  /**
   * Map a Firebase User object to our internal User type
   */
  mapFirebaseUser(firebaseUser: FirebaseUser | null): User | null {
    if (!firebaseUser) return null;
    return {
      id: firebaseUser.uid,
      name: firebaseUser.displayName || 'Anonymous User',
      email: firebaseUser.email || '',
      createdAt: firebaseUser.metadata.creationTime ? new Date(firebaseUser.metadata.creationTime).getTime() : Date.now()
    };
  },

  async login(email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
    // Fallback to Mock Auth only when Firebase is not initialized (e.g. dev). Not for production.
    if (!auth) {
      if (process.env.NODE_ENV === 'production') {
        return { success: false, error: 'Authentication is not configured.' };
      }
      console.warn('SubHub: Development/mock auth only; not for production.');
      return new Promise((resolve) => {
        setTimeout(() => {
          const mockUser: User = {
            id: 'mock-user-123',
            name: email.split('@')[0] || 'Local User',
            email: email,
            createdAt: Date.now()
          };
          localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(mockUser));
          resolve({ success: true, user: mockUser });
        }, 800);
      });
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = this.mapFirebaseUser(userCredential.user);
      return { success: true, user: user || undefined };
    } catch (error: any) {
      console.error("Firebase Login Error:", error);
      let message = "Invalid email or password";
      if (error.code === 'auth/user-not-found') message = "Account not found";
      if (error.code === 'auth/wrong-password') message = "Incorrect password";
      return { success: false, error: message };
    }
  },

  async signup(name: string, email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
    // Fallback to Mock Auth only when Firebase is not initialized (e.g. dev). Not for production.
    if (!auth) {
      if (process.env.NODE_ENV === 'production') {
        return { success: false, error: 'Authentication is not configured.' };
      }
      console.warn('SubHub: Development/mock auth only; not for production.');
      return new Promise((resolve) => {
        setTimeout(() => {
          const mockUser: User = {
            id: 'mock-user-' + Math.random().toString(36).substr(2, 9),
            name: name,
            email: email,
            createdAt: Date.now()
          };
          localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(mockUser));
          resolve({ success: true, user: mockUser });
        }, 800);
      });
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: name });
      const user = this.mapFirebaseUser(userCredential.user);
      return { success: true, user: user || undefined };
    } catch (error: any) {
      console.error("Firebase Signup Error:", error);
      let message = "Failed to create account";
      if (error.code === 'auth/email-already-in-use') message = "Email already registered";
      if (error.code === 'auth/weak-password') message = "Password is too weak";
      return { success: false, error: message };
    }
  },

  async logout() {
    if (!auth) {
      localStorage.removeItem(LOCAL_USER_KEY);
      return;
    }
    await signOut(auth);
  },

  getLocalUser(): User | null {
    const saved = localStorage.getItem(LOCAL_USER_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  }
};
