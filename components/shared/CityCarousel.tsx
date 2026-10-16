'use client';

import React, { useRef } from 'react';

interface CityCarouselProps {
  title: string;
  countLabel?: string;
  seeAllLabel: string;
  onSeeAll: () => void;
  /** Shows prev/next buttons (desktop). Mobile relies on swiping. */
  showArrows?: boolean;
  prevLabel?: string;
  nextLabel?: string;
  size?: 'md' | 'lg';
  children: React.ReactNode;
}

function Chevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true" className="rtl:rotate-180">
      <path d={dir === 'left' ? 'M15 6l-6 6 6 6' : 'M9 6l6 6-6 6'} />
    </svg>
  );
}

export default function CityCarousel({
  title,
  countLabel,
  seeAllLabel,
  onSeeAll,
  showArrows = false,
  prevLabel = 'Previous',
  nextLabel = 'Next',
  size = 'lg',
  children,
}: CityCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  const scrollBy = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    const rtl = getComputedStyle(el).direction === 'rtl';
    el.scrollBy({ left: dir * (rtl ? -1 : 1) * el.clientWidth * 0.8, behavior: 'smooth' });
  };

  const lg = size === 'lg';

  return (
    <section className={`flex flex-col ${lg ? 'gap-[18px]' : 'gap-3'}`}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-baseline gap-2.5">
          <h2 className={`font-display font-extrabold tracking-tight text-ink ${lg ? 'text-[32px]' : 'text-[22px]'}`}>{title}</h2>
          {countLabel && <span className={`text-muted ${lg ? 'text-sm' : 'text-[13px]'}`}>{countLabel}</span>}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSeeAll}
            className={`px-2 font-semibold text-brand-700 hover:underline ${lg ? 'py-2.5 text-[15px]' : 'py-2 text-sm'}`}
          >
            {seeAllLabel} <span aria-hidden="true" className="inline-block rtl:rotate-180">→</span>
          </button>
          {showArrows && (
            <>
              <button type="button" aria-label={prevLabel} onClick={() => scrollBy(-1)} className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white text-ink hover:border-brand-200">
                <Chevron dir="left" />
              </button>
              <button type="button" aria-label={nextLabel} onClick={() => scrollBy(1)} className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-white text-ink hover:border-brand-200">
                <Chevron dir="right" />
              </button>
            </>
          )}
        </div>
      </div>
      <div
        ref={trackRef}
        className={`scrollbar-hide flex snap-x snap-mandatory overflow-x-auto ${lg ? 'gap-5 px-0.5 pb-3 pt-0.5' : '-mx-4 gap-3 px-4 pb-1.5'}`}
      >
        {children}
      </div>
    </section>
  );
}
