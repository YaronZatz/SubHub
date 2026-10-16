import React from 'react';
import {
  Sofa, Wifi, AirVent, Flame, WashingMachine, Wind, Utensils, SquareParking, Sun, Building2,
  ArrowUpDown, PawPrint, Cigarette, Laptop, Dumbbell, Waves, Package, CookingPot, ShowerHead,
  Lightbulb, Check, type LucideIcon,
} from 'lucide-react';
import type { ParsedAmenities } from '@/types';

const ICONS: Partial<Record<keyof ParsedAmenities, LucideIcon>> = {
  furnished: Sofa,
  wifi: Wifi,
  ac: AirVent,
  heating: Flame,
  washer: WashingMachine,
  dryer: Wind,
  dishwasher: Utensils,
  parking: SquareParking,
  balcony: Sun,
  rooftop: Building2,
  elevator: ArrowUpDown,
  petFriendly: PawPrint,
  smokingAllowed: Cigarette,
  workspace: Laptop,
  gym: Dumbbell,
  pool: Waves,
  storage: Package,
  kitchen: CookingPot,
  privateBathroom: ShowerHead,
  utilitiesIncluded: Lightbulb,
};

/** Outline icon for an amenity key (replaces the old emoji icons). */
export default function AmenityIcon({ amenity, className = 'h-5 w-5' }: { amenity: keyof ParsedAmenities; className?: string }) {
  const Icon = ICONS[amenity] ?? Check;
  return <Icon className={className} strokeWidth={1.8} aria-hidden="true" />;
}
