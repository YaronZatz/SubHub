"use client";

import { useState } from "react";
import { useLanguage } from '@/contexts/LanguageContext';
import { translations } from '@/translations';
import { homeCopy } from '@/lib/homeCopy';

interface PhotoGalleryProps {
  images: string[];
  alt?: string;
  sourceUrl?: string;
  onShowAll?: () => void;
  onImageClick?: (index: number) => void;
}

const GridIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="3" width="7" height="7" />
    <rect x="14" y="3" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" />
  </svg>
);

const ImagePlaceholder = ({ size = 32 }: { size?: number }) => (
  <div className="absolute inset-0 flex items-center justify-center text-muted bg-brand-50">
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="m21 15-5-5L5 21" />
    </svg>
  </div>
);

export default function PhotoGallery({ images, alt: altProp, sourceUrl, onShowAll, onImageClick }: PhotoGalleryProps) {
  const { language } = useLanguage();
  const t = translations[language];
  const copy = homeCopy(language);
  const alt = altProp ?? copy.photoAlt(1);
  const handleClick = (index: number) => {
    if (onImageClick) onImageClick(index);
    else onShowAll?.();
  };
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set());

  // Only show slots where we have an actual image URL
  const display = Array.from({ length: 5 }, (_, i) => images[i] ?? null);
  const allFailed = images.length > 0 && failedImages.size >= images.length;

  const handleError = (index: number) =>
    setFailedImages((prev) => new Set(prev).add(index));

  if (allFailed) {
    return (
      <div className="rounded-2xl overflow-hidden bg-brand-50 h-72 md:h-[480px] flex flex-col items-center justify-center gap-3 text-muted">
        <svg className="w-12 h-12 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        {sourceUrl ? (
          <a
            href={sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 border border-line bg-white text-ink hover:border-brand-200 text-sm font-semibold px-4 py-2 rounded-full transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            {copy.viewOnFacebook}
          </a>
        ) : (
          <span className="text-sm font-medium">{copy.photosUnavailable}</span>
        )}
      </div>
    );
  }

  return (
    <>
      {/* ── Desktop: Airbnb 5-image grid ── */}
      <div className="hidden md:grid md:grid-cols-4 md:grid-rows-2 md:gap-2 md:h-[480px]">
        {/* Hero — left half, spans 2 cols × 2 rows */}
        <div className="col-span-2 row-span-2 relative overflow-hidden rounded-xl bg-brand-50 cursor-pointer" onClick={() => handleClick(0)}>
          {display[0] && !failedImages.has(0) ? (
            <img
              src={display[0]}
              alt={`${alt} 1`}
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-200 hover:opacity-90"
              referrerPolicy="no-referrer"
              draggable={false}
              onError={() => handleError(0)}
            />
          ) : (
            <ImagePlaceholder size={48} />
          )}
        </div>

        {/* 4 smaller images — right 2×2 */}
        {display.slice(1).map((src, i) => {
          const index = i + 1;
          const failed = failedImages.has(index);
          const isLast = index === 4;

          return (
            <div key={index} className="relative overflow-hidden rounded-xl bg-brand-50 cursor-pointer" onClick={() => handleClick(index)}>
              {src && !failed ? (
                <img
                  src={src}
                  alt={`${alt} ${index + 1}`}
                  className="absolute inset-0 w-full h-full object-cover transition-opacity duration-200 hover:opacity-90"
                  referrerPolicy="no-referrer"
                  draggable={false}
                  onError={() => handleError(index)}
                />
              ) : (
                <ImagePlaceholder />
              )}
              {isLast && (
                <button
                  onClick={onShowAll}
                  className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-[10px] bg-white px-3 py-1.5 text-sm font-semibold text-ink shadow-[0_2px_8px_rgba(0,0,0,0.15)] transition-colors hover:bg-white/90 z-10"
                >
                  <GridIcon />
                  {t.showAllPhotos}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Mobile: horizontal snap scroll ── */}
      <div className="scrollbar-hide flex md:hidden gap-2 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4">
        {display.map((src, index) => {
          const failed = failedImages.has(index);
          const isLast = index === display.length - 1;

          return (
            <div key={index} className="relative flex-shrink-0 w-72 h-52 overflow-hidden rounded-xl snap-start bg-brand-50 cursor-pointer" onClick={() => handleClick(index)}>
              {src && !failed ? (
                <img
                  src={src}
                  alt={`${alt} ${index + 1}`}
                  className="absolute inset-0 w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  draggable={false}
                  onError={() => handleError(index)}
                />
              ) : (
                <ImagePlaceholder />
              )}
              {isLast && (
                <button
                  onClick={onShowAll}
                  className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-[10px] bg-white px-3 py-1.5 text-sm font-semibold text-ink shadow-[0_2px_8px_rgba(0,0,0,0.15)] transition-colors hover:bg-white/90 z-10"
                >
                  <GridIcon />
                  {t.showAllPhotos}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
