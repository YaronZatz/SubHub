/**
 * POST /api/admin/migrate-status
 *
 * One-time backfill: finds all user-posted listings with status 'Available' or 'AVAILABLE'
 * and updates them to 'active' (the canonical Firestore value going forward).
 *
 * Scraped listings (Taken / expired) are untouched.
 * Returns { updated: N }.
 */
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export async function POST() {
  try {
    const results = await Promise.all(
      ['Available', 'AVAILABLE'].map(val =>
        adminDb.collection('listings').where('status', '==', val).get()
      )
    );

    const batch = adminDb.batch();
    let updated = 0;

    for (const snap of results) {
      for (const doc of snap.docs) {
        batch.update(doc.ref, { status: 'active', updatedAt: Date.now() });
        updated++;
      }
    }

    if (updated > 0) await batch.commit();

    return NextResponse.json({ updated });
  } catch (err) {
    console.error('[POST /api/admin/migrate-status] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
