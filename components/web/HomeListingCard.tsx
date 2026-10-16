'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Sublet, CurrencyCode, Language } from '@/types';
import { HeartIcon } from '@/components/Icons';
import { formatPrice } from '@/utils/formatters';
import ListingCarousel from '@/components/ListingCarousel';
import { translations } from '@/translations';
import { listingTitle, localizedCity, localizedNeighborhood } from '@/lib/locationUtils';
import { formatDateRange, timelineWindow } from '@/lib/dateWindow';
import { homeCopy } from '@/lib/homeCopy';

interface HomeListingCardProps {
  sublet: Sublet;
  isSaved: boolean;
  onToggleSave: (e: React.MouseEvent) => void;
  currency: CurrencyCode;
  language: Language;
  /** lg: desktop carousels, md: mobile carousels */
  size?: 'md' | 'lg';
}

const HomeListingCard: React.FC<HomeListingCardProps> = ({
  sublet,
  isSaved,
  onToggleSave,
  currency,
  language,
  size = 'lg',
}) => {
  const router = useRouter();
  const t = translations[language];
  const postTs = sublet.postedAt ? (new Date(sublet.postedAt).getTime() || sublet.createdAt) : sublet.createdAt;
  const hoursAgo = Math.max(0, Math.floor((Date.now() - postTs) / (60 * 60 * 1000)));
  const daysAgo = Math.max(1, Math.floor(hoursAgo / 24));
  const isNew = hoursAgo < 24;

  // Neighborhood as the title with the city underneath, both in the UI language.
  const neighborhood = localizedNeighborhood(sublet, language);
  const city = localizedCity(sublet, language);
  const title = neighborhood || city || listingTitle(sublet, language);
  const subtitle = neighborhood && city && neighborhood !== city ? city : undefined;
  const dateRange = formatDateRange(sublet.startDate, sublet.endDate, language);
  const timeline = timelineWindow(sublet.startDate, sublet.endDate, language);
  const typeLabel = t.subletTypes[sublet.type];
  const copy = homeCopy(language);

  const lg = size === 'lg';

  return (
    <article
      onClick={() => router.push(`/listing/${sublet.id}`)}
      className={`${lg ? 'w-[272px]' : 'w-[220px]'} shrink-0 snap-start cursor-pointer overflow-hidden rounded-2xl border border-line bg-white transition-shadow hover:shadow-[0_8px_24px_rgba(17,26,36,0.10)]`}
    >
      <div className={`relative ${lg ? 'aspect-[4/3]' : 'h-[130px]'}`}>
        <ListingCarousel
          id={sublet.id}
          images={sublet.images}
          sourceUrl={sublet.sourceUrl}
          photoCount={sublet.photoCount}
          aspectRatio=""
          className="h-full"
        />
        <span
          className={`pointer-events-none absolute start-2.5 top-2.5 z-20 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            isNew ? 'bg-accent-100 text-accent-700' : 'bg-white text-ink'
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${isNew ? 'bg-accent-500' : 'bg-brand-200'}`} />
          {isNew
            ? t.addedXhAgo.replace('{x}', String(hoursAgo))
            : t.addedXdAgo.replace('{x}', String(daysAgo > 30 ? '30+' : daysAgo))}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleSave(e); }}
          className={`absolute end-2 top-2 z-20 flex items-center justify-center rounded-full bg-white transition-colors ${
            lg ? 'h-10 w-10' : 'h-9 w-9'
          } ${isSaved ? 'text-accent-600' : 'text-ink hover:text-accent-600'}`}
          aria-label={isSaved ? 'Unsave' : 'Save'}
        >
          <HeartIcon className="h-[18px] w-[18px]" filled={isSaved} />
        </button>
      </div>

      <div className={`flex flex-col ${lg ? 'gap-2.5 px-4 pb-4 pt-3.5' : 'gap-1.5 px-3 pb-3 pt-2.5'}`}>
        <div className="flex items-center justify-between gap-2">
          {typeLabel && (
            <span className={`truncate rounded-md bg-brand-100 font-semibold text-brand-700 ${lg ? 'px-2 py-0.5 text-xs' : 'px-1.5 py-px text-[11px]'}`}>
              {typeLabel}
            </span>
          )}
          {sublet.price > 0 ? (
            <span className={`shrink-0 font-bold tabular-nums ${lg ? 'text-lg' : 'text-base'}`}>
              {formatPrice(sublet.price, currency, language, sublet.currency)}
              {lg && <span className="ms-0.5 text-xs font-normal text-muted">{copy.perMonth}</span>}
            </span>
          ) : (
            <span className="shrink-0 text-xs text-muted">{copy.priceOnRequest}</span>
          )}
        </div>

        <div className="min-w-0">
          <h3 className={`truncate font-display font-bold tracking-tight ${lg ? 'text-[19px]' : 'text-base'}`}>{title}</h3>
          {lg && subtitle && <p className="truncate text-sm text-muted">{subtitle}</p>}
        </div>

        {dateRange && (
          <div className="flex flex-col gap-1.5">
            <span className={`font-medium text-ink ${lg ? 'text-[13px]' : 'text-[11px] text-muted'}`}>{dateRange}</span>
            {timeline && (
              <>
                <div className="relative h-1.5 rounded-full bg-brand-100" aria-hidden="true">
                  <div
                    className="absolute inset-y-0 rounded-full bg-brand-600"
                    style={{ insetInlineStart: `${timeline.left}%`, width: `${timeline.width}%` }}
                  />
                </div>
                {lg && (
                  <div className="flex justify-between text-[11px] uppercase text-muted" aria-hidden="true">
                    {timeline.months.map(m => <span key={m}>{m}</span>)}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </article>
  );
};

export default HomeListingCard;
