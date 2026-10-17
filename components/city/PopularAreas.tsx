'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import SectionHeader from '@/components/shared/SectionHeader';
import AreaPlaceholder from '@/components/city/AreaPlaceholder';
import { areaImage } from '@/lib/areas/images';
import { homeCopy } from '@/lib/homeCopy';
import type { CityBrowseArea } from '@/lib/areas/browse';

const TOP = 6;

interface PopularAreasProps {
  citySlug: string;
  areas: CityBrowseArea[];
  language: string;
  size: 'md' | 'lg';
}

function AreaCard({ citySlug, area, language, featured, wide }: { citySlug: string; area: CityBrowseArea; language: string; featured: boolean; wide: boolean }) {
  const copy = homeCopy(language);
  const name = language === 'he' ? area.he : area.en;
  const photo = areaImage(area.slug);
  return (
    <Link
      href={`/map?city=${citySlug}&area=${area.slug}`}
      className={`group relative block overflow-hidden rounded-2xl border border-line bg-brand-50 transition-shadow hover:shadow-[0_8px_24px_rgba(17,26,36,0.10)] ${
        featured ? 'col-span-2 aspect-[16/9] md:aspect-[3/1]' : wide ? 'col-span-2 aspect-[2/1] md:aspect-[4/1]' : 'aspect-[4/3] md:aspect-[2/1]'
      }`}
    >
      {photo ? (
        <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
      ) : (
        <AreaPlaceholder slug={area.slug} />
      )}

      {/* Only as dark as the text needs: a fade under the name and count, the rest of the image untouched. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-ink/65 via-ink/25 to-transparent" aria-hidden="true" />

      {area.thumbnails.length > 0 && (
        <div className="absolute end-3 top-3 flex" aria-hidden="true">
          {area.thumbnails.map((t, i) => (
            <img
              key={t.id}
              src={t.image}
              alt=""
              referrerPolicy="no-referrer"
              className={`h-8 w-8 rounded-full bg-brand-100 object-cover ring-2 ring-white ${i > 0 ? '-ms-2' : ''} ${featured ? 'md:h-10 md:w-10' : ''}`}
              onError={e => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }}
            />
          ))}
        </div>
      )}

      <div className={`absolute inset-x-0 bottom-0 flex flex-col gap-0.5 ${featured ? 'p-5 md:p-6' : 'p-3.5 md:p-5'}`}>
        <span className={`font-display font-extrabold leading-tight tracking-tight text-white ${featured ? 'text-[26px] md:text-[34px]' : 'text-lg md:text-2xl'}`}>
          {name}
        </span>
        <span className={`font-medium text-white/90 ${featured ? 'text-[15px]' : 'text-[13px] md:text-sm'}`}>
          {copy.areaSubletsCount(area.count)}
        </span>
      </div>
    </Link>
  );
}

/** "אזורים מבוקשים": the busiest area full-width, then a 2-column grid. */
export default function PopularAreas({ citySlug, areas, language, size }: PopularAreasProps) {
  const copy = homeCopy(language);
  const [showAll, setShowAll] = useState(false);
  if (areas.length === 0) return null;
  const visible = showAll ? areas : areas.slice(0, TOP);

  return (
    <section className={`flex flex-col ${size === 'lg' ? 'gap-[18px]' : 'gap-3'}`} aria-labelledby="popular-areas">
      <div id="popular-areas">
        <SectionHeader title={copy.popularAreasTitle} subtitle={copy.popularAreasSubtitle} size={size} />
      </div>
      <div className="grid grid-cols-2 gap-3 md:gap-5">
        {visible.map((area, i) => (
          <AreaCard
            key={area.slug}
            citySlug={citySlug}
            area={area}
            language={language}
            featured={i === 0}
            // A lone card on the last row spans the full width instead of leaving a gap.
            wide={i > 0 && i === visible.length - 1 && (visible.length - 1) % 2 === 1}
          />
        ))}
      </div>
      {areas.length > TOP && (
        <button
          type="button"
          onClick={() => setShowAll(v => !v)}
          aria-expanded={showAll}
          className="h-11 self-center rounded-xl border border-line bg-white px-5 text-sm font-semibold text-brand-700 transition-colors hover:border-brand-200"
        >
          {showAll ? copy.showFewerAreas : `${copy.showAllAreas} (${areas.length})`}
        </button>
      )}
    </section>
  );
}
