'use client';

import React from 'react';
import AmenityIcon from '@/components/shared/AmenityIcon';
import type { ParsedAmenities } from '@/types';

export const AMENITY_KEYS = ['wifi', 'ac', 'parking', 'petFriendly', 'balcony', 'elevator', 'furnished', 'billsIncluded'] as const;
export type AmenityKey = typeof AMENITY_KEYS[number];

// Form keys → ParsedAmenities keys (for the shared outline icons).
const ICON_KEY: Record<AmenityKey, keyof ParsedAmenities> = {
  wifi: 'wifi',
  ac: 'ac',
  parking: 'parking',
  petFriendly: 'petFriendly',
  balcony: 'balcony',
  elevator: 'elevator',
  furnished: 'furnished',
  billsIncluded: 'utilitiesIncluded',
};

interface AmenitiesGridProps {
  selected: string[];
  onChange: (selected: string[]) => void;
  /** Translation labels keyed by amenity key */
  labels: Record<AmenityKey, string>;
}

export default function AmenitiesGrid({ selected, onChange, labels }: AmenitiesGridProps) {
  const toggle = (key: AmenityKey) => {
    onChange(
      selected.includes(key)
        ? selected.filter((a) => a !== key)
        : [...selected, key],
    );
  };

  return (
    <div className="flex flex-wrap gap-2">
      {AMENITY_KEYS.map((key) => {
        const active = selected.includes(key);
        return (
          <button
            key={key}
            type="button"
            onClick={() => toggle(key)}
            className={`px-3 py-2 rounded-full text-xs font-bold border flex items-center gap-1.5 transition-all ${
              active
                ? 'bg-brand-600 border-brand-600 text-white '
                : 'bg-white border-line text-muted hover:border-line'
            }`}
          >
            <AmenityIcon amenity={ICON_KEY[key]} className="h-4 w-4" />
            {labels[key]}
          </button>
        );
      })}
    </div>
  );
}
