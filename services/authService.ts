
import { auth } from '../lib/firebase';
// Fix: Use separate type and value imports to resolve "no exported member" errors in certain environments
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  updateProfile,
  signInWithPopup,
  signInWithRedirect,
  GoogleAuthProvider,
  OAuthProvider,
  FacebookAuthProvider
} from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { User } from '../types';
import { authErrorMessage, type AuthErrorCode } from '../lib/accountCopy';

export type { AuthErrorCode };

/** Result of an auth call. `errorCode` is stable; the UI localizes it. `error` is an English fallback, never a raw Firebase message. */
export type AuthResult = { success: boolean; user?: User; error?: string; errorCode?: AuthErrorCode };

function fail(code: AuthErrorCode): AuthResult {
  return { success: false, errorCode: code, error: authErrorMessage(code, 'en') };
}

/** Map a Firebase Auth error code to our stable code. */
function mapFirebaseError(error: unknown, fallback: AuthErrorCode): AuthErrorCode {
  const code = (error as { code?: string } | null)?.code;
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'invalid-credentials';
    case 'auth/invalid-email':
      return 'invalid-email';
    case 'auth/email-already-in-use':
      return 'email-in-use';
    case 'auth/weak-password':
      return 'weak-password';
    case 'auth/popup-blocked':
      return 'popup-blocked';
    case 'auth/cancelled-popup-request':
    case 'auth/popup-closed-by-user':
    case 'auth/user-cancelled':
      return 'cancelled';
    case 'auth/network-request-failed':
      return 'network';
    case 'auth/too-many-requests':
      return 'too-many-requests';
    default:
      return fallback;
  }
}

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

  async login(email: string, password: string): Promise<AuthResult> {
    // Fallback to Mock Auth only when Firebase is not initialized (e.g. dev). Not for production.
    if (!auth) {
      if (process.env.NODE_ENV === 'production') {
        return fail('not-configured');
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
      return fail(mapFirebaseError(error, 'unknown'));
    }
  },

  async signup(name: string, email: string, password: string): Promise<AuthResult> {
    // Fallback to Mock Auth only when Firebase is not initialized (e.g. dev). Not for production.
    if (!auth) {
      if (process.env.NODE_ENV === 'production') {
        return fail('not-configured');
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
      return fail(mapFirebaseError(error, 'signup-failed'));
    }
  },

  async loginWithGoogle(): Promise<AuthResult> {
    if (!auth) {
      if (process.env.NODE_ENV === 'production') {
        return fail('not-configured');
      }
      console.warn('SubHub: Development/mock auth only; not for production.');
      const mockUser: User = {
        id: 'mock-google-' + Math.random().toString(36).substr(2, 9),
        name: 'Google User',
        email: 'google@example.com',
        createdAt: Date.now()
      };
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(mockUser));
      return { success: true, user: mockUser };
    }
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const user = this.mapFirebaseUser(userCredential.user);
      return { success: true, user: user || undefined };
    } catch (error: any) {
      if (error.code === 'auth/popup-blocked') {
        try {
          await signInWithRedirect(auth, new GoogleAuthProvider());
          return fail('popup-redirect');
        } catch (redirectErr: any) {
          console.error('Firebase Google redirect error:', redirectErr);
          return fail('popup-blocked');
        }
      }
      console.error('Firebase Google Login Error:', error);
      return fail(mapFirebaseError(error, 'provider-failed'));
    }
  },

  async loginWithApple(): Promise<AuthResult> {
    if (!auth) {
      if (process.env.NODE_ENV === 'production') {
        return fail('not-configured');
      }
      console.warn('SubHub: Development/mock auth only; not for production.');
      const mockUser: User = {
        id: 'mock-apple-' + Math.random().toString(36).substr(2, 9),
        name: 'Apple User',
        email: 'apple@example.com',
        createdAt: Date.now()
      };
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(mockUser));
      return { success: true, user: mockUser };
    }
    try {
      const provider = new OAuthProvider('apple.com');
      const userCredential = await signInWithPopup(auth, provider);
      const user = this.mapFirebaseUser(userCredential.user);
      return { success: true, user: user || undefined };
    } catch (error: any) {
      if (error.code === 'auth/popup-blocked') {
        try {
          await signInWithRedirect(auth, new OAuthProvider('apple.com'));
          return fail('popup-redirect');
        } catch (redirectErr: any) {
          console.error('Firebase Apple redirect error:', redirectErr);
          return fail('popup-blocked');
        }
      }
      console.error('Firebase Apple Login Error:', error);
      return fail(mapFirebaseError(error, 'provider-failed'));
    }
  },

  async loginWithFacebook(): Promise<AuthResult> {
    if (!auth) {
      if (process.env.NODE_ENV === 'production') {
        return fail('not-configured');
      }
      console.warn('SubHub: Development/mock auth only; not for production.');
      const mockUser: User = {
        id: 'mock-facebook-' + Math.random().toString(36).substr(2, 9),
        name: 'Facebook User',
        email: 'facebook@example.com',
        createdAt: Date.now()
      };
      localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(mockUser));
      return { success: true, user: mockUser };
    }
    try {
      const provider = new FacebookAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const user = this.mapFirebaseUser(userCredential.user);
      return { success: true, user: user || undefined };
    } catch (error: any) {
      if (error.code === 'auth/popup-blocked') {
        try {
          await signInWithRedirect(auth, new FacebookAuthProvider());
          return fail('popup-redirect');
        } catch (redirectErr: any) {
          console.error('Firebase Facebook redirect error:', redirectErr);
          return fail('popup-blocked');
        }
      }
      console.error('Firebase Facebook Login Error:', error);
      return fail(mapFirebaseError(error, 'provider-failed'));
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
