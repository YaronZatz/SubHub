'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Sublet, CurrencyCode, Language } from '@/types';
import { HeartIcon } from '@/components/Icons';
import { formatPrice } from '@/utils/formatters';
import ListingCarousel from '@/components/ListingCarousel';
import { translations } from '@/translations';
import { localizedLocation, localizedNeighborhood } from '@/lib/locationUtils';

interface HomeListingCardProps {
  sublet: Sublet;
  isSaved: boolean;
  onToggleSave: (e: React.MouseEvent) => void;
  currency: CurrencyCode;
  language: Language;
}

const HomeListingCard: React.FC<HomeListingCardProps> = ({
  sublet,
  isSaved,
  onToggleSave,
  currency,
  language,
}) => {
  const router = useRouter();
  const t = translations[language];
  const postTs = sublet.postedAt ? (new Date(sublet.postedAt).getTime() || sublet.createdAt) : sublet.createdAt;
  const hoursAgo = Math.max(0, Math.floor((Date.now() - postTs) / (60 * 60 * 1000)));
  const daysAgo = Math.max(1, Math.floor(hoursAgo / 24));
  const isNew = hoursAgo < 24;

  const handleClick = () => {
    router.push(`/listing/${sublet.id}`);
  };

  return (
    <div
      onClick={handleClick}
      className="w-56 shrink-0 rounded-2xl overflow-hidden bg-white shadow-md hover:shadow-xl cursor-pointer transition-shadow duration-200 active:scale-[0.98]"
    >
      {/* Photo */}
      <div className="relative h-36">
        <ListingCarousel
          id={sublet.id}
          images={sublet.images}
          sourceUrl={sublet.sourceUrl}
          photoCount={sublet.photoCount}
          aspectRatio=""
          className="h-full"
        />
        {/* Save button */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleSave(e); }}
          className="absolute top-2 right-2 z-20 w-7 h-7 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors shadow-sm"
          aria-label={isSaved ? 'Unsave' : 'Save'}
        >
          <HeartIcon className="w-3.5 h-3.5" filled={isSaved} />
        </button>
        {/* Time-ago badge — top left */}
        {isNew ? (
          <div className="absolute top-2 left-2 z-20 flex items-center gap-1 bg-cyan-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full shadow-lg animate-pulse ring-2 ring-cyan-100 pointer-events-none">
            <span className="w-1 h-1 bg-white rounded-full" />
            {t.addedXhAgo.replace('{x}', String(hoursAgo))}
          </div>
        ) : (
          <div className="absolute top-2 left-2 z-20 bg-slate-500/80 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full pointer-events-none">
            {t.addedXdAgo.replace('{x}', String(daysAgo > 30 ? '30+' : daysAgo))}
          </div>
        )}
      </div>

      {/* Details */}
      <div className="p-3">
        <div className="flex items-center justify-between gap-1 mb-1">
          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase tracking-wider truncate">
            {t.subletTypes[sublet.type]}
          </span>
          {sublet.price > 0 ? (
            <span className="text-sm font-black text-cyan-600 shrink-0">
              {formatPrice(sublet.price, currency, language, sublet.currency)}
            </span>
          ) : (
            <span className="text-[10px] font-medium text-slate-400 shrink-0">Price on request</span>
          )}
        </div>
        <p className="text-xs font-semibold text-slate-800 line-clamp-1">{localizedLocation(sublet, language)}</p>
        {sublet.neighborhood && (
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 line-clamp-1">
            {localizedNeighborhood(sublet, language)}
          </p>
        )}
      </div>
    </div>
  );
};

export default HomeListingCard;
