export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { adminDb } from '@/lib/firebase-admin';
import admin from 'firebase-admin';

/** Verify and decode a Facebook signed_request */
function parseSignedRequest(
  signedRequest: string,
  appSecret: string
): { user_id: string } | null {
  const dot = signedRequest.indexOf('.');
  if (dot === -1) return null;

  const encodedSig = signedRequest.slice(0, dot);
  const payload    = signedRequest.slice(dot + 1);

  // Validate HMAC-SHA256 signature
  const expectedSig = crypto
    .createHmac('sha256', appSecret)
    .update(payload)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  if (encodedSig !== expectedSig) return null;

  try {
    const json = Buffer.from(payload, 'base64url').toString('utf-8');
    return JSON.parse(json) as { user_id: string };
  } catch {
    return null;
  }
}

/** Delete all data associated with a Facebook user UID */
async function deleteUserData(facebookUserId: string, confirmationCode: string) {
  try {
    // Resolve Firebase UID from Facebook provider UID
    let firebaseUid: string | null = null;
    try {
      const record = await admin.auth().getUserByProviderUid('facebook.com', facebookUserId);
      firebaseUid = record.uid;
    } catch {
      // User may not exist in Firebase Auth (already deleted or never signed up)
    }

    if (firebaseUid) {
      // Delete user's listings from Firestore
      const snap = await adminDb
        .collection('sublets')
        .where('ownerId', '==', firebaseUid)
        .get();

      if (!snap.empty) {
        const batch = adminDb.batch();
        snap.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
      }

      // Delete the Firebase Auth account
      await admin.auth().deleteUser(firebaseUid);
    }

    await adminDb.collection('data_deletion_requests').doc(confirmationCode).update({
      status: 'completed',
      firebaseUid: firebaseUid ?? 'not_found',
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error('Data deletion error:', error);
    await adminDb.collection('data_deletion_requests').doc(confirmationCode).update({
      status: 'failed',
      error: String(error),
    });
  }
}

export async function POST(req: NextRequest) {
  const appSecret = process.env.FACEBOOK_APP_SECRET;
  if (!appSecret) {
    console.error('FACEBOOK_APP_SECRET is not set');
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  // Facebook sends application/x-www-form-urlencoded
  const body = await req.text();
  const params = new URLSearchParams(body);
  const signedRequest = params.get('signed_request');

  if (!signedRequest) {
    return NextResponse.json({ error: 'Missing signed_request' }, { status: 400 });
  }

  const data = parseSignedRequest(signedRequest, appSecret);
  if (!data?.user_id) {
    return NextResponse.json({ error: 'Invalid signed_request' }, { status: 400 });
  }

  const confirmationCode = crypto.randomUUID();
  const proto = req.headers.get('x-forwarded-proto') ?? 'https';
  const host  = req.headers.get('host') ?? '';
  const statusUrl = `${proto}://${host}/data-deletion?id=${confirmationCode}`;

  // Record the request immediately so the status page works right away
  await adminDb.collection('data_deletion_requests').doc(confirmationCode).set({
    facebookUserId: data.user_id,
    status: 'pending',
    requestedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  // Run deletion in background — Facebook expects a fast response
  deleteUserData(data.user_id, confirmationCode).catch(console.error);

  return NextResponse.json({ url: statusUrl, confirmation_code: confirmationCode });
}
