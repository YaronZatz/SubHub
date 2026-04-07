
import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import { importLibrary } from '../lib/googleMapsLoader';
import { Sublet, Language, ListingStatus } from '../types';
import { translations } from '../translations';
import { useCurrency } from '../contexts/CurrencyContext';
import { formatPrice, formatDate } from '../utils/formatters';
import { getActiveAmenities } from '../utils/amenityHelpers';
import { ExternalLinkIcon, InfoIcon, ChevronLeftIcon, ChevronRightIcon } from './Icons';
import { TranslatedText } from './TranslatedText';
import LanguageSwitcher from './LanguageSwitcher';
import { isDirectImageUrl, enhanceImageUrl } from '../utils/imageUtils';
import PhotoGallery from './PhotoGallery';

const SWIPE_THRESHOLD = 50;

interface SubletDetailPageProps {
  sublet: Sublet;
  onClose: () => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  currentUserId: string;
  onClaim: (id: string) => void;
  onEdit: (id: string) => void;
  onShowToast?: (message: string, type: 'success' | 'error') => void;
}

const SubletDetailPage: React.FC<SubletDetailPageProps> = ({
  sublet,
  onClose,
  language,
  setLanguage,
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
  const [showLightbox, setShowLightbox] = useState(false);
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
    const container = mapRef.current;
    let cancelled = false;

    // Destroy previous map instance if any
    if (mapInstanceRef.current) {
      mapInstanceRef.current = null;
    }

    (async () => {
      const { Map } = await importLibrary('maps') as google.maps.MapsLibrary;
      if (cancelled || !container) return;

      const map = new Map(container, {
        center: { lat: sublet.lat, lng: sublet.lng },
        zoom: 15,
        mapTypeId: 'roadmap',
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        gestureHandling: 'cooperative',
      });

      // Price-pill marker (same style as MapVisualizer)
      const RATES: Record<string, number> = { ILS: 1, USD: 0.27, EUR: 0.25 };
      const SYMBOLS: Record<string, string> = { ILS: '₪', USD: '$', EUR: '€' };
      const converted = Math.round(sublet.price * (RATES[currency] || 1));
      const priceStr = `${SYMBOLS[currency] || '₪'}${converted >= 1000 ? (converted / 1000).toFixed(1) + 'k' : converted}`;

      const pin = new google.maps.OverlayView() as google.maps.OverlayView & { _div: HTMLDivElement | null };
      pin._div = null;
      pin.onAdd = function () {
        const div = document.createElement('div');
        div.style.cssText = 'position:absolute;transform:translate(-50%,-50%);pointer-events:none';
        div.innerHTML = `<div style="display:inline-flex;align-items:center;padding:5px 10px;background:#3382C9;color:white;border-radius:99px;font-size:11px;font-weight:700;box-shadow:0 2px 8px rgba(0,0,0,0.25);border:2px solid white;white-space:nowrap;">${priceStr}</div>`;
        this._div = div;
        this.getPanes()!.floatPane.appendChild(div);
      };
      pin.draw = function () {
        const pos = this.getProjection().fromLatLngToDivPixel(new google.maps.LatLng(sublet.lat, sublet.lng))!;
        if (this._div) { this._div.style.left = `${pos.x}px`; this._div.style.top = `${pos.y}px`; }
      };
      pin.onRemove = function () { this._div?.parentNode?.removeChild(this._div); this._div = null; };
      pin.setMap(map);

      mapInstanceRef.current = map;
    })();

    return () => {
      cancelled = true;
      mapInstanceRef.current = null;
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
        
        <div className="flex items-center gap-3">
          <LanguageSwitcher language={language} setLanguage={setLanguage} />
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
                <span className="bg-cyan-600 text-white text-[10px] font-black px-3 py-1 rounded-full shadow-lg flex items-center gap-1.5">
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

        {/* Property Highlights */}
        {(() => {
          const rooms = sublet.parsedRooms || sublet.rooms;
          const pa = sublet.parsedAmenities;
          const ad = sublet.apartment_details;
          const highlights: { icon: React.ReactNode; label: string }[] = [];

          // Type / Rooms
          if (rooms?.isStudio) {
            highlights.push({
              icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" /></svg>,
              label: 'Studio',
            });
          } else if (rooms?.bedrooms || rooms?.totalRooms || ad?.rooms_count) {
            const count = rooms?.bedrooms || rooms?.totalRooms || ad?.rooms_count || 0;
            highlights.push({
              icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" /></svg>,
              label: `${count} Room${count > 1 ? 's' : ''}`,
            });
          }

          // Bathrooms
          if (rooms?.bathrooms) {
            highlights.push({
              icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" /></svg>,
              label: `${rooms.bathrooms} Bath${rooms.bathrooms > 1 ? 's' : ''}`,
            });
          }

          // Floor area
          if (rooms?.floorArea) {
            highlights.push({
              icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" /></svg>,
              label: `${rooms.floorArea} ${rooms.floorAreaUnit || t.sqm}`,
            });
          }

          // Pet Friendly
          if (pa?.petFriendly || ad?.is_pet_friendly) {
            highlights.push({
              icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.633 10.25c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75 2.25 2.25 0 012.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282m0 0h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23H5.904m7.594-4.5v-4.5" /></svg>,
              label: t.amenityPetFriendly,
            });
          }

          if (highlights.length === 0) return null;

          return (
            <div className="flex flex-wrap gap-3 mb-6">
              {highlights.map((h, i) => (
                <div key={i} className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 rounded-xl text-slate-700 bg-white">
                  <span className="text-[#2F6EA8]">{h.icon}</span>
                  <span className="text-sm font-semibold">{h.label}</span>
                </div>
              ))}
            </div>
          );
        })()}

        {/* Airbnb-style Photo Gallery */}
        <div className="mb-8">
          {images.length === 0 ? (
            <div className="aspect-[16/9] md:aspect-[21/9] w-full rounded-2xl overflow-hidden bg-slate-100 flex flex-col items-center justify-center gap-2 text-slate-400">
              <svg className="w-12 h-12 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-xs font-semibold uppercase tracking-widest opacity-50">No photos</span>
            </div>
          ) : (
            <PhotoGallery
              images={images}
              alt={sublet.location}
              onShowAll={() => { setActiveImgIndex(0); setShowLightbox(true); }}
            />
          )}
        </div>

        {/* Lightbox — fullscreen swipe carousel */}
        {showLightbox && images.length > 0 && (
          <div className="fixed inset-0 z-[200] bg-black/95 flex flex-col">
            {/* Lightbox header */}
            <div className="flex items-center justify-between px-4 py-3 shrink-0">
              <button
                onClick={() => setShowLightbox(false)}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <span className="text-white/70 text-sm font-medium">{activeImgIndex + 1} / {images.length}</span>
              <div className="w-9" />
            </div>

            {/* Main image */}
            <div
              ref={galleryRef}
              className="flex-1 relative overflow-hidden select-none"
              style={{ touchAction: 'pan-y' }}
            >
              <div
                className="flex h-full"
                style={{
                  width: `${images.length * 100}%`,
                  transform: `translateX(calc(-${activeImgIndex * (100 / images.length)}% + ${touchDelta}px))`,
                  transition: touchDelta !== 0 ? 'none' : 'transform 0.3s ease-out',
                }}
              >
                {images.map((src, i) => (
                  <div key={i} className="shrink-0 h-full flex items-center justify-center" style={{ flex: `0 0 ${100 / images.length}%` }}>
                    {failedImages.has(i) ? (
                      <div className="flex items-center justify-center text-white/30">
                        <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    ) : (
                      <img
                        src={src}
                        className="max-h-full max-w-full object-contain select-none"
                        alt={`${sublet.location} ${i + 1}`}
                        loading={i === 0 ? 'eager' : 'lazy'}
                        draggable={false}
                        referrerPolicy="no-referrer"
                        onError={() => handleImageError(i)}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Prev/Next arrows */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute top-1/2 -translate-y-1/2 left-4 p-2 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors"
                  >
                    <ChevronLeftIcon className="w-6 h-6" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute top-1/2 -translate-y-1/2 right-4 p-2 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors"
                  >
                    <ChevronRightIcon className="w-6 h-6" />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnail strip */}
            <div className="flex gap-2 overflow-x-auto px-4 py-3 shrink-0 no-scrollbar snap-x">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImgIndex(i)}
                  className={`relative shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-all snap-start
                    ${activeImgIndex === i ? 'border-white shadow-md' : 'border-transparent opacity-50 hover:opacity-80'}
                  `}
                >
                  <img src={img} className="w-full h-full object-cover" alt="" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.closest('button')?.classList.add('hidden'); }} />
                </button>
              ))}
            </div>
          </div>
        )}

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
                    className="mt-3 text-cyan-600 hover:text-cyan-700 text-xs font-bold underline underline-offset-4"
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
              <TranslatedText text={sublet.originalText} language={language} />
            </div>

            {/* Location Map */}
            {(sublet.location || sublet.city || sublet.neighborhood) && (
              <div className="space-y-3 pt-8 border-t border-slate-100">
                <h3 className="text-lg font-bold text-slate-900">📍 Location</h3>

                {sublet.lat && sublet.lng ? (
                  <>
                    <div className="w-full h-[240px] rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
                      <div ref={mapRef} className="w-full h-full" />
                    </div>
                    <a
                      href={`https://www.google.com/maps?q=${sublet.lat},${sublet.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-slate-400 hover:text-cyan-600 underline cursor-pointer flex items-center gap-1 justify-end mt-1 transition-colors"
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
                   <span className="px-2 py-1 bg-cyan-50 text-cyan-600 text-[10px] font-black uppercase rounded tracking-wider">
                    {t.subletTypes[sublet.type]}
                  </span>
                </div>
              </div>

              {(formatDate(sublet.startDate) || formatDate(sublet.endDate)) && (
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
              )}

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
                    className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-cyan-100 uppercase tracking-widest text-sm"
                  >
                    {t.contactHost}
                    <ExternalLinkIcon className="w-4 h-4" />
                  </a>
                ) : (
                  <button 
                    className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-cyan-100 uppercase tracking-widest text-sm"
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
                  <InfoIcon className="w-5 h-5 text-cyan-400" />
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
