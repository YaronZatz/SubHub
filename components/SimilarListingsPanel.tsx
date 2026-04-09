
import React, { useEffect, useRef } from 'react';
import { Sublet, Language, ListingStatus } from '../types';
import { translations } from '../translations';
import { useCurrency } from '../contexts/CurrencyContext';
import { formatPrice, formatDate } from '../utils/formatters';
import ListingCarousel from './ListingCarousel';

interface SimilarListingsPanelProps {
  isVisible: boolean;
  onDismiss: () => void;
  sourceListing: Sublet | null;
  similarListings: Sublet[];
  onListingClick: (listing: Sublet) => void;
  language: Language;
}

const AUTO_HIDE_MS = 30_000;

const SimilarListingsPanel: React.FC<SimilarListingsPanelProps> = ({
  isVisible,
  onDismiss,
  sourceListing,
  similarListings,
  onListingClick,
  language,
}) => {
  const t = translations[language];
  const isRTL = language === Language.HE;
  const { currency } = useCurrency();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isVisible) {
      timerRef.current = setTimeout(onDismiss, AUTO_HIDE_MS);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isVisible, onDismiss]);

  if (!isVisible || !sourceListing) return null;

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none"
      style={{ animation: 'slideUpPanel 0.35s cubic-bezier(0.16,1,0.3,1) both' }}
    >
      <style>{`
        @keyframes slideUpPanel {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>

      <div
        className="pointer-events-auto w-full max-w-lg mx-3 mb-4 bg-white rounded-3xl shadow-[0_-8px_40px_-8px_rgba(0,0,0,0.18)] border border-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-4 pt-4 pb-3 border-b border-slate-100">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-slate-900">{t.fbOpenedInNewTab}</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{t.similarListingsSubtitle}</p>
          </div>
          <button
            onClick={onDismiss}
            aria-label="Close"
            className={`shrink-0 ${isRTL ? 'mr-3' : 'ml-3'} w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors active:scale-90`}
          >
            <svg className="w-3.5 h-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Listing cards */}
        {similarListings.length > 0 ? (
          <div className="flex gap-3 px-4 py-3 overflow-x-auto scrollbar-none">
            {similarListings.map((listing) => (
              <button
                key={listing.id}
                onClick={() => onListingClick(listing)}
                className="shrink-0 w-36 text-left rounded-2xl border border-slate-100 overflow-hidden bg-slate-50 hover:border-cyan-300 hover:shadow-md transition-all active:scale-95"
              >
                <div className="aspect-[4/3] w-full overflow-hidden">
                  <ListingCarousel
                    id={listing.id}
                    images={listing.images}
                    sourceUrl={listing.sourceUrl}
                    photoCount={(listing as any).photoCount || 0}
                    aspectRatio="aspect-[4/3]"
                  />
                </div>
                <div className="p-2">
                  <div className="text-cyan-600 font-black text-xs">
                    {formatPrice(listing.price, currency, language, listing.currency)}
                  </div>
                  <div className="text-[10px] text-slate-600 font-semibold truncate mt-0.5">
                    {listing.neighborhood || listing.city || ''}
                  </div>
                  {(listing.startDate || listing.endDate) && (
                    <div className="text-[9px] text-slate-400 mt-0.5 truncate">
                      {listing.startDate ? formatDate(listing.startDate) : ''}
                      {listing.startDate && listing.endDate ? ' – ' : ''}
                      {listing.endDate ? formatDate(listing.endDate) : ''}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        ) : null}

        {/* Footer */}
        <div className="px-4 pb-4">
          <button
            onClick={onDismiss}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3 rounded-2xl text-sm transition-all active:scale-[0.98] shadow-md shadow-indigo-100 tracking-wide"
          >
            {t.keepBrowsingSubhub}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SimilarListingsPanel;
