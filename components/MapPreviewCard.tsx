import React from 'react';
import { Sublet, Language, CurrencyCode } from '../types';
import { HeartIcon } from './Icons';
import { formatPrice } from '../utils/formatters';

interface MapPreviewCardProps {
  sublet: Sublet;
  onClose: () => void;
  onOpenDetail: () => void;
  isSaved: boolean;
  onToggleSave: (e: React.MouseEvent) => void;
  currency: CurrencyCode;
  language: Language;
}

const MapPreviewCard: React.FC<MapPreviewCardProps> = ({
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
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] w-[320px] animate-in slide-in-from-bottom duration-300">
      {/* Close button — sibling of card so clicks don't bubble to onOpenDetail */}
      <button
        onClick={onClose}
        className="absolute -top-3 -right-3 z-[1001] bg-white hover:bg-slate-100 text-slate-700 w-8 h-8 rounded-full flex items-center justify-center shadow-lg border border-slate-200 transition-colors active:scale-90"
        aria-label="Close"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Card */}
      <div
        onClick={onOpenDetail}
        className="relative bg-white rounded-2xl shadow-xl overflow-hidden cursor-pointer hover:shadow-2xl transition-shadow active:scale-[0.98]"
      >
        {/* Image area */}
        <div className="relative h-[180px] bg-slate-100">
          <img
            src={sublet.images?.[0] || `https://picsum.photos/seed/${sublet.id}/320/180`}
            alt=""
            className="w-full h-full object-cover"
          />
          <button
            onClick={onToggleSave}
            className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors shadow-sm"
            aria-label={isSaved ? 'Unsave' : 'Save'}
          >
            <HeartIcon className="w-4 h-4" filled={isSaved} />
          </button>
        </div>

        {/* Details */}
        <div className="p-3">
          <div className="flex items-center justify-between gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider">
              {String(sublet.type).toUpperCase()}
            </span>
            <span className="text-base font-black text-indigo-600">
              {formatPrice(sublet.price, currency, language)}
            </span>
          </div>
          <p className="text-sm font-semibold text-slate-800 line-clamp-1">{sublet.location}</p>
          {sublet.neighborhood && (
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
              {sublet.neighborhood}
            </p>
          )}
          {rooms != null && (
            <p className="text-xs text-slate-500 mt-1">{rooms} bedroom{rooms !== 1 ? 's' : ''}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default MapPreviewCard;
