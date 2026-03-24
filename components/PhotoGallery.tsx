"use client";

import { useState } from "react";

interface PhotoGalleryProps {
  images: string[];
  alt?: string;
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
  <div className="absolute inset-0 flex items-center justify-center text-slate-400 bg-slate-100">
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="m21 15-5-5L5 21" />
    </svg>
  </div>
);

export default function PhotoGallery({ images, alt = "Photo", onShowAll, onImageClick }: PhotoGalleryProps) {
  const handleClick = (index: number) => {
    if (onImageClick) onImageClick(index);
    else onShowAll?.();
  };
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set());

  const display = Array.from({ length: 5 }, (_, i) => images[i] ?? null);

  const handleError = (index: number) =>
    setFailedImages((prev) => new Set(prev).add(index));

  return (
    <>
      {/* ── Desktop: Airbnb 5-image grid ── */}
      <div className="hidden md:grid md:grid-cols-4 md:grid-rows-2 md:gap-2 md:h-[480px]">
        {/* Hero — left half, spans 2 cols × 2 rows */}
        <div className="col-span-2 row-span-2 relative overflow-hidden rounded-xl bg-slate-100 cursor-pointer" onClick={() => handleClick(0)}>
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
            <div key={index} className="relative overflow-hidden rounded-xl bg-slate-100 cursor-pointer" onClick={() => handleClick(index)}>
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
                  className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-lg border border-white/60 bg-white/70 px-3 py-1.5 text-sm font-medium text-gray-900 backdrop-blur-sm transition-colors hover:bg-white/90 z-10"
                >
                  <GridIcon />
                  Show all photos
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Mobile: horizontal snap scroll ── */}
      <div className="flex md:hidden gap-2 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4">
        {display.map((src, index) => {
          const failed = failedImages.has(index);
          const isLast = index === display.length - 1;

          return (
            <div key={index} className="relative flex-shrink-0 w-72 h-52 overflow-hidden rounded-xl snap-start bg-slate-100 cursor-pointer" onClick={() => handleClick(index)}>
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
                  className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-lg border border-white/60 bg-white/70 px-3 py-1.5 text-sm font-medium text-gray-900 backdrop-blur-sm transition-colors hover:bg-white/90 z-10"
                >
                  <GridIcon />
                  Show all photos
                </button>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
