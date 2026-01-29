import admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    // בשרת (App Hosting), נשתמש באתחול אוטומטי ללא מפתחות
    if (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) {
      admin.initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        storageBucket: `${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}.firebasestorage.app`,
      });
    } 
    // אם אנחנו במחשב שלך וסיפקת מפתחות ידניים, הוא ישתמש בהם
    else if (process.env.FIREBASE_CLIENT_EMAIL) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      });
    }
  } catch (error) {
    console.error('Firebase admin initialization error', error);
  }
}

export const adminDb = admin.firestore();
export const adminStorage = admin.storage();
export const adminAuth = admin.auth();