'use client';

import React from 'react';
import { Sublet, CurrencyCode, Language } from '@/types';
import { HeartIcon } from '@/components/Icons';
import { formatPrice } from '@/utils/formatters';
import ListingCarousel from '@/components/ListingCarousel';
import { translations } from '@/translations';

interface HomeListingCardProps {
  sublet: Sublet;
  isSaved: boolean;
  onToggleSave: (e: React.MouseEvent) => void;
  onCitySelect: (city: string) => void;
  currency: CurrencyCode;
  language: Language;
}

const HomeListingCard: React.FC<HomeListingCardProps> = ({
  sublet,
  isSaved,
  onToggleSave,
  onCitySelect,
  currency,
  language,
}) => {
  const t = translations[language];
  const isNew = Date.now() - sublet.createdAt < 24 * 60 * 60 * 1000;

  const handleClick = () => {
    if (sublet.city) onCitySelect(sublet.city);
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
        {/* New badge */}
        {isNew && (
          <span className="absolute top-2 left-2 z-20 px-1.5 py-0.5 rounded-full bg-[#F5831F] text-white text-[9px] font-black uppercase tracking-wider">
            New
          </span>
        )}
      </div>

      {/* Details */}
      <div className="p-3">
        <div className="flex items-center justify-between gap-1 mb-1">
          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase tracking-wider truncate">
            {t.subletTypes[sublet.type]}
          </span>
          <span className="text-sm font-black text-cyan-600 shrink-0">
            {formatPrice(sublet.price, currency, language, sublet.currency)}
          </span>
        </div>
        <p className="text-xs font-semibold text-slate-800 line-clamp-1">{sublet.location}</p>
        {sublet.neighborhood && (
          <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 line-clamp-1">
            {sublet.neighborhood}
          </p>
        )}
      </div>
    </div>
  );
};

export default HomeListingCard;
