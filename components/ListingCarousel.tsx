import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from './Icons';

interface ListingCarouselProps {
  id: string;
  images?: string[];
  sourceUrl?: string;
  photoCount?: number;
  aspectRatio?: string;
  className?: string;
}

const SWIPE_THRESHOLD = 50;

/** Attempt to get a higher-resolution version of a Facebook CDN image URL. */
function enhanceImageUrl(url: string): string {
  if (!url) return url;
  let u = url;
  u = u.replace(/\/s\d+x\d+\//, '/s1080x1080/');
  u = u.replace(/\/p\d+x\d+\//, '/p1080x1080/');
  u = u.replace(/\/c\d+\.\d+\.\d+\.\d+\//, '/');
  return u;
}

/**
 * Check if a URL is a direct image URL that can be rendered in an <img> tag.
 * Facebook photo page URLs (facebook.com/photo.php?fbid=...) are NOT direct images.
 * Direct image URLs from Facebook CDN start with scontent*.fbcdn.net
 */
function isDirectImageUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const lower = url.toLowerCase();
  // Facebook CDN direct images
  if (lower.includes('scontent') && lower.includes('fbcdn.net')) return true;
  // Common image extensions
  if (/\.(jpg|jpeg|png|gif|webp|avif|svg)(\?|$)/i.test(url)) return true;
  // Known image hosting services
  if (lower.includes('picsum.photos')) return true;
  if (lower.includes('unsplash.com')) return true;
  if (lower.includes('cloudinary.com')) return true;
  if (lower.includes('imgur.com')) return true;
  if (lower.includes('firebasestorage.googleapis.com')) return true;
  // Reject Facebook photo page URLs
  if (lower.includes('facebook.com/photo')) return false;
  if (lower.includes('facebook.com/groups')) return false;
  // Allow other URLs that look like they might be images (external hosting)
  if (lower.startsWith('https://') || lower.startsWith('http://')) return true;
  return false;
}

/** Generate a deterministic color from a string */
function hashColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 45%, 55%)`;
}

const PLACEHOLDER_ICONS = [
  // House/Home icon
  'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  // Building icon
  'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
  // Key icon
  'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z',
];

const ListingCarousel: React.FC<ListingCarouselProps> = ({ 
  id, 
  images: customImages,
  sourceUrl,
  photoCount = 0,
  aspectRatio = "aspect-[4/3]",
  className = "" 
}) => {
  const [index, setIndex] = useState(0);
  const [touchDelta, setTouchDelta] = useState(0);
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set());
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isSwiping = useRef(false);
  const touchDeltaRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const images = useMemo(() => {
    if (customImages && customImages.length > 0) {
      const directImages = customImages.filter(isDirectImageUrl).map(enhanceImageUrl);
      if (directImages.length > 0) return directImages;
    }
    return [];
  }, [id, customImages]);

  const hasImages = images.length > 0;

  const next = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!hasImages) return;
    setIndex((prev) => (prev + 1) % images.length);
  };

  const prev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!hasImages) return;
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

  const handleImageError = useCallback((imgIndex: number) => {
    setFailedImages(prev => new Set(prev).add(imgIndex));
  }, []);

  // Placeholder for when no valid images are available
  if (!hasImages) {
    const color1 = hashColor(id);
    const color2 = hashColor(id + '-2');
    const iconPath = PLACEHOLDER_ICONS[Math.abs(id.split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % PLACEHOLDER_ICONS.length];

    const handleViewPhotos = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (sourceUrl) {
        window.open(sourceUrl, '_blank', 'noopener');
      }
    };

    return (
      <div
        ref={containerRef}
        className={`relative overflow-hidden ${aspectRatio} ${className}`}
        style={{
          background: `linear-gradient(135deg, ${color1}, ${color2})`,
        }}
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white/80">
          <svg className="w-12 h-12 mb-2 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d={iconPath} />
          </svg>
          {photoCount > 0 && sourceUrl ? (
            <button
              onClick={handleViewPhotos}
              className="mt-1 flex items-center gap-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full transition-all active:scale-95"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {photoCount} photo{photoCount !== 1 ? 's' : ''} on Facebook
            </button>
          ) : sourceUrl ? (
            <button
              onClick={handleViewPhotos}
              className="mt-1 flex items-center gap-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white text-xs font-bold px-3 py-1.5 rounded-full transition-all active:scale-95"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              View on Facebook
            </button>
          ) : (
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">No photos</span>
          )}
        </div>
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '20px 20px',
        }} />
      </div>
    );
  }

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
          failedImages.has(i) ? (
            <div
              key={i}
              className="w-full h-full shrink-0 flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${hashColor(id)}, ${hashColor(id + '-2')})` }}
            >
              <svg className="w-10 h-10 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          ) : (
            <img
              key={i}
              src={src}
              className="w-full h-full object-cover shrink-0 select-none"
              alt={`Sublet view ${i + 1}`}
              loading="lazy"
              referrerPolicy="no-referrer"
              onError={() => handleImageError(i)}
            />
          )
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
      {images.length > 1 && (
        <div className="absolute top-3 right-3 bg-black/40 backdrop-blur-md text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest z-10">
          {index + 1} / {images.length}
        </div>
      )}
    </div>
  );
};

export default ListingCarousel;
