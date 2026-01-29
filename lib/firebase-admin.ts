import admin from 'firebase-admin';

function getAdminApp() {
  if (!admin.apps.length) {
    admin.initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebasestorage.app`,
    });
  }
  return admin.app();
}

// Lazy getters: only initialize Firebase when actually used at runtime (e.g. in API routes).
// This avoids "default Firebase app does not exist" during `next build` when env may be unset.
export const adminDb = new Proxy({} as admin.firestore.Firestore, {
  get(_, prop) {
    getAdminApp();
    return (admin.firestore() as unknown as Record<string, unknown>)[prop as string];
  },
});
export const adminStorage = new Proxy({} as admin.storage.Storage, {
  get(_, prop) {
    getAdminApp();
    return (admin.storage() as unknown as Record<string, unknown>)[prop as string];
  },
});
export const adminAuth = new Proxy({} as admin.auth.Auth, {
  get(_, prop) {
    getAdminApp();
    return (admin.auth() as unknown as Record<string, unknown>)[prop as string];
  },
});