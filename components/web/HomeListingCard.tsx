'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Sublet, CurrencyCode, Language } from '@/types';
import { HeartIcon } from '@/components/Icons';
import { formatPrice } from '@/utils/formatters';
import ListingCarousel from '@/components/ListingCarousel';
import { translations } from '@/translations';

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
  const hasAI = !!(sublet.ai_summary || sublet.parsedAmenities || sublet.parsedRooms || sublet.rooms);

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
        {/* AI Parsed badge — bottom left */}
        {hasAI && (
          <div className="absolute bottom-2 left-2 z-20 flex items-center gap-1 bg-[#F5831F] text-white text-[8px] font-black px-1.5 py-0.5 rounded-full pointer-events-none">
            <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" />
            </svg>
            AI PARSED
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
