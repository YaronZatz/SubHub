import {
  collection, doc, setDoc, deleteDoc,
  onSnapshot, query, where, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

const COLLECTION = 'saved_listings';

/** Deterministic document ID so we can toggle with a single write. */
function savedDocId(userId: string, listingId: string): string {
  return `${userId}_${listingId}`;
}

export const savedService = {
  /**
   * Toggle a listing saved state for a user.
   * Pass `currentlySaved = true` to remove, `false` to add.
   */
  async toggleSaved(userId: string, listingId: string, currentlySaved: boolean): Promise<void> {
    if (!db) return;
    const ref = doc(db, COLLECTION, savedDocId(userId, listingId));
    if (currentlySaved) {
      await deleteDoc(ref);
    } else {
      await setDoc(ref, { userId, listingId, savedAt: serverTimestamp() });
    }
  },

  /**
   * Real-time listener — calls callback with the current set of saved listing IDs.
   * Returns an unsubscribe function.
   */
  onSavedChanged(userId: string, callback: (savedIds: Set<string>) => void): () => void {
    if (!db) {
      callback(new Set());
      return () => {};
    }
    const q = query(collection(db, COLLECTION), where('userId', '==', userId));
    return onSnapshot(
      q,
      (snapshot) => {
        const ids = new Set(snapshot.docs.map((d) => d.data().listingId as string));
        callback(ids);
      },
      () => callback(new Set()),
    );
  },
};
