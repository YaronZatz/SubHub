
import { ParsedAmenities, Sublet } from '../types';

export interface AmenityDef {
  key: keyof ParsedAmenities;
  icon: string;
  labelEn: string;
  tKey: string;
}

export const AMENITY_DEFS: AmenityDef[] = [
  { key: 'furnished',         icon: '🛋️',  labelEn: 'Furnished',           tKey: 'amenityFurnished' },
  { key: 'wifi',              icon: '📶',  labelEn: 'Wi-Fi',               tKey: 'amenityWifi' },
  { key: 'ac',                icon: '❄️',  labelEn: 'Air conditioning',    tKey: 'amenityAC' },
  { key: 'heating',           icon: '🔥',  labelEn: 'Heating',             tKey: 'amenityHeating' },
  { key: 'washer',            icon: '🧺',  labelEn: 'Washer',              tKey: 'amenityWasher' },
  { key: 'dryer',             icon: '♨️',  labelEn: 'Dryer',               tKey: 'amenityDryer' },
  { key: 'dishwasher',        icon: '🍽️',  labelEn: 'Dishwasher',          tKey: 'amenityDishwasher' },
  { key: 'parking',           icon: '🅿️',  labelEn: 'Parking',             tKey: 'amenityParking' },
  { key: 'balcony',           icon: '🌅',  labelEn: 'Balcony',             tKey: 'amenityBalcony' },
  { key: 'rooftop',           icon: '🏙️',  labelEn: 'Rooftop',             tKey: 'amenityRooftop' },
  { key: 'elevator',          icon: '🛗',  labelEn: 'Elevator',            tKey: 'amenityElevator' },
  { key: 'petFriendly',       icon: '🐾',  labelEn: 'Pet friendly',        tKey: 'amenityPetFriendly' },
  { key: 'smokingAllowed',    icon: '🚬',  labelEn: 'Smoking allowed',     tKey: 'amenitySmokingAllowed' },
  { key: 'workspace',         icon: '💼',  labelEn: 'Workspace',           tKey: 'amenityWorkspace' },
  { key: 'gym',               icon: '🏋️',  labelEn: 'Gym',                 tKey: 'amenityGym' },
  { key: 'pool',              icon: '🏊',  labelEn: 'Pool',                tKey: 'amenityPool' },
  { key: 'storage',           icon: '📦',  labelEn: 'Storage',             tKey: 'amenityStorage' },
  { key: 'kitchen',           icon: '🍳',  labelEn: 'Kitchen',             tKey: 'amenityKitchen' },
  { key: 'privateBathroom',   icon: '🚿',  labelEn: 'Private bathroom',    tKey: 'amenityPrivateBathroom' },
  { key: 'utilitiesIncluded', icon: '💡',  labelEn: 'Utilities included',  tKey: 'amenityUtilitiesIncluded' },
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

/**
 * Convert the form's string[] amenity keys to a ParsedAmenities object.
 * AmenitiesGrid uses 'billsIncluded' which maps to 'utilitiesIncluded' in ParsedAmenities.
 */
export function amenityArrayToParsedAmenities(keys: string[]): ParsedAmenities {
  const result: ParsedAmenities = {};
  for (const key of keys) {
    if (key === 'billsIncluded') {
      result.utilitiesIncluded = true;
    } else {
      (result as Record<string, boolean>)[key] = true;
    }
  }
  return result;
}

/**
 * Convert a ParsedAmenities object back to the form's string[] format.
 * Inverse of amenityArrayToParsedAmenities.
 */
export function parsedAmenitiesToArray(pa: ParsedAmenities | undefined): string[] {
  if (!pa) return [];
  const result: string[] = [];
  for (const [key, val] of Object.entries(pa)) {
    if (val === true && key !== 'other') {
      result.push(key === 'utilitiesIncluded' ? 'billsIncluded' : key);
    }
  }
  return result;
}
