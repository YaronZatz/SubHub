/**
 * POST /api/listings
 *
 * Saves a user-submitted listing to Firestore using the Admin SDK.
 * Client SDK cannot write directly (Firestore rules: allow write: if false).
 * Requires the caller to be authenticated (Firebase ID token in Authorization header).
 */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';

export async function POST(req: NextRequest) {
  try {
    // Verify Firebase ID token
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let uid: string;
    try {
      const decoded = await adminAuth.verifyIdToken(token);
      uid = decoded.uid;
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const listing = await req.json();

    // Ensure ownerId matches the authenticated user
    if (listing.ownerId && listing.ownerId !== uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id, ...data } = listing;
    const docRef = await adminDb.collection('listings').add({
      ...data,
      ownerId: uid,
      createdAt: Date.now(),
    });

    return NextResponse.json({ id: docRef.id }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/listings] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
