
import { collection, getDocs, doc, updateDoc, addDoc, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Sublet, ListingStatus, ParsedAmenities, ParsedRooms, ParsedDates, RentTerm } from '../types';
import { INITIAL_SUBLETS } from '../constants';

const COLLECTION = 'listings';

/**
 * Infer rent term from listing dates.
 * < 90 days between start and end → short-term sublet.
 * >= 90 days (or no end date) → long-term rent.
 * If neither date is known, return undefined (shown under all terms).
 */
function computeRentTerm(startDate: string, endDate: string, immediateAvail: boolean): RentTerm | undefined {
  if (endDate && startDate) {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    if (!isNaN(start) && !isNaN(end) && end > start) {
      const days = (end - start) / (1000 * 60 * 60 * 24);
      return days < 90 ? RentTerm.SHORT_TERM : RentTerm.LONG_TERM;
    }
  }
  // Has end date but no start (or vice versa) — treat as short if end date exists without start
  if (endDate && !startDate && !immediateAvail) return RentTerm.SHORT_TERM;
  // Immediate availability with no end date → likely long-term
  if (immediateAvail && !endDate) return RentTerm.LONG_TERM;
  return undefined;
}

/** Map a Firestore document from the listings collection to a Sublet. */
function firestoreDocToSublet(docId: string, data: Record<string, unknown>): Sublet {
  const createdAt =
    typeof data.createdAt === 'number'
      ? data.createdAt
      : (data.createdAt as { toMillis?: () => number })?.toMillis?.() ?? Date.now();

  const status =
    data.status === 'active' ||
    data.status === 'Available' ||
    data.status === 'AVAILABLE'
      ? ListingStatus.AVAILABLE
      : data.status === 'Taken' || data.status === 'TAKEN'
      ? ListingStatus.TAKEN
      : ListingStatus.AVAILABLE;

  // Coordinates: treat null / missing as 0 (filtered out upstream)
  const lat = data.lat != null ? Number(data.lat) : 0;
  const lng = data.lng != null ? Number(data.lng) : 0;

  // Amenities: Cloud Function writes an object; legacy data may have string[]; parsedAmenities is our own format
  const rawAmenities = data.amenities as Record<string, unknown> | string[] | null | undefined;
  const parsedAmenities: ParsedAmenities | undefined =
    rawAmenities && !Array.isArray(rawAmenities)
      ? (rawAmenities as ParsedAmenities)
      : (data.parsedAmenities as ParsedAmenities | undefined);

  // Rooms: Cloud Function writes data.rooms; our webhook writes data.parsedRooms
  const rawRooms = (data.rooms ?? data.parsedRooms) as ParsedRooms | null | undefined;

  // Flexibility / immediate availability — handle both field name conventions
  const isFlexible =
    (data.datesFlexible as boolean | undefined) ??
    (data.is_flexible as boolean | undefined) ??
    false;

  const immediateAvailability =
    (data.immediateAvailability as boolean | undefined) ??
    (data.parsedDates as ParsedDates | undefined)?.immediateAvailability ??
    false;

  // Build a unified parsedDates, merging stored parsedDates with top-level fields
  const storedParsedDates = data.parsedDates as ParsedDates | undefined;
  const parsedDates: ParsedDates = {
    startDate: (data.startDate as string) || null,
    endDate: (data.endDate as string) || null,
    isFlexible,
    immediateAvailability,
    ...storedParsedDates,
  };

  return {
    id: docId,
    sourceUrl: (data.sourceUrl as string) || '',
    originalText: (data.originalText as string) || '',
    price: Number(data.price) || 0,
    currency: (data.currency as string) || 'ILS',
    startDate: (data.startDate as string) || '',
    endDate: (data.endDate as string) || '',
    location: (data.location as string) || '',
    lat,
    lng,
    type: (data.type as Sublet['type']) || ('Entire Place' as Sublet['type']),
    status,
    createdAt,
    authorName: (data.authorName ?? data.posterName) as string | undefined,
    neighborhood: data.neighborhood as string | undefined,
    city: data.city as string | undefined,
    amenities: rawAmenities as Sublet['amenities'],
    ownerId: data.ownerId as string | undefined,
    images: data.images as string[] | undefined,
    photoCount: data.photoCount as number | undefined,
    ai_summary: data.ai_summary as string | undefined,
    apartment_details: data.apartment_details as Sublet['apartment_details'] | undefined,
    needs_review: data.needs_review as boolean | undefined,
    is_flexible: isFlexible,
    parsedAmenities,
    parsedRooms: rawRooms ?? undefined,
    parsedDates,
    rooms: rawRooms ?? undefined,
    country: data.country as string | undefined,
    countryCode: data.countryCode as string | undefined,
    street: data.street as string | undefined,
    fullAddress: (data.fullAddress ?? data.displayAddress) as string | undefined,
    locationConfidence: data.locationConfidence as string | undefined,
    contentHash: data.contentHash as string | undefined,
    partialData: data.partialData as boolean | undefined,
    lastParsedAt: data.lastParsedAt as number | undefined,
    parserVersion: data.parserVersion as string | undefined,
    sourceGroupName: data.sourceGroupName as string | undefined,
    datesFlexible: isFlexible,
    immediateAvailability,
    rentTerm: computeRentTerm(
      (data.startDate as string) || '',
      (data.endDate as string) || '',
      immediateAvailability
    ),
  };
}

function buildQuery() {
  return query(collection(db!, COLLECTION), orderBy('createdAt', 'desc'), limit(500));
}

/** Filter out listings with no geocoded location — they can't be shown on the map. */
function hasValidCoords(s: Sublet): boolean {
  return s.lat !== 0 || s.lng !== 0;
}

export const persistenceService = {
  /**
   * One-time fetch from Firestore listings collection.
   * Falls back to INITIAL_SUBLETS if Firestore is unavailable or empty.
   */
  async fetchListings(): Promise<Sublet[]> {
    if (!db) {
      console.warn('⚠️ Firestore db undefined — returning sample data');
      return INITIAL_SUBLETS;
    }
    try {
      console.log(`🔥 Fetching from Firestore collection: "${COLLECTION}"…`);
      const snapshot = await getDocs(buildQuery());
      console.log(`🔥 Firestore returned ${snapshot.docs.length} documents`);
      const docs = snapshot.docs.map((d) =>
        firestoreDocToSublet(d.id, d.data() as Record<string, unknown>)
      );
      const valid = docs.filter(hasValidCoords);
      return valid.length > 0 ? valid : INITIAL_SUBLETS;
    } catch (e) {
      console.error('❌ Failed to fetch listings from Firestore:', e);
      return INITIAL_SUBLETS;
    }
  },

  /**
   * Real-time listener — calls callback whenever listings change in Firestore.
   * Returns an unsubscribe function.
   */
  onListingsChanged(callback: (listings: Sublet[]) => void): () => void {
    if (!db) {
      console.warn('⚠️ Firestore db undefined — streaming sample data');
      callback(INITIAL_SUBLETS);
      return () => {};
    }
    return onSnapshot(
      buildQuery(),
      (snapshot) => {
        const docs = snapshot.docs.map((d) =>
          firestoreDocToSublet(d.id, d.data() as Record<string, unknown>)
        );
        const valid = docs.filter(hasValidCoords);
        console.log(`🔥 Firestore snapshot: ${snapshot.docs.length} docs, ${valid.length} with coords`);
        callback(valid.length > 0 ? valid : INITIAL_SUBLETS);
      },
      (error) => {
        console.error('❌ Firestore listener error:', error);
        callback(INITIAL_SUBLETS);
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
          createdAt: Date.now(),
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
