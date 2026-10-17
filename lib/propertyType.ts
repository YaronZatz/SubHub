import type { Sublet } from '@/types';

/**
 * Canonical property types used by the city page and /map?type=….
 *
 * Stored listings disagree with each other: the pipeline writes `type` as
 * "Entire Place" | "Room in Shared" | "Studio", the app enum says "Roommate",
 * and a missing type used to be defaulted to "Entire Place". The extractor
 * and backfill now write `property_type` explicitly; when it's absent we fall
 * back to the legacy `type` field.
 */
export const PROPERTY_TYPES = ['entire', 'studio', 'private_room', 'shared_room'] as const;
export type PropertyType = (typeof PROPERTY_TYPES)[number];

export function isPropertyType(v: unknown): v is PropertyType {
  return typeof v === 'string' && (PROPERTY_TYPES as readonly string[]).includes(v);
}

/** Map a legacy `type` value (or anything unexpected) to the canonical set. */
export function legacyPropertyType(raw: unknown): PropertyType | 'unknown' {
  const v = String(raw ?? '').trim().toLowerCase();
  if (v === 'entire place' || v === 'entire') return 'entire';
  if (v === 'studio') return 'studio';
  if (v === 'room in shared' || v === 'roommate' || v === 'private room' || v === 'private_room') return 'private_room';
  if (v === 'shared room' || v === 'shared_room') return 'shared_room';
  return 'unknown';
}

export function propertyTypeOf(s: Pick<Sublet, 'type' | 'property_type'>): PropertyType | 'unknown' {
  if (s.property_type) return isPropertyType(s.property_type) ? s.property_type : 'unknown';
  return legacyPropertyType(s.type);
}
