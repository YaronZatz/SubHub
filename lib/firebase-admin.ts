import { initializeApp, getApps, getApp, cert, ServiceAccount, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getStorage, Storage } from 'firebase-admin/storage';
import { getAuth, Auth } from 'firebase-admin/auth';

function parseAdminSdkConfig(jsonString: string | undefined): ServiceAccount | null {
  if (!jsonString) {
    console.log('[firebase-admin] ADMIN_SDK_CONFIG is not set');
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch (err) {
    console.error('[firebase-admin] ADMIN_SDK_CONFIG is set but contains invalid JSON:', err instanceof Error ? err.message : String(err));
    console.error('[firebase-admin] Value preview:', jsonString.slice(0, 80));
    return null;
  }
  if (!parsed || typeof parsed !== 'object') {
    console.error('[firebase-admin] ADMIN_SDK_CONFIG parsed to a non-object:', typeof parsed);
    return null;
  }
  if (!('client_email' in parsed)) {
    console.error('[firebase-admin] ADMIN_SDK_CONFIG JSON is missing "client_email" field');
    return null;
  }
  if (!('private_key' in parsed)) {
    console.error('[firebase-admin] ADMIN_SDK_CONFIG JSON is missing "private_key" field');
    return null;
  }
  return parsed as ServiceAccount;
}

function getAdminApp(): App {
  if (getApps().length > 0) return getApp();

  // ADMIN_SDK_CONFIG is set in production (apphosting.yaml).
  // FIREBASE_SERVICE_ACCOUNT_JSON is the local dev equivalent in .env.local.
  const serviceAccount = parseAdminSdkConfig(
    process.env.ADMIN_SDK_CONFIG ?? process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  );

  if (serviceAccount) {
    // Explicit service account — used in local dev via .env.local
    const projectId =
      serviceAccount.projectId ??
      (serviceAccount as unknown as { project_id?: string }).project_id;
    initializeApp({
      credential: cert(serviceAccount),
      projectId,
      storageBucket: `${projectId}.firebasestorage.app`,
    });
    console.log('[firebase-admin] Initialized with ADMIN_SDK_CONFIG service account');
  } else {
    // Application Default Credentials — automatic on Cloud Run / Firebase App Hosting.
    // The runtime service account already has Firestore + Storage access; no secret needed.
    const projectId =
      process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ??
      process.env.GCLOUD_PROJECT ??
      process.env.GOOGLE_CLOUD_PROJECT;
    if (!projectId) {
      throw new Error(
        '[firebase-admin] Cannot determine project ID. Set NEXT_PUBLIC_FIREBASE_PROJECT_ID or ADMIN_SDK_CONFIG.'
      );
    }
    initializeApp({
      projectId,
      storageBucket: `${projectId}.firebasestorage.app`,
    });
    console.log(`[firebase-admin] Initialized with Application Default Credentials (project=${projectId})`);
  }

  return getApp();
}

// Lazy getters: initialize only when used at runtime (e.g. in API routes).
export const adminDb = new Proxy({} as Firestore, {
  get(_, prop) {
    getAdminApp();
    return (getFirestore() as unknown as Record<string, unknown>)[prop as string];
  },
});
export const adminStorage = new Proxy({} as Storage, {
  get(_, prop) {
    getAdminApp();
    return (getStorage() as unknown as Record<string, unknown>)[prop as string];
  },
});
export const adminAuth = new Proxy({} as Auth, {
  get(_, prop) {
    getAdminApp();
    return (getAuth() as unknown as Record<string, unknown>)[prop as string];
  },
});
