import type { Sublet, ParsedAmenities } from '@/types';
import { cityFor, neighborhoodFor } from '@/lib/placeNames';

// Free-text matching for the search box. A query matches when the whole
// phrase appears, or when every meaningful word does ("Florentin with a
// balcony" → "florentin" AND "balcony"). Amenities parsed from the post are
// searchable by English name and common Hebrew words, so "balcony" also finds
// Hebrew posts that mention מרפסת.

const STOPWORDS = new Set([
  'a', 'an', 'the', 'with', 'in', 'near', 'and', 'or', 'for', 'of', 'to', 'at', 'on', 'by',
  'עם', 'ליד', 'של', 'ב', 'ו', 'או', 'גם',
]);

const AMENITY_TERMS: Partial<Record<keyof ParsedAmenities, string>> = {
  furnished: 'furnished מרוהט מרוהטת',
  wifi: 'wifi internet אינטרנט',
  ac: 'ac a/c air conditioning מזגן',
  heating: 'heating חימום',
  washer: 'washer washing machine מכונת כביסה',
  dryer: 'dryer מייבש',
  dishwasher: 'dishwasher מדיח',
  parking: 'parking חניה',
  balcony: 'balcony מרפסת',
  rooftop: 'rooftop roof גג',
  elevator: 'elevator lift מעלית',
  petFriendly: 'pets pet friendly pets ok dog cat חיות מחמד כלב חתול',
  smokingAllowed: 'smoking עישון',
  workspace: 'workspace desk office עבודה',
};

function haystack(s: Sublet): string {
  const amenities = s.parsedAmenities
    ? (Object.keys(s.parsedAmenities) as (keyof ParsedAmenities)[])
        .filter(k => s.parsedAmenities?.[k] === true)
        .map(k => AMENITY_TERMS[k] ?? String(k))
    : [];
  // City and neighborhood in both UI languages, so a Hebrew suggestion ("תל אביב") finds
  // listings stored in English and vice versa.
  const places = (['en', 'he'] as const).flatMap(l => [cityFor(s.city, l), neighborhoodFor(s.neighborhood, l, s.neighborhoodTranslations)]);
  return [s.location, s.originalText, s.city, s.neighborhood, s.street, s.fullAddress, ...places, ...amenities]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function matchesFreeText(s: Sublet, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const text = haystack(s);
  if (text.includes(q)) return true;
  const terms = q.split(/[\s,]+/).filter(w => w.length > 1 && !STOPWORDS.has(w));
  return terms.length > 0 && terms.every(w => text.includes(w));
}
