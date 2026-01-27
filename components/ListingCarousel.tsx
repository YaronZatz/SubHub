
import React, { useState, useMemo } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from './Icons';

interface ListingCarouselProps {
  id: string;
  images?: string[];
  aspectRatio?: string;
  className?: string;
}

const ListingCarousel: React.FC<ListingCarouselProps> = ({ 
  id, 
  images: customImages,
  aspectRatio = "aspect-[4/3]",
  className = "" 
}) => {
  const [index, setIndex] = useState(0);
  
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

  if (images.length === 0) return null;

  return (
    <div className={`relative group overflow-hidden ${aspectRatio} ${className}`}>
      {/* Image Slider */}
      <div 
        className="flex w-full h-full transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${index * 100}%)` }}
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
