/**
 * Pure mapping from Firestore listing document data → Sublet.
 * Shared by client persistenceService and server admin reads (no Firebase client SDK).
 */

import { Sublet, ListingStatus, ParsedAmenities, ParsedRooms, ParsedDates, RentTerm } from '@/types';

function computeRentTerm(startDate: string, endDate: string, immediateAvail: boolean): RentTerm | undefined {
  if (endDate && startDate) {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    if (!isNaN(start) && !isNaN(end) && end > start) {
      const days = (end - start) / (1000 * 60 * 60 * 24);
      return days < 90 ? RentTerm.SHORT_TERM : RentTerm.LONG_TERM;
    }
  }
  if (endDate && !startDate && !immediateAvail) return RentTerm.SHORT_TERM;
  if (immediateAvail && !endDate) return RentTerm.LONG_TERM;
  return undefined;
}

export function listingDocumentToSublet(docId: string, data: Record<string, unknown>): Sublet {
  const createdAt =
    typeof data.createdAt === 'number'
      ? data.createdAt
      : (data.createdAt as { toMillis?: () => number })?.toMillis?.() ?? Date.now();

  const status =
    data.status === 'active' || data.status === 'Available' || data.status === 'AVAILABLE'
      ? ListingStatus.AVAILABLE
      : data.status === 'Taken' || data.status === 'TAKEN'
        ? ListingStatus.TAKEN
        : data.status === 'expired' || data.status === 'Expired' || data.status === 'EXPIRED'
          ? ListingStatus.EXPIRED
          : data.status === 'paused'
            ? ListingStatus.PAUSED
            : data.status === 'filled'
              ? ListingStatus.FILLED
              : data.status === 'deleted'
                ? ListingStatus.DELETED
                : ListingStatus.AVAILABLE;

  const lat = data.lat != null ? Number(data.lat) : 0;
  const lng = data.lng != null ? Number(data.lng) : 0;

  const rawAmenities = data.amenities as Record<string, unknown> | string[] | null | undefined;
  const parsedAmenities: ParsedAmenities | undefined =
    rawAmenities && !Array.isArray(rawAmenities)
      ? (rawAmenities as ParsedAmenities)
      : (data.parsedAmenities as ParsedAmenities | undefined);

  const rawRooms = (data.rooms ?? data.parsedRooms) as ParsedRooms | null | undefined;

  const isFlexible =
    (data.datesFlexible as boolean | undefined) ??
    (data.is_flexible as boolean | undefined) ??
    false;

  const immediateAvailability =
    (data.immediateAvailability as boolean | undefined) ??
    (data.parsedDates as ParsedDates | undefined)?.immediateAvailability ??
    false;

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
    summaryTranslations: data.summaryTranslations as Record<string, string> | undefined,
    locationTranslations: data.locationTranslations as Record<string, string> | undefined,
    neighborhoodTranslations: data.neighborhoodTranslations as Record<string, string> | undefined,
    postedAt: data.postedAt as string | null | undefined,
    paused_at: data.paused_at as number | undefined,
    filled_at: data.filled_at as number | undefined,
    deleted_at: data.deleted_at as number | undefined,
  };
}
