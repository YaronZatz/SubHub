import React from 'react';
import { Sublet, Language, CurrencyCode } from '../types';
import { HeartIcon } from './Icons';
import { formatPrice } from '../utils/formatters';
import ListingCarousel from './ListingCarousel';

interface MobileMapCardProps {
  sublet: Sublet;
  onClose: () => void;
  onOpenDetail: () => void;
  isSaved: boolean;
  onToggleSave: (e: React.MouseEvent) => void;
  currency: CurrencyCode;
  language: Language;
}

const MobileMapCard: React.FC<MobileMapCardProps> = ({
  sublet,
  onClose,
  onOpenDetail,
  isSaved,
  onToggleSave,
  currency,
  language,
}) => {
  const rooms = sublet.parsedRooms?.bedrooms ?? sublet.parsedRooms?.totalRooms;

  return (
    <div
      onClick={onOpenDetail}
      className="relative flex bg-white rounded-t-2xl shadow-[0_-4px_20px_rgba(0,0,0,0.12)] cursor-pointer h-[152px] overflow-hidden animate-in slide-in-from-bottom duration-300"
    >
      {/* Image carousel */}
      <div className="w-[110px] shrink-0">
        <ListingCarousel
          id={sublet.id}
          images={sublet.images}
          sourceUrl={sublet.sourceUrl}
          photoCount={sublet.photoCount}
          aspectRatio=""
          className="h-[152px]"
        />
      </div>

      {/* Close button — over image, top-left */}
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="absolute top-2 left-2 z-10 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm border border-slate-200 text-slate-600 active:scale-90 transition-transform"
        aria-label="Close"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Details */}
      <div className="flex-1 min-w-0 px-3 py-3 flex flex-col justify-between">
        {/* Top row: type badge + heart */}
        <div className="flex items-center justify-between gap-1">
          <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider">
            {String(sublet.type).toUpperCase()}
          </span>
          <button
            onClick={onToggleSave}
            className="shrink-0 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors"
            aria-label={isSaved ? 'Unsave' : 'Save'}
          >
            <HeartIcon className="w-4 h-4" filled={isSaved} />
          </button>
        </div>

        {/* Location */}
        <p className="text-sm font-bold text-slate-900 line-clamp-2 leading-tight">{sublet.location}</p>

        {/* Meta */}
        <div>
          {sublet.neighborhood && (
            <p className="text-[11px] text-slate-400 font-medium truncate">{sublet.neighborhood}</p>
          )}
          {rooms != null && (
            <p className="text-[11px] text-slate-500">{rooms} bedroom{rooms !== 1 ? 's' : ''}</p>
          )}
        </div>

        {/* Price */}
        <p className="text-sm font-black text-slate-900">
          {formatPrice(sublet.price, currency, language)}
          <span className="text-[11px] font-normal text-slate-400"> /mo</span>
        </p>
      </div>
    </div>
  );
};

export default MobileMapCard;
