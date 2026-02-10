'use client';

import React from 'react';
import { ArrowUpCircle, Wind, Sun, PawPrint } from 'lucide-react';
import type { ApartmentDetails } from '../types';

const SIZE = 16;

interface FeatureIconsProps {
  apartment_details?: ApartmentDetails | null;
  className?: string;
}

export default function FeatureIcons({ apartment_details, className = '' }: FeatureIconsProps) {
  if (!apartment_details) return null;
  const { has_elevator, has_air_con, has_balcony, is_pet_friendly } = apartment_details;
  const show = [
    has_elevator && <ArrowUpCircle key="elevator" size={SIZE} className="shrink-0 text-slate-500" aria-label="Elevator" />,
    has_air_con && <Wind key="ac" size={SIZE} className="shrink-0 text-slate-500" aria-label="Air conditioning" />,
    has_balcony && <Sun key="balcony" size={SIZE} className="shrink-0 text-slate-500" aria-label="Balcony" />,
    is_pet_friendly && <PawPrint key="pets" size={SIZE} className="shrink-0 text-slate-500" aria-label="Pet friendly" />,
  ].filter(Boolean);
  if (show.length === 0) return null;
  return (
    <div className={`flex items-center gap-1.5 ${className}`} role="list" aria-label="Apartment features">
      {show}
    </div>
  );
}
