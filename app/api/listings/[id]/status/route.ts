/**
 * PATCH /api/listings/[id]/status
 *
 * Transitions a user-posted listing through its lifecycle:
 *   active  → paused | filled | deleted
 *   paused  → active | filled | deleted
 *   filled  → deleted
 *   deleted → (final — 409)
 *
 * Scraped listings (Taken / expired) cannot be changed — 400.
 * Auth-protected via Firebase ID token. Only the original owner may change status.
 */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase-admin';
import admin from 'firebase-admin';

type AllowedStatus = 'active' | 'paused' | 'filled' | 'deleted';
const ALLOWED: AllowedStatus[] = ['active', 'paused', 'filled', 'deleted'];

/** Scraped-only statuses — never writable via this endpoint */
const SCRAPED_STATUSES = new Set(['Taken', 'TAKEN', 'expired', 'Expired', 'EXPIRED']);

/** Returns true when the transition is legal */
function isLegalTransition(from: string, to: AllowedStatus): boolean {
  if (from === 'deleted') return false;               // final state
  if (from === 'filled') return to === 'deleted';     // can only delete a filled listing
  // active / paused can go anywhere
  return true;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    // 1. Auth
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let uid: string;
    try {
      const decoded = await adminAuth.verifyIdToken(token);
      uid = decoded.uid;
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // 2. Validate body
    const body = await req.json();
    const newStatus: AllowedStatus = body?.status;
    if (!ALLOWED.includes(newStatus)) {
      return NextResponse.json({ error: `Invalid status. Must be one of: ${ALLOWED.join(', ')}` }, { status: 400 });
    }

    // 3. Load listing
    const docRef = adminDb.collection('listings').doc(id);
    const snap = await docRef.get();
    if (!snap.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const data = snap.data()!;

    // 4. Ownership check
    if (data.ownerId !== uid) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const currentStatus: string = data.status ?? 'active';

    // 5. Scraped listing guard
    if (SCRAPED_STATUSES.has(currentStatus)) {
      return NextResponse.json({ error: 'Scraped listings cannot be managed via this endpoint' }, { status: 400 });
    }

    // 6. Deleted is final
    if (currentStatus === 'deleted') {
      return NextResponse.json({ error: 'Listing is already deleted' }, { status: 409 });
    }

    // 7. Transition guard
    if (!isLegalTransition(currentStatus, newStatus)) {
      return NextResponse.json({ error: `Cannot transition from '${currentStatus}' to '${newStatus}'` }, { status: 400 });
    }

    // 8. Build the update payload
    const now = Date.now();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const update: Record<string, any> = { status: newStatus, updatedAt: now };

    if (newStatus === 'paused')  { update.paused_at  = now; }
    if (newStatus === 'active')  { update.paused_at  = admin.firestore.FieldValue.delete(); }
    if (newStatus === 'filled')  { update.filled_at  = now; }
    if (newStatus === 'deleted') { update.deleted_at = now; }

    await docRef.update(update);

    // TODO: When the messages system is built, notify conversations tied to this
    // listing when status becomes 'filled' or 'deleted'. The conversation view
    // should render a "no longer available" placeholder for these listings.

    return NextResponse.json({ id, status: newStatus }, { status: 200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[PATCH /api/listings/[id]/status] error:', err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
