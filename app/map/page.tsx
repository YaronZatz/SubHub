'use client';

import React, {
  useState, useMemo, useEffect, useRef, useCallback,
} from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import WebNavbar from '@/components/web/WebNavbar';
import PlatformWrapper from '@/components/shared/PlatformWrapper';
import MapScreen from '@/components/mobile/MapScreen';
import ListingCarousel from '@/components/ListingCarousel';
import SearchAutocomplete from '@/components/SearchAutocomplete';
import AuthModal from '@/components/shared/AuthModal';
import Toast from '@/components/shared/Toast';
import { persistenceService } from '@/services/persistenceService';
import { useAuth } from '@/contexts/AuthContext';
import { useSaved } from '@/contexts/SavedContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { translations } from '@/translations';
import { formatPrice, formatDate } from '@/utils/formatters';
import {
  Sublet, Filters, ListingStatus, SubletType,
  DateMode, RentTerm, Language,
} from '@/types';
import { CITY_CENTERS } from '@/constants';

const MapVisualizer = dynamic(
  () => import('@/components/MapVisualizer'),
  { ssr: false },
);

// ─── Constants ────────────────────────────────────────────────────────────────

const SHORT_TERM_DAYS = 183;

const INITIAL_FILTERS: Filters = {
  minPrice: 0,
  maxPrice: 30000,
  showTaken: false,
  type: undefined,
  city: '',
  neighborhood: '',
  startDate: '',
  endDate: '',
  dateMode: DateMode.FLEXIBLE,
  petsAllowed: false,
  onlyWithPrice: true,
  rentTerm: RentTerm.ALL,
  postedWithin: 'all',
  minRooms: undefined,
  maxRooms: undefined,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getListingDurationDays(s: Sublet): number | null {
  const start = s.startDate && /^\d{4}-\d{2}-\d{2}$/.test(s.startDate)
    ? new Date(s.startDate).getTime() : null;
  const end = s.endDate && /^\d{4}-\d{2}-\d{2}$/.test(s.endDate)
    ? new Date(s.endDate).getTime() : null;
  if (start != null && end != null && end >= start)
    return Math.round((end - start) / (24 * 60 * 60 * 1000));
  return null;
}

function getBedroomCount(s: Sublet): number | null {
  return s.parsedRooms?.bedrooms ?? s.rooms?.bedrooms ?? null;
}

function getCardTitle(s: Sublet): string {
  const parts = [s.neighborhood, s.city].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : (s.location || 'Unknown location');
}

function getDateRange(s: Sublet): string {
  const start = s.startDate ? formatDate(s.startDate) : '';
  const end = s.endDate ? formatDate(s.endDate) : '';
  if (start && end) return `${start} – ${end}`;
  if (start) return `From ${start}`;
  if (s.immediateAvailability) return 'Available now';
  return '';
}

// ─── Price Slider (dual-thumb) ────────────────────────────────────────────────

const PRICE_MAX = 30000;
const PRICE_STEP = 1000;
const AMENITY_FILTER_KEYS: Array<keyof NonNullable<Filters['amenities']>> = [
  'furnished', 'wifi', 'ac', 'washer', 'petFriendly', 'parking', 'kitchen', 'balcony',
];

function PriceSlider({ minVal, maxVal, onChange }: {
  minVal: number; maxVal: number; onChange: (min: number, max: number) => void;
}) {
  const minPct = (minVal / PRICE_MAX) * 100;
  const maxPct = (maxVal / PRICE_MAX) * 100;
  const inputCls = [
    'absolute inset-0 w-full h-full appearance-none bg-transparent cursor-pointer pointer-events-none',
    '[&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none',
    '[&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:rounded-full',
    '[&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[#4A7CC7]',
    '[&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-runnable-track]:bg-transparent',
    '[&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5',
    '[&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2',
    '[&::-moz-range-thumb]:border-[#4A7CC7] [&::-moz-range-thumb]:shadow-md [&::-moz-range-track]:bg-transparent',
  ].join(' ');
  return (
    <div className="relative h-5 mt-2">
      <div className="absolute top-1/2 -translate-y-1/2 w-full h-1.5 bg-slate-200 rounded-full pointer-events-none">
        <div className="absolute h-full bg-[#4A7CC7] rounded-full" style={{ left: `${minPct}%`, right: `${100 - maxPct}%` }} />
      </div>
      <input type="range" min={0} max={PRICE_MAX} step={PRICE_STEP} value={minVal}
        onChange={e => { const v = +e.target.value; if (v < maxVal) onChange(v, maxVal); }}
        className={inputCls} />
      <input type="range" min={0} max={PRICE_MAX} step={PRICE_STEP} value={maxVal}
        onChange={e => { const v = +e.target.value; if (v > minVal) onChange(minVal, v); }}
        className={inputCls} />
    </div>
  );
}

// ─── Filters Drawer ────────────────────────────────────────────────────────────

function FiltersDrawer({ open, onClose, filters, onFiltersChange, onClear, resultCount }: {
  open: boolean; onClose: () => void; filters: Filters;
  onFiltersChange: (f: Filters) => void; onClear: () => void; resultCount: number;
}) {
  const { language } = useLanguage();
  const t = translations[language];
  const set = useCallback(
    (patch: Partial<Filters>) => onFiltersChange({ ...filters, ...patch }),
    [filters, onFiltersChange],
  );
  const setAmenity = useCallback(
    (key: keyof NonNullable<Filters['amenities']>, val: boolean) =>
      onFiltersChange({ ...filters, amenities: { ...filters.amenities, [key]: val } }),
    [filters, onFiltersChange],
  );

  const sLabel = 'text-xs font-bold uppercase tracking-widest text-slate-500';
  const iconBtnCls = (active: boolean) =>
    `flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all cursor-pointer select-none ${
      active ? 'border-[#4A7CC7] bg-[#4A7CC7]/5 text-[#4A7CC7]' : 'border-slate-200 text-slate-600 hover:border-slate-300'
    }`;
  const pillCls = (active: boolean) =>
    `whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 ${
      active ? 'bg-[#4A7CC7] text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
    }`;

  return (
    <>
      {open && <div className="fixed inset-0 bg-slate-900/40 z-[55] backdrop-blur-[2px]" onClick={onClose} />}
      <aside className={`fixed top-0 right-0 bottom-0 z-[60] w-[480px] max-w-full bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${open ? 'translate-x-0' : 'translate-x-full'}`}>

        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">{t.filters}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8" style={{ scrollbarWidth: 'none' }}>

          {/* Price Range */}
          <section className="space-y-4">
            <div className="flex justify-between items-end">
              <span className={sLabel}>{t.priceRange}</span>
              <span className="text-sm font-semibold text-[#4A7CC7]">
                ₪{filters.minPrice.toLocaleString()} — {filters.maxPrice >= PRICE_MAX ? '₪30k+' : `₪${filters.maxPrice.toLocaleString()}`}
              </span>
            </div>
            <PriceSlider minVal={filters.minPrice} maxVal={filters.maxPrice} onChange={(min, max) => set({ minPrice: min, maxPrice: max })} />
          </section>

          {/* Rental Duration */}
          <section className="space-y-4">
            <span className={sLabel}>{t.rentTermLabel}</span>
            <div className="grid grid-cols-3 gap-3">
              {([
                { value: RentTerm.ALL, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
                { value: RentTerm.SHORT_TERM, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
                { value: RentTerm.LONG_TERM, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg> },
              ] as const).map(opt => (
                <button key={opt.value} onClick={() => set({ rentTerm: opt.value })} className={iconBtnCls((filters.rentTerm ?? RentTerm.ALL) === opt.value)}>
                  {opt.icon}<span className="text-xs font-semibold">{t.rentTerms[opt.value]}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Property Type */}
          <section className="space-y-4">
            <span className={sLabel}>{t.type}</span>
            <div className="grid grid-cols-3 gap-3">
              {([
                { value: SubletType.ENTIRE, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg> },
                { value: SubletType.ROOMMATE, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
                { value: SubletType.STUDIO, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" /></svg> },
              ] as const).map(opt => (
                <button key={opt.value} onClick={() => set({ type: filters.type === opt.value ? undefined : opt.value })} className={iconBtnCls(filters.type === opt.value)}>
                  {opt.icon}<span className="text-xs font-semibold">{t.subletTypes[opt.value]}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Bedrooms */}
          <section className="space-y-4">
            <span className={sLabel}>{t.bedrooms}</span>
            <div className="flex gap-2 flex-wrap">
              {([{ label: t.anyRooms, value: undefined as number | undefined }, { label: '1+', value: 1 }, { label: '2+', value: 2 }, { label: '3+', value: 3 }, { label: '4+', value: 4 }]).map(opt => (
                <button key={opt.label} onClick={() => set({ minRooms: opt.value })}
                  className={`px-5 py-2 rounded-full text-sm font-semibold border-2 transition-all ${filters.minRooms === opt.value ? 'border-[#4A7CC7] bg-[#4A7CC7]/5 text-[#4A7CC7]' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </section>

          {/* Move-in Date */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <span className={sLabel}>{t.moveInDate}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium">{t.flexible}</span>
                <button
                  onClick={() => set({ dateMode: filters.dateMode === DateMode.FLEXIBLE ? DateMode.EXACT : DateMode.FLEXIBLE })}
                  className={`relative w-11 h-6 rounded-full transition-colors ${filters.dateMode === DateMode.FLEXIBLE ? 'bg-[#4A7CC7]' : 'bg-slate-200'}`}
                >
                  <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-200 ${filters.dateMode === DateMode.FLEXIBLE ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-100 border-2 border-transparent focus-within:border-[#4A7CC7] transition-all">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{t.start}</p>
                <input type="date" value={filters.startDate || ''} onChange={e => set({ startDate: e.target.value })}
                  className="bg-transparent border-none p-0 text-sm font-semibold text-slate-900 focus:ring-0 w-full" />
              </div>
              <div className="p-3 rounded-xl bg-slate-100 border-2 border-transparent focus-within:border-[#4A7CC7] transition-all">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{t.end}</p>
                <input type="date" value={filters.endDate || ''} onChange={e => set({ endDate: e.target.value })}
                  className="bg-transparent border-none p-0 text-sm font-semibold text-slate-900 focus:ring-0 w-full" />
              </div>
            </div>
          </section>

          {/* Posted Within */}
          <section className="space-y-4">
            <span className={sLabel}>{t.postedWithin}</span>
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {([{ label: t.postedWithinAll, value: 'all' }, { label: t.postedWithin1h, value: '1h' }, { label: t.postedWithin24h, value: '24h' }, { label: t.postedWithin7d, value: '7d' }, { label: t.postedWithin30d, value: '30d' }]).map(opt => (
                <button key={opt.value} onClick={() => set({ postedWithin: opt.value })} className={pillCls((filters.postedWithin ?? 'all') === opt.value)}>
                  {opt.label}
                </button>
              ))}
            </div>
          </section>

          {/* Post Quality */}
          <section className="space-y-4">
            <span className={sLabel}>{t.postQuality}</span>
            <button onClick={() => set({ onlyWithPrice: !filters.onlyWithPrice })}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 text-sm font-bold transition-all w-full ${filters.onlyWithPrice ? 'border-[#4A7CC7] bg-[#4A7CC7]/5 text-[#4A7CC7]' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}>
              <span>💰</span> {t.onlyWithPrice}
            </button>
          </section>

          {/* Amenities */}
          <section className="space-y-4">
            <span className={sLabel}>{t.amenities}</span>
            <div className="grid grid-cols-2 gap-y-3.5 gap-x-6">
              {([
                { key: 'furnished', label: t.amenityFurnished }, { key: 'wifi', label: t.amenityWifi },
                { key: 'washer', label: t.amenityWasher }, { key: 'ac', label: t.amenityAC },
                { key: 'petFriendly', label: t.amenityPetFriendly }, { key: 'parking', label: t.amenityParking },
                { key: 'kitchen', label: t.amenityKitchen }, { key: 'balcony', label: t.amenityBalcony },
              ] as Array<{ key: keyof NonNullable<Filters['amenities']>; label: string }>).map(opt => (
                <label key={opt.key} className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" checked={!!(filters.amenities?.[opt.key])} onChange={e => setAmenity(opt.key, e.target.checked)}
                    className="w-5 h-5 rounded border-slate-300 text-[#4A7CC7] focus:ring-[#4A7CC7]/20 cursor-pointer" />
                  <span className="text-sm text-slate-700 font-medium group-hover:text-[#4A7CC7] transition-colors">{opt.label}</span>
                </label>
              ))}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button onClick={onClear} className="text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors">
            {t.clearAll}
          </button>
          <button onClick={onClose} className="flex items-center gap-2 px-7 py-3.5 bg-[#4A7CC7] text-white rounded-xl font-bold text-sm shadow-lg shadow-[#4A7CC7]/25 hover:bg-[#3b66a6] transition-all active:scale-95">
            {t.showResults.replace('{n}', resultCount.toLocaleString())}
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
          </button>
        </div>
      </aside>
    </>
  );
}

// ─── Listing Card ─────────────────────────────────────────────────────────────

interface WebMapSavedState {
  filters: Filters;
  searchQuery: string;
  selectedSubletId: string | undefined;
  cityFlyTo: { lat: number; lng: number; zoom?: number } | null;
}

interface ListingCardProps {
  sublet: Sublet;
  isSelected: boolean;
  isSaved: boolean;
  currency: string;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onSave: (e: React.MouseEvent) => void;
  onNavigate: () => void;
}

const ListingCard = React.forwardRef<HTMLDivElement, ListingCardProps>(
  ({ sublet: s, isSelected, isSaved, currency, onMouseEnter, onMouseLeave, onSave, onNavigate }, ref) => {
    const beds = getBedroomCount(s);
    const baths = (s as any).parsedRooms?.bathrooms ?? (s as any).rooms?.bathrooms ?? null;
    const dateRange = getDateRange(s);
    const hasAI = !!(s.ai_summary || s.parsedAmenities || s.parsedRooms || s.rooms);
    const isTaken = s.status === ListingStatus.TAKEN;
    const postTs = s.postedAt ? (new Date(s.postedAt).getTime() || s.createdAt) : s.createdAt;
    const hoursAgo = Math.max(0, Math.floor((Date.now() - postTs) / (60 * 60 * 1000)));
    const daysAgo = Math.max(1, Math.floor(hoursAgo / 24));
    const isNew = hoursAgo < 24;

    return (
      <div
        ref={ref}
        className={`group relative rounded-2xl overflow-hidden transition-all duration-300 cursor-pointer
          ${isSelected
            ? 'shadow-xl shadow-[#4A7CC7]/25 ring-2 ring-[#4A7CC7] scale-[1.01]'
            : 'shadow-sm hover:shadow-xl hover:-translate-y-0.5'
          }
          ${isTaken ? 'opacity-55' : ''}`}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <Link href={`/listing/${s.id}`} className="block" onClick={onNavigate}>

          {/* Photo with gradient overlay */}
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
            <ListingCarousel
              id={s.id}
              images={s.images}
              sourceUrl={s.sourceUrl}
              photoCount={s.photoCount}
              aspectRatio="aspect-[4/3]"
            />

            {/* Gradient scrim — subtle top fade only for badge readability */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-transparent pointer-events-none z-10" />

            {/* AI badge — top left */}
            {hasAI && (
              <div className="absolute top-2.5 left-2.5 z-20 flex items-center gap-1 bg-[#F5831F] text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest shadow pointer-events-none">
                <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z"/></svg>
                AI Parsed
              </div>
            )}

            {/* Time-ago badge — bottom left */}
            {isNew ? (
              <div className="absolute bottom-2.5 left-2.5 z-20 flex items-center gap-1 bg-cyan-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg animate-pulse ring-2 ring-cyan-100 pointer-events-none">
                <span className="w-1 h-1 bg-white rounded-full" />
                Added {hoursAgo}h ago
              </div>
            ) : (
              <div className="absolute bottom-2.5 left-2.5 z-20 bg-slate-500/80 text-white text-[9px] font-bold px-2 py-0.5 rounded-full pointer-events-none">
                Added {daysAgo > 30 ? '30+' : daysAgo}d ago
              </div>
            )}

            {/* Taken overlay */}
            {isTaken && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-20 pointer-events-none">
                <span className="bg-white/10 backdrop-blur-sm border border-white/30 text-white text-xs font-bold px-4 py-1.5 rounded-full tracking-wide">
                  Taken
                </span>
              </div>
            )}

          </div>

          {/* Below-photo details */}
          <div className="px-1 pt-2 pb-1 space-y-1">
            {/* Price row */}
            <div className="flex items-baseline justify-between gap-1">
              <p className="font-black text-slate-900 text-sm leading-none">
                {formatPrice(s.price, currency as import('@/types').CurrencyCode, 'en-US', s.currency)}
                <span className="text-slate-400 font-medium text-[11px] ml-1">/mo</span>
              </p>
              {/* Bed / bath inline */}
              {(beds !== null || baths !== null) && (
                <div className="flex items-center gap-2 shrink-0">
                  {beds !== null && (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                      <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12h18M3 12V8a2 2 0 012-2h14a2 2 0 012 2v4M3 12v5a1 1 0 001 1h16a1 1 0 001-1v-5" />
                      </svg>
                      {beds} bedroom{beds !== 1 ? 's' : ''}
                    </span>
                  )}
                  {baths !== null && (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                      <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 12h16M4 12a2 2 0 01-2-2V7a2 2 0 012-2h1m15 7a2 2 0 002-2V7a2 2 0 00-2-2h-1M4 12v5a2 2 0 002 2h12a2 2 0 002-2v-5" />
                      </svg>
                      {baths} shower{baths !== 1 ? 's' : ''}
                    </span>
                  )}
                </div>
              )}
            </div>
            <p className="font-semibold text-slate-700 truncate text-xs leading-snug">
              {getCardTitle(s)}
            </p>
            {dateRange && (
              <p className="text-[11px] text-slate-400 font-medium truncate">{dateRange}</p>
            )}
          </div>
        </Link>

        {/* Save button */}
        <button
          onClick={onSave}
          className={`absolute top-2.5 right-2.5 z-30 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 ${
            isSaved
              ? 'bg-white text-red-500 shadow-md'
              : 'bg-black/25 backdrop-blur-sm text-white hover:bg-white hover:text-red-400'
          }`}
          aria-label={isSaved ? 'Unsave listing' : 'Save listing'}
        >
          <svg
            className="w-3.5 h-3.5"
            fill={isSaved ? 'currentColor' : 'none'}
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
      </div>
    );
  },
);

ListingCard.displayName = 'ListingCard';

// ─── Skeleton Card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="rounded-2xl overflow-hidden shadow-sm animate-pulse">
      <div className="aspect-[4/3] bg-slate-200 rounded-2xl" />
      <div className="px-1 pt-2 pb-1 space-y-1.5">
        <div className="h-4 bg-slate-200 rounded-full w-3/4" />
        <div className="h-3 bg-slate-100 rounded-full w-1/2" />
      </div>
    </div>
  );
}

// ─── Map Page ─────────────────────────────────────────────────────────────────

function WebMapPage() {
  const { user } = useAuth();
  const { currency } = useCurrency();
  const { language } = useLanguage();
  const t = translations[language];

  // Read saved state during render — survives React Strict Mode's double-mount
  // (reading in a useEffect would delete the key before the second mount reads it)
  const _saved = useMemo<Partial<WebMapSavedState> | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = sessionStorage.getItem('subhub_map_state');
      return raw ? (JSON.parse(raw) as Partial<WebMapSavedState>) : null;
    } catch { return null; }
  }, []);

  const [sublets, setSublets] = useState<Sublet[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>(_saved?.filters ?? INITIAL_FILTERS);
  const [searchQuery, setSearchQuery] = useState(_saved?.searchQuery ?? '');
  const [selectedSubletId, setSelectedSubletId] = useState<string | undefined>(_saved?.selectedSubletId);
  const [cityFlyTo, setCityFlyTo] = useState<{ lat: number; lng: number; zoom?: number } | null>(_saved?.cityFlyTo ?? null);
  const { savedIds: savedListingIds, toggle: toggleSavedById, showSignInModal: savedAuthModal, closeSignInModal: closeSavedAuthModal } = useSaved();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const panelRef = useRef<HTMLDivElement>(null);

  // Clean up the saved state key — idempotent, safe to run twice in Strict Mode
  useEffect(() => { sessionStorage.removeItem('subhub_map_state'); }, []);

  // Load listings
  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true);
        const data = await persistenceService.fetchListings();
        setSublets(data);
      } catch (err) {
        console.error('Failed to load listings:', err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Filter listings
  const filteredSublets = useMemo(() => {
    return sublets.filter(s => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q
        || s.location.toLowerCase().includes(q)
        || s.originalText.toLowerCase().includes(q)
        || (s.city?.toLowerCase().includes(q))
        || (s.neighborhood?.toLowerCase().includes(q));

      const matchesPrice = s.price >= filters.minPrice && s.price <= filters.maxPrice;
      const matchesStatus = filters.showTaken || s.status !== ListingStatus.TAKEN;
      const matchesType = !filters.type || s.type === filters.type;
      const matchesCity = !filters.city.trim()
        || (s.city?.toLowerCase().includes(filters.city.toLowerCase()));
      const matchesNeighborhood = !filters.neighborhood.trim()
        || (s.neighborhood?.toLowerCase().includes(filters.neighborhood.toLowerCase()));
      const matchesDates = !filters.startDate || !filters.endDate
        || (s.startDate <= filters.endDate && s.endDate >= filters.startDate);

      const rentTerm = filters.rentTerm ?? RentTerm.ALL;
      const matchesRentTerm = rentTerm === RentTerm.ALL || (() => {
        const days = getListingDurationDays(s);
        if (days == null) return true;
        return rentTerm === RentTerm.SHORT_TERM ? days <= SHORT_TERM_DAYS : days > SHORT_TERM_DAYS;
      })();

      const matchesBeds = !filters.minRooms || (() => {
        const beds = getBedroomCount(s);
        return beds !== null && beds >= (filters.minRooms ?? 0);
      })();

      const matchesFurnished = AMENITY_FILTER_KEYS.every(
        key => !filters.amenities?.[key] || s.parsedAmenities?.[key] === true,
      );

      let matchesPostedWithin = true;
      if (filters.postedWithin && filters.postedWithin !== 'all') {
        const durations: Record<string, number> = {
          '1h': 3_600_000, '24h': 86_400_000, '7d': 604_800_000, '30d': 2_592_000_000,
        };
        const cutoff = Date.now() - (durations[filters.postedWithin] ?? 0);
        matchesPostedWithin = s.createdAt >= cutoff;
      }

      const matchesPrice2 = !filters.onlyWithPrice || (s.price && s.price > 0);

      return matchesSearch && matchesPrice && matchesStatus && matchesType
        && matchesCity && matchesNeighborhood && matchesDates && matchesRentTerm
        && matchesBeds && matchesFurnished && matchesPostedWithin && matchesPrice2;
    });
  }, [sublets, filters, searchQuery]);

  const activeFilterCount = useMemo(() => [
    filters.minPrice !== 0,
    filters.maxPrice !== PRICE_MAX,
    !!filters.type,
    !!filters.city,
    !!filters.neighborhood,
    !!filters.startDate,
    !!filters.endDate,
    (filters.rentTerm ?? RentTerm.ALL) !== RentTerm.ALL,
    !!filters.minRooms,
    (filters.postedWithin ?? 'all') !== 'all',
    ...AMENITY_FILTER_KEYS.map(k => !!filters.amenities?.[k]),
  ].filter(Boolean).length, [filters]);

  const handleMarkerClick = useCallback((sublet: Sublet) => {
    setSelectedSubletId(sublet.id);
    const card = cardRefs.current[sublet.id];
    if (card && panelRef.current) {
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, []);

  const handleSave = useCallback((e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const wasSaved = savedListingIds.has(id);
    toggleSavedById(id);
    if (!wasSaved && user) setToastMessage('Saved ♡');
  }, [user, savedListingIds, toggleSavedById]);

  const handleClearFilters = useCallback(() => {
    setFilters(INITIAL_FILTERS);
    setSearchQuery('');
  }, []);

  const handleNavigateToListing = useCallback(() => {
    try {
      sessionStorage.setItem('subhub_map_state', JSON.stringify({
        filters, searchQuery, selectedSubletId, cityFlyTo,
      } satisfies WebMapSavedState));
    } catch {}
  }, [filters, searchQuery, selectedSubletId, cityFlyTo]);

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-[#f6f7f8]">

      {/* ── Navbar ── */}
      <div className="shrink-0">
        <WebNavbar />
      </div>

      {/* ── Top Bar: Search + Filters + Saved ── */}
      <div className="shrink-0 bg-white border-b border-slate-200 z-40 px-4 py-2.5 flex items-center gap-2">
        {/* Search */}
        <SearchAutocomplete
          value={searchQuery}
          onChange={setSearchQuery}
          sublets={sublets}
          placeholder={t.searchPlaceholder}
          className="flex-1 max-w-xs"
          inputClassName="w-full py-2 pl-10 pr-8 text-sm border border-slate-200 rounded-full bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#4A7CC7]/20 focus:border-[#4A7CC7] focus:bg-white transition-all"
          onCitySelect={city => {
            const center = CITY_CENTERS[city];
            if (center) setCityFlyTo(center);
          }}
        />

        {/* Filters button — right next to search */}
        <button
          onClick={() => setDrawerOpen(true)}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold border-2 transition-all whitespace-nowrap shrink-0 ${
            activeFilterCount > 0
              ? 'border-[#4A7CC7] bg-[#4A7CC7]/5 text-[#4A7CC7]'
              : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
          }`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 010 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h10a1 1 0 010 2H4a1 1 0 01-1-1zM3 16a1 1 0 011-1h4a1 1 0 010 2H4a1 1 0 01-1-1z" />
          </svg>
          {t.filters}
          {activeFilterCount > 0 && (
            <span className="w-5 h-5 bg-[#4A7CC7] text-white text-[10px] font-black rounded-full flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>

      </div>

      {/* ── Content Area ── */}
      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">

        {/* Listings Panel — 50% */}
        <div
          ref={panelRef}
          className="flex-1 md:flex-none md:w-1/2 overflow-y-auto bg-[#f6f7f8] border-r border-slate-200"
        >
          {/* Count header */}
          <div className="sticky top-0 bg-[#f6f7f8]/95 backdrop-blur-sm border-b border-slate-100 px-4 py-3 z-10">
            {isLoading ? (
              <div className="h-4 bg-slate-200 rounded w-32 animate-pulse" />
            ) : (
              <p className="text-sm font-bold text-slate-700">
                {filteredSublets.length.toLocaleString()} {t.results}
              </p>
            )}
          </div>

          {/* Cards */}
          <div className="p-3 grid grid-cols-2 gap-3">
            {isLoading ? (
              Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
            ) : filteredSublets.length === 0 ? (
              <div className="col-span-2 py-16 text-center">
                <svg className="w-12 h-12 text-slate-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-slate-600 font-semibold">No listings found</p>
                <p className="text-sm text-slate-400 mt-1">Try adjusting your filters</p>
                {activeFilterCount > 0 && (
                  <button
                    onClick={handleClearFilters}
                    className="mt-4 text-sm text-[#4A7CC7] font-semibold hover:underline"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            ) : (
              filteredSublets.map(s => (
                <ListingCard
                  key={s.id}
                  ref={el => { cardRefs.current[s.id] = el; }}
                  sublet={s}
                  isSelected={selectedSubletId === s.id}
                  isSaved={savedListingIds.has(s.id)}
                  currency={currency}
                  onMouseEnter={() => setSelectedSubletId(s.id)}
                  onMouseLeave={() => setSelectedSubletId(undefined)}
                  onSave={e => handleSave(e, s.id)}
                  onNavigate={handleNavigateToListing}
                />
              ))
            )}
          </div>
        </div>

        {/* Map — 50% */}
        <div className="h-[42vh] md:h-auto md:w-1/2 shrink-0 relative">
          <MapVisualizer
            sublets={filteredSublets}
            onMarkerClick={handleMarkerClick}
            onDeselect={() => setSelectedSubletId(undefined)}
            selectedSubletId={selectedSubletId}
            language={language}
            flyToCity={cityFlyTo}
          />
        </div>
      </div>

      {/* ── Filters Drawer ── */}
      <FiltersDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        filters={filters}
        onFiltersChange={setFilters}
        onClear={handleClearFilters}
        resultCount={filteredSublets.length}
      />

      {/* ── Auth Modal (triggered by SavedContext when guest tries to save) ── */}
      {savedAuthModal && (
        <AuthModal
          reason="save"
          initialMode="signup"
          onSuccess={closeSavedAuthModal}
          onClose={closeSavedAuthModal}
        />
      )}

      {/* ── Toast ── */}
      {toastMessage && (
        <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
      )}
    </div>
  );
}

export default function MapPage() {
  return <PlatformWrapper web={<WebMapPage />} mobile={<MapScreen />} />;
}
