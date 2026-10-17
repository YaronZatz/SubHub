import type { Sublet } from '@/types';

// "Currently available" rules shared by the client listing fetch, the city
// browse API and /map filters, so counts and results always agree.

export const MAX_AGE_DAYS = 60;

/**
 * Returns true when a listing has enough location data to appear on the map or sidebar.
 *
 * For listings processed by the new pipeline: use pin_status as the authoritative source.
 *   exact / street / approximate → show
 *   rejected                     → hide
 *
 * For legacy listings (no pin_status): fall back to non-zero coordinates.
 */
export function hasValidCoords(s: Sublet): boolean {
  if (s.pin_status !== undefined) {
    return s.pin_status === 'exact' || s.pin_status === 'street' || s.pin_status === 'approximate';
  }
  // Legacy path — old listings without pin_status
  return s.lat !== 0 || s.lng !== 0;
}

/**
 * Returns true when a listing is still relevant based on dates.
 * - endDate in the past → irrelevant (sublet period is over)
 * - No endDate but startDate in the past → irrelevant (likely already taken)
 * - No dates at all → fall back to postedAt/createdAt age (max 60 days)
 */
export function isRelevant(s: Sublet): boolean {
  const now = Date.now();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // If endDate exists and is a real date string, check if it's in the past
  if (s.endDate && s.endDate !== 'null' && s.endDate !== 'undefined') {
    const end = new Date(s.endDate);
    if (!isNaN(end.getTime()) && end < today) return false;
  }

  // If startDate exists but no endDate, check if start is more than 30 days in the past
  if (s.startDate && s.startDate !== 'null' && (!s.endDate || s.endDate === 'null' || s.endDate === 'undefined')) {
    const start = new Date(s.startDate);
    if (!isNaN(start.getTime()) && (now - start.getTime()) > 30 * 24 * 60 * 60 * 1000) return false;
  }

  // No useful dates — fall back to listing age
  const age = now - s.createdAt;
  if (age > MAX_AGE_DAYS * 24 * 60 * 60 * 1000) return false;

  return true;
}

/**
 * Remove duplicate listings that represent the same Facebook post.
 * Uses sourceUrl as the primary dedup key, contentHash as secondary.
 * The input list is assumed to be sorted newest-first (createdAt desc),
 * so the first occurrence in each duplicate group is kept.
 */
export function deduplicateListings(listings: Sublet[]): Sublet[] {
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

/** The listings view hides these by default (no price, or a price above the slider's max). */
export const DEFAULT_PRICE_MAX = 30000;

/** True when the listings view shows this listing with its default filters. */
export function isShownByDefault(s: Sublet): boolean {
  return s.price > 0 && s.price <= DEFAULT_PRICE_MAX;
}
