
'use server';

import { db } from '../lib/firebase';
import { doc, setDoc, serverTimestamp, GeoPoint, Timestamp } from 'firebase/firestore';

interface FirestoreListingInput {
  id: string;
  title: string;
  description: string;
  price: number;
  currency?: string;
  startDate: string;
  endDate: string;
  lat: number;
  lng: number;
  originalUrl?: string;
  ownerId?: string;
  authorName?: string;
  images?: string[];
  type: string;
}

/**
 * Saves or updates a listing in Firestore using Server Actions.
 * This runs strictly on the server side.
 */
export async function saveToFirestore(listing: FirestoreListingInput) {
  if (!db) {
    throw new Error("Firestore is not initialized. Check your API keys.");
  }

  try {
    const docId = listing.id || Math.random().toString(36).substr(2, 9);
    const docRef = doc(db, 'listings', docId);

    const payload = {
      ...listing,
      price: Number(listing.price),
      dates: {
        start: Timestamp.fromDate(new Date(listing.startDate)),
        end: listing.endDate ? Timestamp.fromDate(new Date(listing.endDate)) : null,
      },
      location: new GeoPoint(listing.lat, listing.lng),
      status: 'active',
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    };

    await setDoc(docRef, payload, { merge: true });

    return { success: true, id: docId };
  } catch (error) {
    console.error("Error saving to Firestore:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error occurred" 
    };
  }
}
