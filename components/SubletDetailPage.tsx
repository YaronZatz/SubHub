
import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import L from 'leaflet';
import { Sublet, Language, ListingStatus } from '../types';
import { translations } from '../translations';
import { useCurrency } from '../contexts/CurrencyContext';
import { formatPrice, formatDate } from '../utils/formatters';
import { getActiveAmenities } from '../utils/amenityHelpers';
import { ExternalLinkIcon, InfoIcon, ChevronLeftIcon, ChevronRightIcon } from './Icons';
import { isDirectImageUrl, enhanceImageUrl } from '../utils/imageUtils';

const SWIPE_THRESHOLD = 50;

interface SubletDetailPageProps {
  sublet: Sublet;
  onClose: () => void;
  language: Language;
  currentUserId: string;
  onClaim: (id: string) => void;
  onEdit: (id: string) => void;
  onShowToast?: (message: string, type: 'success' | 'error') => void;
}

const SubletDetailPage: React.FC<SubletDetailPageProps> = ({ 
  sublet, 
  onClose, 
  language, 
  currentUserId, 
  onClaim, 
  onEdit,
  onShowToast
}) => {
  const t = translations[language];
  const isRTL = language === Language.HE;
  const isOwner = sublet.ownerId === currentUserId;
  const { currency } = useCurrency();
  const [activeImgIndex, setActiveImgIndex] = useState(0);
  const [touchDelta, setTouchDelta] = useState(0);
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set());
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isSwiping = useRef(false);
  const touchDeltaRef = useRef(0);
  const galleryRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const images = useMemo(() => {
    if (sublet.images && sublet.images.length > 0) {
      return sublet.images.filter(isDirectImageUrl).map(enhanceImageUrl);
    }
    return [];
  }, [sublet.id, sublet.images]);

  const amenities = getActiveAmenities(sublet);

  const nextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveImgIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveImgIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleGalleryTouchStart = useCallback((e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isSwiping.current = false;
    touchDeltaRef.current = 0;
    setTouchDelta(0);
  }, []);

  const handleGalleryTouchMove = useCallback((e: TouchEvent) => {
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
      const width = galleryRef.current?.offsetWidth ?? 400;
      const maxDrag = width * 0.4;
      const capped = Math.max(-maxDrag, Math.min(maxDrag, dx));
      touchDeltaRef.current = capped;
      setTouchDelta(capped);
    }
  }, []);

  const handleGalleryTouchEnd = useCallback(() => {
    const delta = touchDeltaRef.current;
    if (isSwiping.current && Math.abs(delta) > SWIPE_THRESHOLD) {
      if (delta < 0) {
        setActiveImgIndex((prev) => (prev + 1) % images.length);
      } else {
        setActiveImgIndex((prev) => (prev - 1 + images.length) % images.length);
      }
    }
    touchDeltaRef.current = 0;
    setTouchDelta(0);
    isSwiping.current = false;
  }, [images.length]);

  useEffect(() => {
    const el = galleryRef.current;
    if (!el) return;
    el.addEventListener('touchstart', handleGalleryTouchStart, { passive: true });
    el.addEventListener('touchmove', handleGalleryTouchMove, { passive: false });
    el.addEventListener('touchend', handleGalleryTouchEnd);
    el.addEventListener('touchcancel', handleGalleryTouchEnd);
    return () => {
      el.removeEventListener('touchstart', handleGalleryTouchStart);
      el.removeEventListener('touchmove', handleGalleryTouchMove);
      el.removeEventListener('touchend', handleGalleryTouchEnd);
      el.removeEventListener('touchcancel', handleGalleryTouchEnd);
    };
  }, [handleGalleryTouchStart, handleGalleryTouchMove, handleGalleryTouchEnd]);

  const handleImageError = useCallback((idx: number) => {
    setFailedImages(prev => new Set(prev).add(idx));
  }, []);

  // Map initialisation (runs when the listing has coordinates)
  useEffect(() => {
    if (!sublet.lat || !sublet.lng || !mapRef.current) return;
    if (mapInstanceRef.current) {
      try { mapInstanceRef.current.remove(); } catch (_) {}
      mapInstanceRef.current = null;
    }
    const map = L.map(mapRef.current, {
      zoomControl: false,
      scrollWheelZoom: false,
      dragging: true,
      touchZoom: true,
      doubleClickZoom: true,
    }).setView([sublet.lat, sublet.lng], 15);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Enable scroll zoom on click, disable again on mouseout (prevents hijacking page scroll)
    map.on('click', () => map.scrollWheelZoom.enable());
    map.on('mouseout', () => map.scrollWheelZoom.disable());

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 20,
    }).addTo(map);

    // Price-pill marker (same style as MapVisualizer)
    const RATES: Record<string, number> = { ILS: 1, USD: 0.27, EUR: 0.25 };
    const SYMBOLS: Record<string, string> = { ILS: '₪', USD: '$', EUR: '€' };
    const converted = Math.round(sublet.price * (RATES[currency] || 1));
    const priceStr = `${SYMBOLS[currency] || '₪'}${converted >= 1000 ? (converted / 1000).toFixed(1) + 'k' : converted}`;
    const pin = L.divIcon({
      className: 'custom-div-icon',
      html: `<div style="display:inline-flex;align-items:center;padding:5px 10px;background:#4f46e5;color:white;border-radius:99px;font-size:11px;font-weight:700;box-shadow:0 2px 8px rgba(0,0,0,0.25);border:2px solid white;white-space:nowrap;">${priceStr}</div>`,
      iconSize: [72, 28],
      iconAnchor: [36, 14],
    });
    L.marker([sublet.lat, sublet.lng], { icon: pin, interactive: false }).addTo(map);

    mapInstanceRef.current = map;
    return () => {
      if (mapInstanceRef.current) {
        try { mapInstanceRef.current.remove(); } catch (_) {}
        mapInstanceRef.current = null;
      }
    };
  }, [sublet.id, sublet.lat, sublet.lng, currency]);

  const isNew = (createdAt: number) => {
    const oneDay = 24 * 60 * 60 * 1000;
    return (Date.now() - createdAt) < oneDay;
  };

  const getHoursAgo = (createdAt: number) => {
    const diff = Date.now() - createdAt;
    return Math.max(0, Math.floor(diff / (60 * 60 * 1000)));
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}?id=${sublet.id}`;
    const shareData = {
      title: `${sublet.location} | SubHub`,
      text: `Check out this sublet in ${sublet.neighborhood || sublet.city}!`,
      url: shareUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareUrl);
        onShowToast?.("Link copied to clipboard!", "success");
      }
    } catch (err) {
      console.error("Share failed", err);
    }
  };

  return (
    <div className={`fixed inset-0 z-[100] bg-white overflow-y-auto ${isRTL ? 'font-sans' : ''} animate-in fade-in slide-in-from-right-4 duration-300`}>
      {/* Header Bar */}
      <div className="sticky top-0 bg-white/90 backdrop-blur-md border-b border-slate-100 z-[110] px-4 md:px-8 py-4 flex items-center justify-between">
        <button 
          onClick={onClose}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-semibold group transition-colors"
        >
          <ChevronLeftIcon className={`w-5 h-5 transition-transform group-hover:${isRTL ? 'translate-x-1' : '-translate-x-1'} ${isRTL ? 'rotate-180' : ''}`} />
          <span className="hidden sm:inline">Back</span>
        </button>
        
        <div className="flex gap-4">
          {isOwner && (
            <button 
              onClick={() => onEdit(sublet.id)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-full font-bold text-xs transition-all"
            >
              {t.edit}
            </button>
          )}
          <button 
            onClick={handleShare}
            className="text-slate-600 hover:text-slate-900 font-bold text-sm flex items-center gap-1.5 underline underline-offset-4"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            {t.share}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
        {/* Title & Status */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900">{sublet.location}</h1>
              {isNew(sublet.createdAt) && (
                <span className="bg-indigo-600 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5">
                   <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></span>
                   {t.addedXhAgo.replace('{x}', getHoursAgo(sublet.createdAt).toString())}
                </span>
              )}
            </div>
            <p className="text-slate-500 font-medium">{sublet.neighborhood || sublet.city}</p>
          </div>
          {sublet.status === ListingStatus.TAKEN && (
            <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-xs font-black uppercase self-start">{t.taken}</span>
          )}
        </div>

        {/* Responsive Image Gallery */}
        <div className="mb-8 space-y-3">
          {images.length === 0 && (
            <div className="aspect-[16/9] md:aspect-[21/9] w-full rounded-2xl overflow-hidden bg-slate-100 flex flex-col items-center justify-center gap-2 text-slate-400">
              <svg className="w-12 h-12 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-xs font-semibold uppercase tracking-widest opacity-50">No photos</span>
            </div>
          )}
          {/* Main Viewer + Thumbnail Strip — hidden when no images */}
          {images.length > 0 && <>
          <div
            ref={galleryRef}
            className="relative aspect-[16/9] md:aspect-[21/9] w-full rounded-2xl overflow-hidden bg-slate-100 group shadow-lg select-none touch-pan-y"
            style={{ touchAction: 'pan-y' }}
          >
            <div
              className="flex h-full w-full"
              style={{
                width: `${images.length * 100}%`,
                transform: `translateX(calc(-${activeImgIndex * (100 / images.length)}% + ${touchDelta}px))`,
                transition: touchDelta !== 0 ? 'none' : 'transform 0.3s ease-out',
              }}
            >
              {images.map((src, i) => (
                <div key={i} className="shrink-0 w-full h-full" style={{ flex: `0 0 ${100 / images.length}%` }}>
                  {failedImages.has(i) ? (
                    <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                      <svg className="w-10 h-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  ) : (
                    <img
                      src={src}
                      className="w-full h-full object-cover select-none"
                      alt={`View ${i + 1}`}
                      loading={i === 0 ? 'eager' : 'lazy'}
                      draggable={false}
                      referrerPolicy="no-referrer"
                      onError={() => handleImageError(i)}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Nav Arrows */}
            {images.length > 1 && (
              <>
                <button 
                  onClick={prevImage}
                  className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'right-4' : 'left-4'} p-2 rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/40 transition-all opacity-0 group-hover:opacity-100 active:scale-90 z-10`}
                >
                  <ChevronLeftIcon className="w-6 h-6" />
                </button>
                <button 
                  onClick={nextImage}
                  className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'left-4' : 'right-4'} p-2 rounded-full bg-white/20 backdrop-blur-md text-white hover:bg-white/40 transition-all opacity-0 group-hover:opacity-100 active:scale-90 z-10`}
                >
                  <ChevronRightIcon className="w-6 h-6" />
                </button>
              </>
            )}

            {/* Counter Overlay */}
            <div className="absolute bottom-4 right-4 bg-black/40 backdrop-blur-md text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest z-10">
              {activeImgIndex + 1} / {images.length}
            </div>
          </div>

          {/* Thumbnail Strip */}
          <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar snap-x no-scrollbar md:justify-center">
            {images.map((img, i) => (
              <button 
                key={i} 
                onClick={() => setActiveImgIndex(i)}
                className={`relative shrink-0 w-20 h-14 md:w-28 md:h-20 rounded-xl overflow-hidden border-2 transition-all snap-start
                  ${activeImgIndex === i ? 'border-indigo-600 ring-2 ring-indigo-600/20 shadow-md' : 'border-transparent opacity-60 hover:opacity-100'}
                `}
              >
                <img src={img.includes('base64') ? img : img.replace('1200/800', '300/200')} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.closest('button')?.classList.add('hidden'); }} />
              </button>
            ))}
          </div>
          </>}
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Left Column: Info */}
          <div className="lg:col-span-2 space-y-8">
            <div className="flex justify-between items-start border-b border-slate-100 pb-8">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-1">{t.hostInfo}</h2>
                <p className="text-slate-500 text-sm md:text-base">
                  {t.subletTypes[sublet.type]} • {sublet.neighborhood || sublet.city}
                </p>
                {!sublet.ownerId && (
                  <button 
                    onClick={() => onClaim(sublet.id)}
                    className="mt-3 text-blue-600 hover:text-blue-700 text-xs font-bold underline underline-offset-4"
                  >
                    {t.claimThis}
                  </button>
                )}
              </div>
              <div className="w-12 h-12 md:w-16 md:h-16 bg-slate-200 rounded-full flex items-center justify-center text-2xl shadow-inner">
                👤
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-lg font-bold text-slate-900">{t.description}</h3>
              <p className="text-slate-600 leading-relaxed whitespace-pre-wrap text-sm md:text-base">
                {sublet.originalText}
              </p>
            </div>

            {/* Location Map */}
            {(sublet.location || sublet.city || sublet.neighborhood) && (
              <div className="space-y-3 pt-8 border-t border-slate-100">
                <h3 className="text-lg font-bold text-slate-900">📍 Location</h3>

                {sublet.lat && sublet.lng ? (
                  <>
                    <style>{`
                      .leaflet-control-zoom { border: none !important; box-shadow: 0 2px 8px rgba(0,0,0,0.15) !important; border-radius: 10px !important; overflow: hidden; }
                      .leaflet-control-zoom a { border-radius: 0 !important; border: none !important; color: #1e293b !important; font-weight: bold !important; }
                    `}</style>
                    <div className="w-full h-[240px] rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                      <div ref={mapRef} className="w-full h-full" />
                    </div>
                    <a
                      href={`https://www.google.com/maps?q=${sublet.lat},${sublet.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-slate-400 hover:text-blue-600 underline cursor-pointer flex items-center gap-1 justify-end mt-1 transition-colors"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                      Open in Google Maps
                    </a>
                  </>
                ) : (
                  /* Text-only fallback when coordinates are not available */
                  <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <svg className="w-5 h-5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                    </svg>
                    <span className="text-sm text-slate-600">
                      {sublet.location || [sublet.neighborhood, sublet.city].filter(Boolean).join(', ')}
                    </span>
                  </div>
                )}

                <div className="flex flex-col gap-0.5">
                  {sublet.location && <p className="text-sm font-medium text-slate-700">{sublet.location}</p>}
                  {(sublet.neighborhood || sublet.city) && (
                    <p className="text-xs text-slate-400">{[sublet.neighborhood, sublet.city].filter(Boolean).join(', ')}</p>
                  )}
                  {sublet.country && <p className="text-xs text-slate-400">{sublet.country}</p>}
                </div>
              </div>
            )}

            {amenities.length > 0 && (
              <div className="space-y-6 pt-8 border-t border-slate-100">
                <h3 className="text-lg font-bold text-slate-900">{t.amenities}</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {amenities.map((item) => (
                    <div key={item.key} className="flex items-center gap-3 text-slate-700 p-3 bg-slate-50 rounded-2xl border border-slate-100 hover:border-slate-200 transition-colors">
                      <span className="text-xl">{item.icon}</span>
                      <span className="text-sm font-medium">{item.labelEn}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Sticky Booking Widget */}
          <div className="relative">
            <div className="lg:sticky lg:top-28 bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 md:p-8 space-y-6 animate-in slide-in-from-bottom-4 duration-500">
              <div className="space-y-1">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.totalPrice}</div>
                <div className="flex items-baseline gap-1 dir-ltr">
                  <span className="text-3xl font-black text-slate-900">
                    {formatPrice(sublet.price, currency, language, sublet.currency)}
                  </span>
                </div>
                <div className="pt-1">
                   <span className="px-2 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase rounded tracking-wider">
                    {t.subletTypes[sublet.type]}
                  </span>
                </div>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs shadow-sm">
                <div className="grid grid-cols-2 border-b border-slate-200">
                  <div className="p-4 border-r border-slate-200 bg-white">
                    <div className="font-black uppercase mb-1 text-slate-400 text-[9px] tracking-widest">{t.startDate}</div>
                    <div className="text-slate-900 font-bold">{formatDate(sublet.startDate)}</div>
                  </div>
                  <div className="p-4 bg-white">
                    <div className="font-black uppercase mb-1 text-slate-400 text-[9px] tracking-widest">{t.endDate}</div>
                    <div className="text-slate-900 font-bold">
                      {sublet.endDate ? formatDate(sublet.endDate) : t.flexible}
                    </div>
                  </div>
                </div>
              </div>

              {isOwner ? (
                <button 
                  onClick={() => onEdit(sublet.id)}
                  className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl shadow-lg active:scale-95 transition-all hover:bg-black uppercase tracking-widest text-sm"
                >
                  {t.edit}
                </button>
              ) : (
                sublet.sourceUrl ? (
                  <a 
                    href={sublet.sourceUrl} 
                    target="_blank" 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-blue-100 uppercase tracking-widest text-sm"
                  >
                    {t.contactHost}
                    <ExternalLinkIcon className="w-4 h-4" />
                  </a>
                ) : (
                  <button 
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-blue-100 uppercase tracking-widest text-sm"
                  >
                    Direct Listing - Contact Hidden
                  </button>
                )
              )}

              {/* Added Share Button */}
              <button 
                onClick={handleShare}
                className="w-full bg-white border-2 border-slate-100 hover:border-slate-300 text-slate-700 font-black py-3 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] uppercase tracking-widest text-xs"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                {t.share}
              </button>

              <div className="flex items-start gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="shrink-0 mt-0.5">
                  <InfoIcon className="w-5 h-5 text-indigo-400" />
                </div>
                <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                  {t.noCommission}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="h-20" />
    </div>
  );
};

export default SubletDetailPage;
