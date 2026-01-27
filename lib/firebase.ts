
// Fix: Consolidate type and value imports for Firebase to resolve "no exported member" errors
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
// Fix: Split type and value imports for Auth to prevent resolution errors for named exports
import { getAuth } from "firebase/auth";
import type { Auth } from "firebase/auth";

// Safe helper to access environment variables in the browser
const getEnv = (key: string): string => {
    if (typeof window !== 'undefined') {
        const winEnv = (window as any).process?.env?.[key];
        if (winEnv) return winEnv;
        
        const winKey = (window as any)[key];
        if (winKey) return winKey;
    }
    try {
        return process.env[key] || '';
    } catch (e) {
        return '';
    }
};

const apiKey = getEnv('NEXT_PUBLIC_FIREBASE_API_KEY') || getEnv('API_KEY');
const projectId = getEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID');

const firebaseConfig = {
  apiKey: apiKey,
  authDomain: getEnv('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'),
  projectId: projectId,
  storageBucket: getEnv('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnv('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
  appId: getEnv('NEXT_PUBLIC_FIREBASE_APP_ID'),
};

let app: FirebaseApp | undefined;
let db: Firestore | undefined;
let auth: Auth | undefined;

/**
 * FIREBASE INITIALIZATION SAFETY
 * Firestore requires at least a valid 'projectId'.
 * Auth requires at least a valid 'apiKey'.
 */
if (apiKey && projectId && projectId !== 'undefined') {
    try {
        app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
        db = getFirestore(app);
        auth = getAuth(app);
        console.log("Firebase initialized successfully.");
    } catch (error) {
        console.error("Firebase Initialization Failed:", error);
    }
} else {
    // Silent fallback to Local Mode - no console warnings to avoid cluttering UX
    app = undefined;
    db = undefined;
    auth = undefined;
}

export { db, auth, app };
