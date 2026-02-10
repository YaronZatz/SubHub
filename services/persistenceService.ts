
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Sublet, ListingStatus } from '../types';
import { INITIAL_SUBLETS } from '../constants';

/** Map Firestore sublet doc to Sublet; ensure id and createdAt are set. */
function firestoreDocToSublet(docId: string, data: Record<string, unknown>): Sublet {
  const createdAt = typeof data.createdAt === 'number'
    ? data.createdAt
    : (data.createdAt as { toMillis?: () => number })?.toMillis?.() ?? Date.now();
  const status = data.status === 'active' || data.status === 'AVAILABLE'
    ? ListingStatus.AVAILABLE
    : data.status === 'Taken' || data.status === 'TAKEN'
      ? ListingStatus.TAKEN
      : ListingStatus.AVAILABLE;
  return {
    id: docId,
    sourceUrl: (data.sourceUrl as string) || '',
    originalText: (data.originalText as string) || '',
    price: Number(data.price) ?? 0,
    currency: (data.currency as string) || 'ILS',
    startDate: (data.startDate as string) || '',
    endDate: (data.endDate as string) || '',
    location: (data.location as string) || '',
    lat: Number(data.lat) ?? 0,
    lng: Number(data.lng) ?? 0,
    type: (data.type as Sublet['type']) || ('Entire Place' as Sublet['type']),
    status,
    createdAt,
    authorName: (data.authorName ?? data.posterName) as string | undefined,
    neighborhood: data.neighborhood as string | undefined,
    city: data.city as string | undefined,
    images: data.images as string[] | undefined,
    ai_summary: data.ai_summary as string | undefined,
    apartment_details: data.apartment_details as Sublet['apartment_details'],
    needs_review: data.needs_review as boolean | undefined,
    is_flexible: data.is_flexible as boolean | undefined,
  };
}

async function fetchFirestoreSublets(): Promise<Sublet[]> {
  if (!db) return [];
  try {
    const snapshot = await getDocs(collection(db, 'sublets'));
    return snapshot.docs.map((d) => firestoreDocToSublet(d.id, d.data() as Record<string, unknown>));
  } catch (e) {
    console.error('Failed to fetch sublets from Firestore', e);
    return [];
  }
}

const DB_NAME = 'SubHubDB';
const DB_VERSION = 1;
const STORE_NAME = 'listings';

// Helper to open DB
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
        reject("IndexedDB not supported");
        return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

export const persistenceService = {
  /**
   * Fetches all listings from IndexedDB and Firestore sublets.
   * Merges: IDB + seed, then Firestore by id (Firestore wins when same id). Sorts by createdAt desc.
   */
  async fetchListings(): Promise<Sublet[]> {
    try {
      const idb = await openDB();
      const fromIdb = await new Promise<Sublet[]>((resolve, reject) => {
        const transaction = idb.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();
        request.onsuccess = () => resolve((request.result as Sublet[]) || []);
        request.onerror = () => reject(request.error);
      });

      const combined = [...fromIdb];
      INITIAL_SUBLETS.forEach((seed) => {
        if (!combined.find((c) => c.id === seed.id)) combined.push(seed);
      });

      const fromFirestore = await fetchFirestoreSublets();
      const byId = new Map(combined.map((s) => [s.id, s]));
      fromFirestore.forEach((s) => byId.set(s.id, s));
      const merged = Array.from(byId.values());
      return merged.sort((a, b) => b.createdAt - a.createdAt);
    } catch (e) {
      console.error('Failed to fetch listings', e);
      return INITIAL_SUBLETS;
    }
  },

  /**
   * Saves or updates a listing in IndexedDB.
   */
  async saveListing(listing: Sublet): Promise<Sublet> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(listing); // .put() handles both insert and update

      request.onsuccess = () => resolve(listing);
      request.onerror = () => reject(request.error);
    });
  },

  async updateListing(updated: Sublet): Promise<void> {
    await this.saveListing(updated);
  }
};
