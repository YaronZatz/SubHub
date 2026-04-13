'use client';

import React from 'react';

export const AMENITY_KEYS = ['wifi', 'ac', 'parking', 'petFriendly', 'balcony', 'elevator', 'furnished', 'billsIncluded'] as const;
export type AmenityKey = typeof AMENITY_KEYS[number];

const AMENITY_ICONS: Record<AmenityKey, string> = {
  wifi: '📶',
  ac: '❄️',
  parking: '🅿️',
  petFriendly: '🐾',
  balcony: '🌿',
  elevator: '🛗',
  furnished: '🛋️',
  billsIncluded: '💡',
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
                ? 'bg-cyan-600 border-cyan-600 text-white shadow-md shadow-cyan-100'
                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
            }`}
          >
            <span className="text-sm">{AMENITY_ICONS[key]}</span>
            {labels[key]}
          </button>
        );
      })}
    </div>
  );
}
