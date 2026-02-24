
import { ParsedAmenities, Sublet } from '../types';

export interface AmenityDef {
  key: keyof ParsedAmenities;
  icon: string;
  labelEn: string;
}

export const AMENITY_DEFS: AmenityDef[] = [
  { key: 'furnished',         icon: '🛋️',  labelEn: 'Furnished' },
  { key: 'wifi',              icon: '📶',  labelEn: 'Wi-Fi' },
  { key: 'ac',                icon: '❄️',  labelEn: 'Air conditioning' },
  { key: 'heating',           icon: '🔥',  labelEn: 'Heating' },
  { key: 'washer',            icon: '🧺',  labelEn: 'Washer' },
  { key: 'dryer',             icon: '♨️',  labelEn: 'Dryer' },
  { key: 'dishwasher',        icon: '🍽️',  labelEn: 'Dishwasher' },
  { key: 'parking',           icon: '🅿️',  labelEn: 'Parking' },
  { key: 'balcony',           icon: '🌅',  labelEn: 'Balcony' },
  { key: 'rooftop',           icon: '🏙️',  labelEn: 'Rooftop' },
  { key: 'elevator',          icon: '🛗',  labelEn: 'Elevator' },
  { key: 'petFriendly',       icon: '🐾',  labelEn: 'Pet friendly' },
  { key: 'smokingAllowed',    icon: '🚬',  labelEn: 'Smoking allowed' },
  { key: 'workspace',         icon: '💼',  labelEn: 'Workspace' },
  { key: 'gym',               icon: '🏋️',  labelEn: 'Gym' },
  { key: 'pool',              icon: '🏊',  labelEn: 'Pool' },
  { key: 'storage',           icon: '📦',  labelEn: 'Storage' },
  { key: 'kitchen',           icon: '🍳',  labelEn: 'Kitchen' },
  { key: 'privateBathroom',   icon: '🚿',  labelEn: 'Private bathroom' },
  { key: 'utilitiesIncluded', icon: '💡',  labelEn: 'Utilities included' },
];

type AmenitiesSource = Pick<Sublet, 'amenities' | 'parsedAmenities'>;

/** Normalize amenities from any Firestore format to a plain object. */
export function normalizeAmenities(sublet: AmenitiesSource): ParsedAmenities {
  // parsedAmenities is the canonical field (written by Cloud Function or webhook)
  if (sublet.parsedAmenities) return sublet.parsedAmenities;
  // amenities written by Cloud Function: object (not array)
  if (sublet.amenities && !Array.isArray(sublet.amenities)) {
    return sublet.amenities as ParsedAmenities;
  }
  return {};
}

/** Check if a specific amenity is true on a listing. */
export function hasAmenity(sublet: AmenitiesSource, key: keyof ParsedAmenities): boolean {
  return normalizeAmenities(sublet)[key] === true;
}

/** Return all AMENITY_DEFS whose value is true for a listing. */
export function getActiveAmenities(sublet: AmenitiesSource): AmenityDef[] {
  const norm = normalizeAmenities(sublet);
  return AMENITY_DEFS.filter(def => norm[def.key] === true);
}
