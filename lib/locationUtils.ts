import { Sublet } from '@/types';
import { cityFor, inLanguage, neighborhoodFor } from '@/lib/placeNames';

export function localizedLocation(sublet: Sublet, lang: string): string {
  return sublet.locationTranslations?.[lang] ?? sublet.location;
}

/** The raw location (street/address) only when it is already in the UI language. */
export function locationInLanguage(sublet: Sublet, lang: string): string | undefined {
  const loc = localizedLocation(sublet, lang)?.trim();
  return loc && inLanguage(loc, lang) ? loc : undefined;
}

/** Neighborhood in the UI language; undefined when only a different-script name is available. */
export function localizedNeighborhood(sublet: Sublet, lang: string): string | undefined {
  const nb = neighborhoodFor(sublet.neighborhood, lang, sublet.neighborhoodTranslations);
  // A name we can only show in the other language would mix scripts — drop it.
  return inLanguage(nb, lang) ? nb : undefined;
}

export function localizedCity(sublet: Sublet, lang: string): string | undefined {
  return cityFor(sublet.city, lang);
}

/**
 * "Neighborhood, City" in one language — never "לב העיר, Tel Aviv".
 * Falls back to the city alone, then to the raw location if it is in the UI language,
 * then to `fallback` — never to text in the other language.
 */
export function listingTitle(sublet: Sublet, lang: string, fallback = lang === 'he' ? 'מודעה' : 'Listing'): string {
  const nb = localizedNeighborhood(sublet, lang);
  const city = localizedCity(sublet, lang);
  const parts = [nb, city].filter((p, i, arr): p is string => !!p && arr.indexOf(p) === i);
  if (parts.length > 0) return parts.join(', ');
  const loc = localizedLocation(sublet, lang)?.trim();
  return loc && inLanguage(loc, lang) ? loc : fallback;
}
