'use client';

import React from 'react';
import Link from 'next/link';
import { DoorOpen, House, Sofa, Users, type LucideIcon } from 'lucide-react';
import SectionHeader from '@/components/shared/SectionHeader';
import { homeCopy } from '@/lib/homeCopy';
import type { PropertyType } from '@/lib/propertyType';

const ICONS: Record<PropertyType, LucideIcon> = {
  entire: House,
  studio: Sofa,
  private_room: DoorOpen,
  shared_room: Users,
};

interface PropertyTypeRowProps {
  citySlug: string;
  types: { type: PropertyType; count: number }[];
  language: string;
  size: 'md' | 'lg';
}

/** "לפי סוג נכס": horizontally scrollable tiles, same tile language as the amenities list. */
export default function PropertyTypeRow({ citySlug, types, language, size }: PropertyTypeRowProps) {
  const copy = homeCopy(language);
  if (types.length === 0) return null;
  const label: Record<PropertyType, string> = {
    entire: copy.typeEntire,
    studio: copy.typeStudio,
    private_room: copy.typePrivateRoom,
    shared_room: copy.typeSharedRoom,
  };

  return (
    <section className={`flex flex-col ${size === 'lg' ? 'gap-[18px]' : 'gap-3'}`}>
      <SectionHeader title={copy.byTypeTitle} size={size} />
      <div className={`scrollbar-hide flex snap-x snap-mandatory gap-3 overflow-x-auto md:gap-4 ${size === 'lg' ? 'px-0.5 pb-1' : '-mx-4 px-4 pb-1'}`}>
        {types.map(({ type, count }) => {
          const Icon = ICONS[type];
          return (
            <Link
              key={type}
              href={`/map?city=${citySlug}&type=${type}`}
              className="flex w-[156px] shrink-0 snap-start flex-col gap-3 rounded-2xl border border-line bg-white p-4 transition-colors hover:border-brand-200 md:w-[200px]"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <Icon className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="text-[15px] font-semibold leading-snug text-ink">{label[type]}</span>
                <span className="text-[13px] text-muted">{copy.areaSubletsCount(count)}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
