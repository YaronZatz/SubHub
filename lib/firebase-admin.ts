import admin from 'firebase-admin';

function parseAdminSdkConfig(jsonString: string | undefined): admin.ServiceAccount | null {
  if (!jsonString || typeof jsonString !== 'string') return null;
  try {
    const parsed = JSON.parse(jsonString) as unknown;
    if (parsed && typeof parsed === 'object' && 'client_email' in parsed && 'private_key' in parsed) {
      return parsed as admin.ServiceAccount;
    }
  } catch {
    // Invalid JSON – ignore
  }
  return null;
}

function getAdminApp() {
  if (admin.apps.length === 0) {
    const serviceAccount = parseAdminSdkConfig(process.env.ADMIN_SDK_CONFIG);
    if (!serviceAccount) {
      throw new Error('ADMIN_SDK_CONFIG must be set with valid service account JSON');
    }
    const projectId =
      serviceAccount.projectId ??
      (serviceAccount as unknown as { project_id?: string }).project_id;
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId,
      storageBucket: `${projectId}.firebasestorage.app`,
    });
  }
  return admin.app();
}

// Lazy getters: initialize only when used at runtime (e.g. in API routes).
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