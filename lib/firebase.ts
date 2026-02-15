import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import type { Auth } from "firebase/auth";

/**
 * FIREBASE CLIENT CONFIG
 * ----------------------
 * These are PUBLIC client-side keys — safe to hardcode per Firebase docs.
 * They only identify your project; security is enforced by Firestore rules.
 *
 * Source: apphosting.yaml environment variables
 */
const firebaseConfig = {
    apiKey: "AIzaSyBO1YsFaPoL30LxrW0nsMYR8h2BKzNKe0s",
    authDomain: "gen-lang-client-0322888127.firebaseapp.com",
    projectId: "gen-lang-client-0322888127",
    storageBucket: "gen-lang-client-0322888127.firebasestorage.app",
};

let app: FirebaseApp | undefined;
let db: Firestore | undefined;
let auth: Auth | undefined;

try {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
    db = getFirestore(app);
    auth = getAuth(app);
    console.log("✅ Firebase initialized successfully for project:", firebaseConfig.projectId);
} catch (error) {
    console.error("❌ Firebase Initialization Failed:", error);
    app = undefined;
    db = undefined;
    auth = undefined;
}

export { db, auth, app };
