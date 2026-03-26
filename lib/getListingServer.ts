import { adminDb } from '@/lib/firebase-admin';
import { listingDocumentToSublet } from '@/lib/listingMap';
import type { Sublet } from '@/types';

export type ServerListingFetchResult =
  | { ok: true; listing: Sublet }
  | { ok: false; reason: 'missing' | 'error'; error?: unknown };

const COLLECTION = 'listings';

/**
 * Load a single listing by Firestore document id (server / Admin SDK).
 * Used by the listing detail route so the document is available without relying on the browser SDK alone.
 */
export async function getListingByIdForServer(id: string): Promise<ServerListingFetchResult> {
  if (!id) return { ok: false, reason: 'missing' };
  try {
    const snap = await adminDb.collection(COLLECTION).doc(id).get();
    if (!snap.exists) return { ok: false, reason: 'missing' };
    const data = snap.data();
    if (!data) return { ok: false, reason: 'missing' };
    return { ok: true, listing: listingDocumentToSublet(snap.id, data as Record<string, unknown>) };
  } catch (error) {
    return { ok: false, reason: 'error', error };
  }
}
