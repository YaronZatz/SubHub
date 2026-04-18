
import { collection, getDocs, getDoc, doc, updateDoc, addDoc, query, where, orderBy, limit, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { listingDocumentToSublet } from '../lib/listingMap';
import type { Sublet } from '../types';

const COLLECTION = 'listings';

/** Result of fetching a single listing — distinguishes missing doc from errors / offline client. */
export type FetchListingByIdResult =
  | { ok: true; listing: Sublet }
  | { ok: false; reason: 'missing' | 'no_db' | 'error'; error?: unknown };

function buildQuery() {
  return query(
    collection(db!, COLLECTION),
    where('status', '==', 'active'),
    orderBy('postedAt', 'desc'),
    limit(200)
  );
}

/**
 * Returns true when a listing has enough location data to appear on the map or sidebar.
 *
 * For listings processed by the new pipeline: use pin_status as the authoritative source.
 *   exact / street / approximate → show
 *   rejected                     → hide
 *
 * For legacy listings (no pin_status): fall back to non-zero coordinates.
 */
function hasValidCoords(s: Sublet): boolean {
  if (s.pin_status !== undefined) {
    return s.pin_status === 'exact' || s.pin_status === 'street' || s.pin_status === 'approximate';
  }
  // Legacy path — old listings without pin_status
  return s.lat !== 0 || s.lng !== 0;
}

/**
 * Remove duplicate listings that represent the same Facebook post.
 * Uses sourceUrl as the primary dedup key, contentHash as secondary.
 * The input list is assumed to be sorted newest-first (createdAt desc),
 * so the first occurrence in each duplicate group is kept.
 */
function deduplicateListings(listings: Sublet[]): Sublet[] {
  const seenUrls = new Set<string>();
  const seenHashes = new Set<string>();
  return listings.filter((listing) => {
    const url = listing.sourceUrl?.trim();
    if (url) {
      if (seenUrls.has(url)) return false;
      seenUrls.add(url);
    }
    const hash = listing.contentHash;
    if (hash) {
      if (seenHashes.has(hash)) return false;
      seenHashes.add(hash);
    }
    return true;
  });
}

export const persistenceService = {
  /**
   * One-time fetch from Firestore listings collection.
   * Falls back to INITIAL_SUBLETS if Firestore is unavailable or empty.
   */
  async fetchListings(): Promise<Sublet[]> {
    if (!db) {
      console.warn('⚠️ Firestore db undefined — returning empty list');
      return [];
    }
    try {
      console.log(`🔥 Fetching from Firestore collection: "${COLLECTION}"…`);
      const snapshot = await getDocs(buildQuery());
      console.log(`🔥 Firestore returned ${snapshot.docs.length} documents`);
      const docs = snapshot.docs.map((d) =>
        listingDocumentToSublet(d.id, d.data() as Record<string, unknown>)
      );
      const deduped = deduplicateListings(docs);
      const withCoords = deduped.filter(hasValidCoords);
      console.log(`🔥 After dedup: ${deduped.length} unique, ${withCoords.length} with coords`);
      return deduped;
    } catch (e) {
      console.error('❌ Failed to fetch listings from Firestore:', e);
      return [];
    }
  },

  /**
   * Fetch a small set of active listings for a specific city — used by the homepage carousels.
   * No orderBy to avoid needing a composite index; sorted client-side by createdAt.
   */
  async fetchListingsByCity(city: string, count = 20): Promise<Sublet[]> {
    if (!db) return [];
    try {
      const q = query(
        collection(db!, COLLECTION),
        where('status', '==', 'active'),
        where('city', '==', city),
        limit(count)
      );
      const snapshot = await getDocs(q);
      const docs = snapshot.docs.map((d) =>
        listingDocumentToSublet(d.id, d.data() as Record<string, unknown>)
      );
      return docs.sort((a, b) => b.createdAt - a.createdAt);
    } catch (e) {
      console.error(`❌ fetchListingsByCity(${city}) failed:`, e);
      return [];
    }
  },

  /**
   * Real-time listener — calls callback whenever listings change in Firestore.
   * Returns an unsubscribe function.
   */
  onListingsChanged(callback: (listings: Sublet[]) => void): () => void {
    if (!db) {
      console.warn('⚠️ Firestore db undefined — returning empty list');
      callback([]);
      return () => {};
    }
    return onSnapshot(
      buildQuery(),
      (snapshot) => {
        const docs = snapshot.docs.map((d) =>
          listingDocumentToSublet(d.id, d.data() as Record<string, unknown>)
        );
        const deduped = deduplicateListings(docs);
        const withCoords = deduped.filter(hasValidCoords);
        console.log(`🔥 Firestore snapshot: ${snapshot.docs.length} docs → ${deduped.length} unique, ${withCoords.length} with coords`);
        callback(deduped);
      },
      (error) => {
        console.error('❌ Firestore listener error:', error);
        callback([]);
      }
    );
  },

  /**
   * Save a listing to Firestore.
   * If the listing already has an id, updates it; otherwise creates a new document.
   * Used by AddListingModal.
   */
  async saveListing(listing: Sublet): Promise<Sublet> {
    if (!db) {
      console.warn('⚠️ Firestore unavailable — listing not persisted');
      return listing;
    }
    try {
      const { id, ...data } = listing;
      if (id && id !== 'new') {
        await updateDoc(doc(db, COLLECTION, id), data as Record<string, unknown>);
        return listing;
      } else {
        const docRef = await addDoc(collection(db, COLLECTION), {
          ...data,
          createdAt: serverTimestamp(),
        });
        return { ...listing, id: docRef.id };
      }
    } catch (e) {
      console.error('❌ Failed to save listing:', e);
      return listing;
    }
  },

  /**
   * Update an existing listing in Firestore.
   */
  async updateListing(listing: Sublet): Promise<void> {
    if (!db) return;
    try {
      const { id, ...data } = listing;
      await updateDoc(doc(db, COLLECTION, id), data as Record<string, unknown>);
    } catch (e) {
      console.error('❌ Failed to update listing:', e);
    }
  },

  /**
   * Fetch a single listing by Firestore document ID.
   * Use `ok` / `reason` so callers can tell missing documents from network or SDK errors.
   */
  async fetchListingById(id: string): Promise<FetchListingByIdResult> {
    if (!id) return { ok: false, reason: 'missing' };
    if (!db) {
      console.warn('⚠️ fetchListingById: Firestore db undefined');
      return { ok: false, reason: 'no_db' };
    }
    try {
      const docSnap = await getDoc(doc(db, COLLECTION, id));
      if (!docSnap.exists()) return { ok: false, reason: 'missing' };
      return {
        ok: true,
        listing: listingDocumentToSublet(docSnap.id, docSnap.data() as Record<string, unknown>),
      };
    } catch (e) {
      console.error('❌ Failed to fetch listing by ID:', id, e);
      return { ok: false, reason: 'error', error: e };
    }
  },

  /**
   * Fetch all listings owned by a specific user.
   * Sorts client-side to avoid needing a composite index.
   */
  async fetchListingsByOwner(ownerId: string): Promise<Sublet[]> {
    if (!db || !ownerId) return [];
    try {
      const q = query(collection(db!, COLLECTION), where('ownerId', '==', ownerId), limit(50));
      const snap = await getDocs(q);
      const docs = snap.docs.map(d => listingDocumentToSublet(d.id, d.data() as Record<string, unknown>));
      return docs.sort((a, b) => b.createdAt - a.createdAt);
    } catch (e) {
      console.error('❌ fetchListingsByOwner failed:', e);
      return [];
    }
  },

  /**
   * Add a new listing document to Firestore and return it with the generated id.
   */
  async addListing(listing: Sublet): Promise<Sublet> {
    if (!db) return listing;
    const { id, ...data } = listing;
    const docRef = await addDoc(collection(db, COLLECTION), {
      ...data,
      createdAt: Date.now(),
    });
    return { ...listing, id: docRef.id };
  },
};
