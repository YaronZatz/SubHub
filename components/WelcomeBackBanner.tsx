
import React from 'react';
import { Sublet, Language } from '../types';
import { translations } from '../translations';

interface WelcomeBackBannerProps {
  isVisible: boolean;
  onDismiss: () => void;
  onBrowseMore: () => void;
  lastViewedListing: Sublet | null;
  cityListingCount: number;
  language: Language;
}

const WelcomeBackBanner: React.FC<WelcomeBackBannerProps> = ({
  isVisible,
  onDismiss,
  onBrowseMore,
  lastViewedListing,
  cityListingCount,
  language,
}) => {
  const t = translations[language];
  const isRTL = language === Language.HE;

  if (!isVisible || !lastViewedListing) return null;

  const locationLabel = lastViewedListing.neighborhood || lastViewedListing.city || '';

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="fixed bottom-0 left-0 right-0 z-[60] flex justify-center pointer-events-none"
      style={{ animation: 'slideUpBanner 0.35s cubic-bezier(0.16,1,0.3,1) both' }}
    >
      <style>{`
        @keyframes slideUpBanner {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>

      <div
        className="pointer-events-auto w-full max-w-lg mx-3 mb-4 rounded-3xl overflow-hidden shadow-[0_-8px_40px_-8px_rgba(79,70,229,0.4)]"
        style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 50%, #818cf8 100%)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-4 pb-5 relative">
          {/* Dismiss X */}
          <button
            onClick={onDismiss}
            aria-label="Dismiss"
            className={`absolute top-3 ${isRTL ? 'left-3' : 'right-3'} w-7 h-7 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors active:scale-90`}
          >
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Title */}
          <div className="text-white font-black text-lg leading-tight">
            👋 {t.welcomeBackTitle}
          </div>

          {/* Body */}
          <p className="text-indigo-100 text-sm mt-1 leading-snug pr-8">
            {t.welcomeBackBody}
            {locationLabel ? ` ${locationLabel}?` : '?'}
            {cityListingCount > 1 && (
              <>
                {' '}
                <span className="font-bold text-white">{cityListingCount}</span>
                {' '}{t.moreListingsIn}
                {lastViewedListing.city ? ` ${lastViewedListing.city}` : ''}
                {' '}{t.toExplore}.
              </>
            )}
          </p>

          {/* CTA */}
          <button
            onClick={onBrowseMore}
            className="mt-4 w-full bg-white text-indigo-700 font-black py-3 rounded-2xl text-sm transition-all active:scale-[0.98] hover:bg-indigo-50 shadow-md tracking-wide"
          >
            {t.browseMore}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeBackBanner;
