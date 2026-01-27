
import { Sublet } from '../types';
import { INITIAL_SUBLETS } from '../constants';

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
   * Fetches all listings from IndexedDB.
   * Merges initial seed data with user-persisted data.
   */
  async fetchListings(): Promise<Sublet[]> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
            const dbListings = request.result as Sublet[];
            
            // Combine DB listings with seed data (INITIAL_SUBLETS)
            // ensuring we don't duplicate IDs if seed data is edited/saved to DB
            const combined = [...dbListings];
            
            INITIAL_SUBLETS.forEach(seed => {
                if (!combined.find(c => c.id === seed.id)) {
                    combined.push(seed);
                }
            });

            // Sort by newest first
            resolve(combined.sort((a, b) => b.createdAt - a.createdAt));
        };
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.error("Failed to fetch from IndexedDB", e);
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
