
import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from './Icons';

interface ListingCarouselProps {
  id: string;
  images?: string[];
  aspectRatio?: string;
  className?: string;
}

const SWIPE_THRESHOLD = 50;

const ListingCarousel: React.FC<ListingCarouselProps> = ({ 
  id, 
  images: customImages,
  aspectRatio = "aspect-[4/3]",
  className = "" 
}) => {
  const [index, setIndex] = useState(0);
  const [touchDelta, setTouchDelta] = useState(0);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isSwiping = useRef(false);
  const touchDeltaRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const images = useMemo(() => {
    if (customImages && customImages.length > 0) {
      return customImages;
    }
    return [
      `https://picsum.photos/seed/${id}-1/600/450`,
      `https://picsum.photos/seed/${id}-2/600/450`,
      `https://picsum.photos/seed/${id}-3/600/450`,
      `https://picsum.photos/seed/${id}-4/600/450`,
      `https://picsum.photos/seed/${id}-5/600/450`,
    ];
  }, [id, customImages]);

  const next = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIndex((prev) => (prev + 1) % images.length);
  };

  const prev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleTouchStart = useCallback((e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isSwiping.current = false;
    setTouchDelta(0);
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    const x = e.touches[0].clientX;
    const y = e.touches[0].clientY;
    const dx = x - touchStartX.current;
    const dy = y - touchStartY.current;

    if (!isSwiping.current) {
      const isHorizontal = Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10;
      if (isHorizontal) isSwiping.current = true;
    }
    if (isSwiping.current) {
      e.preventDefault();
      const width = containerRef.current?.offsetWidth ?? 300;
      const maxDrag = width * 0.4;
      const capped = Math.max(-maxDrag, Math.min(maxDrag, dx));
      touchDeltaRef.current = capped;
      setTouchDelta(capped);
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    const delta = touchDeltaRef.current;
    if (isSwiping.current && Math.abs(delta) > SWIPE_THRESHOLD) {
      if (delta < 0) {
        setIndex((prev) => (prev + 1) % images.length);
      } else {
        setIndex((prev) => (prev - 1 + images.length) % images.length);
      }
    }
    touchDeltaRef.current = 0;
    setTouchDelta(0);
    isSwiping.current = false;
  }, [images.length]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd);
    el.addEventListener('touchcancel', handleTouchEnd);
    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
      el.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  if (images.length === 0) return null;

  const trackStyle = {
    transform: `translateX(calc(-${index * 100}% + ${touchDelta}px))`,
    transition: touchDelta !== 0 ? 'none' : 'transform 0.3s ease-out',
  };

  return (
    <div
      ref={containerRef}
      className={`relative group overflow-hidden touch-pan-y ${aspectRatio} ${className}`}
      style={{ touchAction: 'pan-y' }}
    >
      {/* Image Slider */}
      <div 
        className="flex w-full h-full select-none"
        style={trackStyle}
      >
        {images.map((src, i) => (
          <img 
            key={i}
            src={src}
            className="w-full h-full object-cover shrink-0 select-none"
            alt={`Sublet view ${i + 1}`}
            loading="lazy"
          />
        ))}
      </div>

      {/* Navigation Controls */}
      {images.length > 1 && (
        <>
          <button 
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white/70 backdrop-blur-md text-slate-800 opacity-0 group-hover:opacity-100 transition-all hover:bg-white active:scale-90 z-10 shadow-sm"
          >
            <ChevronLeftIcon className="w-4 h-4" />
          </button>
          <button 
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-white/70 backdrop-blur-md text-slate-800 opacity-0 group-hover:opacity-100 transition-all hover:bg-white active:scale-90 z-10 shadow-sm"
          >
            <ChevronRightIcon className="w-4 h-4" />
          </button>

          {/* Progress Dots */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {images.map((_, i) => (
              <div 
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 shadow-sm
                  ${index === i ? 'w-4 bg-white' : 'w-1.5 bg-white/50'}
                `}
              />
            ))}
          </div>
        </>
      )}

      {/* Badge */}
      <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-md text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest z-10">
        {index + 1} / {images.length}
      </div>
    </div>
  );
};

export default ListingCarousel;
