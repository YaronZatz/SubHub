import { Sublet } from '@/types';
import { cityFor, hasHebrew, isIsraeliCity, neighborhoodFor } from '@/lib/placeNames';

export function localizedLocation(sublet: Sublet, lang: string): string {
  return sublet.locationTranslations?.[lang] ?? sublet.location;
}

/** Neighborhood in the UI language; undefined when only a different-script name is available. */
export function localizedNeighborhood(sublet: Sublet, lang: string): string | undefined {
  const nb = neighborhoodFor(sublet.neighborhood, lang, sublet.neighborhoodTranslations);
  // In Hebrew, an Israeli neighborhood we can only show in English would mix scripts — drop it.
  if (lang === 'he' && nb && !hasHebrew(nb) && isIsraeliCity(sublet.city)) return undefined;
  return nb;
}

export function localizedCity(sublet: Sublet, lang: string): string | undefined {
  return cityFor(sublet.city, lang);
}

/**
 * "Neighborhood, City" in one language — never "לב העיר, Tel Aviv".
 * Falls back to the city alone, then to the raw location if it matches the UI script.
 */
export function listingTitle(sublet: Sublet, lang: string, fallback = 'Listing'): string {
  const nb = localizedNeighborhood(sublet, lang);
  const city = localizedCity(sublet, lang);
  const parts = [nb, city].filter((p, i, arr): p is string => !!p && arr.indexOf(p) === i);
  if (parts.length > 0) return parts.join(', ');
  const loc = localizedLocation(sublet, lang)?.trim();
  if (loc && (lang === 'he') === hasHebrew(loc)) return loc;
  return loc || fallback;
}
