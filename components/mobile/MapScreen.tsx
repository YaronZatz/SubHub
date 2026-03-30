'use client';

import React, {
  useState, useMemo, useEffect, useRef, useCallback,
} from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import ListingCarousel from '@/components/ListingCarousel';
import SearchAutocomplete from '@/components/SearchAutocomplete';
import AuthModal from '@/components/shared/AuthModal';
import MobileTabBar from '@/components/shared/MobileTabBar';
import { useSaved } from '@/contexts/SavedContext';
import Toast from '@/components/shared/Toast';
import { persistenceService } from '@/services/persistenceService';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrency } from '@/contexts/CurrencyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { translations } from '@/translations';
import { formatPrice, formatDate } from '@/utils/formatters';
import {
  Sublet, Filters, ListingStatus, SubletType,
  DateMode, RentTerm, Language, CurrencyCode,
} from '@/types';
import { CITY_CENTERS } from '@/constants';

const MapVisualizer = dynamic(
  () => import('@/components/MapVisualizer'),
  { ssr: false },
);

// ─── Constants ────────────────────────────────────────────────────────────────

const SHORT_TERM_DAYS = 183;
const PRICE_MAX = 20000;
const PRICE_STEP = 500;
const SNAP_HANDLE = 32;
const SNAP_CARD   = 230;
const SNAP_LIST_RATIO = 0.55;

const INITIAL_FILTERS: Filters = {
  minPrice: 0, maxPrice: PRICE_MAX, showTaken: false, type: undefined,
  city: '', neighborhood: '', startDate: '', endDate: '',
  dateMode: DateMode.FLEXIBLE, petsAllowed: false,
  onlyWithPrice: true,
  rentTerm: RentTerm.ALL, postedWithin: 'all',
  minRooms: undefined, maxRooms: undefined,
};

const AMENITY_FILTER_KEYS: Array<keyof NonNullable<Filters['amenities']>> = [
  'furnished', 'wifi', 'ac', 'washer', 'petFriendly', 'parking', 'kitchen', 'balcony',
];

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

function getCardTitle(s: Sublet, unknownLocation: string): string {
  const parts = [s.neighborhood, s.city].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : (s.location || unknownLocation);
}

function getDateRange(s: Sublet, t: { fromDate: string; availableNow: string }): string {
  const start = s.startDate ? formatDate(s.startDate) : '';
  const end   = s.endDate   ? formatDate(s.endDate)   : '';
  if (start && end) return `${start} – ${end}`;
  if (start) return t.fromDate.replace('{date}', start);
  if (s.immediateAvailability) return t.availableNow;
  return '';
}

// ─── Price Slider ─────────────────────────────────────────────────────────────

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
        <div className="absolute h-full bg-[#4A7CC7] rounded-full"
          style={{ left: `${minPct}%`, right: `${100 - maxPct}%` }} />
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

// ─── Filters Drawer ───────────────────────────────────────────────────────────

function FiltersDrawer({ open, onClose, filters, onFiltersChange, onClear, resultCount }: {
  open: boolean; onClose: () => void; filters: Filters;
  onFiltersChange: (f: Filters) => void; onClear: () => void; resultCount: number;
}) {
  const set = useCallback(
    (patch: Partial<Filters>) => onFiltersChange({ ...filters, ...patch }),
    [filters, onFiltersChange],
  );
  const setAmenity = useCallback(
    (key: keyof NonNullable<Filters['amenities']>, val: boolean) =>
      onFiltersChange({ ...filters, amenities: { ...filters.amenities, [key]: val } }),
    [filters, onFiltersChange],
  );
  const { language } = useLanguage();
  const t = translations[language];

  const sLabel = 'text-xs font-bold uppercase tracking-widest text-slate-500';
  const iconBtnCls = (active: boolean) =>
    `flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all cursor-pointer select-none ${
      active ? 'border-[#4A7CC7] bg-[#4A7CC7]/5 text-[#4A7CC7]' : 'border-slate-200 text-slate-600'
    }`;
  const pillCls = (active: boolean) =>
    `whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 ${
      active ? 'bg-[#4A7CC7] text-white shadow-sm' : 'bg-slate-100 text-slate-600'
    }`;

  return (
    <>
      {open && <div className="fixed inset-0 bg-slate-900/40 z-[55] backdrop-blur-[2px]" onClick={onClose} />}
      <aside className={`fixed top-0 right-0 bottom-0 z-[60] w-full max-w-[480px] bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0">
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">{t.refineSearch}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 text-slate-400 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8" style={{ scrollbarWidth: 'none' }}>
          {/* Price Range */}
          <section className="space-y-4">
            <div className="flex justify-between items-end">
              <span className={sLabel}>{t.priceRange}</span>
              <span className="text-sm font-semibold text-[#4A7CC7]">
                ₪{filters.minPrice.toLocaleString()} — {filters.maxPrice >= PRICE_MAX ? '₪20k+' : `₪${filters.maxPrice.toLocaleString()}`}
              </span>
            </div>
            <PriceSlider minVal={filters.minPrice} maxVal={filters.maxPrice}
              onChange={(min, max) => set({ minPrice: min, maxPrice: max })} />
          </section>

          {/* Rental Duration */}
          <section className="space-y-4">
            <span className={sLabel}>{t.rentalDuration}</span>
            <div className="grid grid-cols-3 gap-3">
              {([
                { label: t.rentTerms[RentTerm.ALL], value: RentTerm.ALL, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> },
                { label: t.rentTerms[RentTerm.SHORT_TERM], value: RentTerm.SHORT_TERM, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
                { label: t.rentTerms[RentTerm.LONG_TERM], value: RentTerm.LONG_TERM, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg> },
              ]).map(opt => (
                <button key={opt.value} onClick={() => set({ rentTerm: opt.value })}
                  className={iconBtnCls((filters.rentTerm ?? RentTerm.ALL) === opt.value)}>
                  {opt.icon}<span className="text-xs font-semibold">{opt.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Property Type */}
          <section className="space-y-4">
            <span className={sLabel}>{t.propertyType}</span>
            <div className="grid grid-cols-3 gap-3">
              {([
                { label: t.subletTypes[SubletType.ENTIRE], value: SubletType.ENTIRE, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg> },
                { label: t.subletTypes[SubletType.ROOMMATE], value: SubletType.ROOMMATE, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
                { label: t.subletTypes[SubletType.STUDIO], value: SubletType.STUDIO, icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" /></svg> },
              ]).map(opt => (
                <button key={opt.value}
                  onClick={() => set({ type: filters.type === opt.value ? undefined : opt.value })}
                  className={iconBtnCls(filters.type === opt.value)}>
                  {opt.icon}<span className="text-xs font-semibold">{opt.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Bedrooms */}
          <section className="space-y-4">
            <span className={sLabel}>{t.bedrooms}</span>
            <div className="flex gap-2 flex-wrap">
              {([
                { label: t.anyRooms, value: undefined as number | undefined },
                { label: '1+', value: 1 }, { label: '2+', value: 2 },
                { label: '3+', value: 3 }, { label: '4+', value: 4 },
              ]).map(opt => (
                <button key={opt.label} onClick={() => set({ minRooms: opt.value })}
                  className={`px-5 py-2 rounded-full text-sm font-semibold border-2 transition-all ${
                    filters.minRooms === opt.value
                      ? 'border-[#4A7CC7] bg-[#4A7CC7]/5 text-[#4A7CC7]'
                      : 'border-slate-200 text-slate-600'
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </section>

          {/* Move-in Date */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <span className={sLabel}>Move-in Date</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium">Flexible</span>
                <button
                  onClick={() => set({ dateMode: filters.dateMode === DateMode.FLEXIBLE ? DateMode.EXACT : DateMode.FLEXIBLE })}
                  className={`relative w-11 h-6 rounded-full transition-colors ${filters.dateMode === DateMode.FLEXIBLE ? 'bg-[#4A7CC7]' : 'bg-slate-200'}`}>
                  <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-200 ${filters.dateMode === DateMode.FLEXIBLE ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-slate-100 border-2 border-transparent focus-within:border-[#4A7CC7] transition-all">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Start</p>
                <input type="date" value={filters.startDate || ''} onChange={e => set({ startDate: e.target.value })}
                  className="bg-transparent border-none p-0 text-sm font-semibold text-slate-900 focus:ring-0 w-full" />
              </div>
              <div className="p-3 rounded-xl bg-slate-100 border-2 border-transparent focus-within:border-[#4A7CC7] transition-all">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">End</p>
                <input type="date" value={filters.endDate || ''} onChange={e => set({ endDate: e.target.value })}
                  className="bg-transparent border-none p-0 text-sm font-semibold text-slate-900 focus:ring-0 w-full" />
              </div>
            </div>
          </section>

          {/* Posted Within */}
          <section className="space-y-4">
            <span className={sLabel}>Posted Within</span>
            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {([
                { label: 'Any time', value: 'all' }, { label: 'Last hour', value: '1h' },
                { label: 'Last 24h', value: '24h' }, { label: 'Last 7 days', value: '7d' },
                { label: 'Last 30 days', value: '30d' },
              ]).map(opt => (
                <button key={opt.value} onClick={() => set({ postedWithin: opt.value })}
                  className={pillCls((filters.postedWithin ?? 'all') === opt.value)}>
                  {opt.label}
                </button>
              ))}
            </div>
          </section>

          {/* Post Quality */}
          <section className="space-y-4">
            <span className={sLabel}>Post Quality</span>
            <button onClick={() => set({ onlyWithPrice: !filters.onlyWithPrice })}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 text-sm font-bold transition-all w-full ${filters.onlyWithPrice ? 'border-[#4A7CC7] bg-[#4A7CC7]/5 text-[#4A7CC7]' : 'border-slate-200 text-slate-600'}`}>
              <span>💰</span> With Price
            </button>
          </section>

          {/* Amenities */}
          <section className="space-y-4">
            <span className={sLabel}>Amenities</span>
            <div className="grid grid-cols-2 gap-y-3.5 gap-x-6">
              {([
                { key: 'furnished', label: 'Furnished' }, { key: 'wifi', label: 'WiFi' },
                { key: 'washer', label: 'Washer' }, { key: 'ac', label: 'Air Conditioning' },
                { key: 'petFriendly', label: 'Pet Friendly' }, { key: 'parking', label: 'Free Parking' },
                { key: 'kitchen', label: 'Kitchen' }, { key: 'balcony', label: 'Balcony' },
              ] as Array<{ key: keyof NonNullable<Filters['amenities']>; label: string }>).map(opt => (
                <label key={opt.key} className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" checked={!!(filters.amenities?.[opt.key])}
                    onChange={e => setAmenity(opt.key, e.target.checked)}
                    className="w-5 h-5 rounded border-slate-300 text-[#4A7CC7] focus:ring-[#4A7CC7]/20 cursor-pointer" />
                  <span className="text-sm text-slate-700 font-medium group-hover:text-[#4A7CC7] transition-colors">{opt.label}</span>
                </label>
              ))}
            </div>
          </section>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button onClick={onClear} className="text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors">
            Clear All
          </button>
          <button onClick={onClose}
            className="flex items-center gap-2 px-7 py-3.5 bg-[#4A7CC7] text-white rounded-xl font-bold text-sm shadow-lg shadow-[#4A7CC7]/25 hover:bg-[#3b66a6] transition-all active:scale-95">
            Show {resultCount.toLocaleString()} Result{resultCount !== 1 ? 's' : ''}
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
        </div>
      </aside>
    </>
  );
}

// ─── Mobile Tab Bar ───────────────────────────────────────────────────────────

// ─── Mini Picker (currency / language) ───────────────────────────────────────

function MiniPicker({ value, options, onChange }: {
  value: string;
  options: { value: string; label: string; display?: React.ReactNode }[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value);

  return (
    <div className="relative">
      {open && (
        <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
      )}
      <button
        onClick={() => setOpen(v => !v)}
        className="relative z-50 flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-200 rounded-full text-xs font-bold text-slate-700 transition-colors">
        {selected?.display ?? selected?.label ?? value}
        <svg className={`w-2.5 h-2.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl py-1.5 z-50 min-w-[90px] overflow-hidden">
          {options.map(opt => (
            <button key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full text-left px-3.5 py-2.5 text-xs font-bold transition-colors flex items-center gap-2 ${
                opt.value === value
                  ? 'text-[#4A7CC7] bg-[#4A7CC7]/5'
                  : 'text-slate-700 hover:bg-slate-50'
              }`}>
              {opt.display ?? opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Selected Listing Card ────────────────────────────────────────────────────

function SelectedCard({ sublet: s, currency, isSaved, onSave }: {
  sublet: Sublet; currency: string; isSaved: boolean;
  onSave: (e: React.MouseEvent) => void;
}) {
  const { language } = useLanguage();
  const t = translations[language];
  const hasAI    = !!(s.ai_summary || s.parsedAmenities || s.parsedRooms || s.rooms);
  const dateRange = getDateRange(s, t);

  return (
    <div className="px-3 pt-0 pb-2">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex gap-3 p-2.5">
        {/* Photo */}
        <div className="relative w-[100px] aspect-square rounded-xl overflow-hidden shrink-0">
          <ListingCarousel id={s.id} images={s.images} sourceUrl={s.sourceUrl}
            photoCount={s.photoCount} aspectRatio="aspect-square" />
          {hasAI && (
            <div className="absolute top-1.5 left-1.5 flex items-center gap-1 bg-[#F5831F] text-white text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wide pointer-events-none z-10">
              <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1z" />
              </svg>
              AI PARSED
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div className="flex items-start justify-between gap-1">
            <p className="font-black text-slate-900 text-sm leading-snug">{getCardTitle(s, t.unknownLocation)}</p>
            <button onClick={onSave}
              className={`w-7 h-7 shrink-0 flex items-center justify-center transition-colors ${
                isSaved ? 'text-red-500' : 'text-slate-300'
              }`}>
              <svg className="w-4 h-4" fill={isSaved ? 'currentColor' : 'none'}
                viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </button>
          </div>

          {s.location && (
            <p className="text-xs text-slate-500 truncate mt-0.5">{s.location}</p>
          )}

          {dateRange && (
            <div className="inline-flex items-center gap-1 bg-slate-100 rounded-full px-2.5 py-1 w-fit mt-1.5">
              <svg className="w-3 h-3 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-[10px] font-semibold text-slate-600 whitespace-nowrap">{dateRange}</span>
            </div>
          )}

          <div className="mt-2 space-y-2">
            <div>
              <span className="text-base font-black text-[#4A7CC7]">
                {formatPrice(s.price, currency as CurrencyCode, 'en-US', s.currency)}
              </span>
              <span className="text-slate-400 text-xs ml-1">/mo</span>
            </div>
            <Link href={`/listing/${s.id}`}
              className="block text-center py-1.5 bg-[#F5831F] text-white text-xs font-black rounded-full shadow-sm active:opacity-80 transition-opacity">
              View Details
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Mini Card (list view) ────────────────────────────────────────────────────

function MiniCard({ sublet: s, isSelected, isSaved, currency, onTap, onSave }: {
  sublet: Sublet; isSelected: boolean; isSaved: boolean; currency: string;
  onTap: () => void; onSave: (e: React.MouseEvent) => void;
}) {
  const { language } = useLanguage();
  const t = translations[language];
  const isTaken   = s.status === ListingStatus.TAKEN;
  const dateRange = getDateRange(s, t);
  const postTs    = s.postedAt ? (new Date(s.postedAt).getTime() || s.createdAt) : s.createdAt;
  const hoursAgo  = Math.max(0, Math.floor((Date.now() - postTs) / (60 * 60 * 1000)));
  const daysAgo   = Math.max(1, Math.floor(hoursAgo / 24));
  const isNew     = hoursAgo < 24;

  return (
    <div
      className={`relative rounded-2xl overflow-hidden shadow-md flex-shrink-0 w-48 cursor-pointer transition-all duration-200
        ${isSelected ? 'ring-2 ring-[#4A7CC7] shadow-xl shadow-[#4A7CC7]/25 scale-[1.02]' : ''}
        ${isTaken ? 'opacity-55' : ''}`}
      onClick={onTap}>
      <Link href={`/listing/${s.id}`} className="block" onClick={e => e.stopPropagation()}>
        <div className="relative aspect-[4/3] overflow-hidden">
          <ListingCarousel id={s.id} images={s.images} sourceUrl={s.sourceUrl}
            photoCount={s.photoCount} aspectRatio="aspect-[4/3]" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/30 pointer-events-none z-10" />
          <div className="absolute bottom-2 left-2 z-20 bg-white/90 backdrop-blur-sm rounded-full px-2.5 py-0.5">
            <span className="text-[11px] font-black text-slate-900">
              {formatPrice(s.price, currency as CurrencyCode, 'en-US', s.currency)}
              <span className="text-slate-400 font-normal text-[10px] ml-0.5">/mo</span>
            </span>
          </div>
          {/* Time-ago badge — top left */}
          {isNew ? (
            <div className="absolute top-2 left-2 z-20 flex items-center gap-1 bg-cyan-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full shadow-lg animate-pulse ring-2 ring-cyan-100 pointer-events-none">
              <span className="w-1 h-1 bg-white rounded-full" />
              {hoursAgo}h ago
            </div>
          ) : (
            <div className="absolute top-2 left-2 z-20 bg-slate-500/80 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full pointer-events-none">
              {daysAgo > 30 ? '30+' : daysAgo}d ago
            </div>
          )}
          {isTaken && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-30 pointer-events-none">
              <span className="text-white text-[10px] font-bold border border-white/40 rounded-full px-3 py-1">Taken</span>
            </div>
          )}
        </div>
        <div className="p-2.5 bg-white">
          <p className="font-bold text-slate-900 text-xs truncate">{getCardTitle(s, t.unknownLocation)}</p>
          {dateRange && <p className="text-[10px] text-slate-400 mt-0.5 truncate">{dateRange}</p>}
        </div>
      </Link>
      <button onClick={onSave}
        className={`absolute top-2 right-2 z-30 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
          isSaved ? 'bg-white text-red-500 shadow-sm' : 'bg-black/25 backdrop-blur-sm text-white'
        }`}>
        <svg className="w-3 h-3" fill={isSaved ? 'currentColor' : 'none'} viewBox="0 0 24 24"
          stroke="currentColor" strokeWidth={2.2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      </button>
    </div>
  );
}

// ─── MapScreen ────────────────────────────────────────────────────────────────

export default function MapScreen() {
  const { user, logout }       = useAuth();
  const { currency, setCurrency } = useCurrency();
  const { language, setLanguage } = useLanguage();

  const firebaseUser  = user as (typeof user & { photoURL?: string; displayName?: string }) | null;
  const displayName   = firebaseUser?.displayName || (user as any)?.name || 'User';
  const initials      = displayName.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase();

  // ── Data state ──────────────────────────────────────────────────────────────
  const [sublets,        setSublets]        = useState<Sublet[]>([]);
  const [isLoading,      setIsLoading]      = useState(true);
  const [filters,        setFilters]        = useState<Filters>(INITIAL_FILTERS);
  const [searchQuery,    setSearchQuery]    = useState('');
  const [selectedId,     setSelectedId]     = useState<string | undefined>();
  const [cityFlyTo,      setCityFlyTo]      = useState<{ lat: number; lng: number; zoom?: number } | null>(null);
  const { savedIds, toggle: toggleSavedById, showSignInModal, closeSignInModal } = useSaved();
  const [authModalOpen,  setAuthModalOpen]  = useState(false);
  const [toastMessage,   setToastMessage]   = useState<string | null>(null);
  const [drawerOpen,     setDrawerOpen]     = useState(false);
  const [profileOpen,    setProfileOpen]    = useState(false);
  const [headerAuthOpen, setHeaderAuthOpen] = useState(false);

  // ── Sheet drag state ────────────────────────────────────────────────────────
  const [sheetHeight,  setSheetHeight]  = useState(SNAP_CARD);
  const [snapListH,    setSnapListH]    = useState(380);
  const [isDragging,   setIsDragging]   = useState(false);

  const containerRef    = useRef<HTMLDivElement>(null);
  const handleRef       = useRef<HTMLDivElement>(null);
  const cardListRef     = useRef<HTMLDivElement>(null);
  const mapInstanceRef  = useRef<google.maps.Map | null>(null);
  const cardRefs      = useRef<Record<string, HTMLDivElement | null>>({});
  const sheetHRef     = useRef(SNAP_CARD);
  const snapListHRef  = useRef(380);
  const dragStartY    = useRef(0);
  const dragStartH    = useRef(0);

  const t = translations[language];

  const LANG_CURRENCY: Partial<Record<Language, CurrencyCode>> = {
    [Language.HE]: CurrencyCode.ILS,
    [Language.EN]: CurrencyCode.USD,
    [Language.FR]: CurrencyCode.EUR,
    [Language.DE]: CurrencyCode.EUR,
    [Language.IT]: CurrencyCode.EUR,
    [Language.PT]: CurrencyCode.EUR,
    [Language.ES]: CurrencyCode.USD,
    [Language.RU]: CurrencyCode.USD,
    [Language.UK]: CurrencyCode.GBP,
    [Language.ZH]: CurrencyCode.USD,
  };
  const handleLanguageChange = (lang: string) => {
    setLanguage(lang as Language);
    const matched = LANG_CURRENCY[lang as Language];
    if (matched) setCurrency(matched);
  };

  // Keep refs in sync
  useEffect(() => { sheetHRef.current = sheetHeight; }, [sheetHeight]);
  useEffect(() => { snapListHRef.current = snapListH; }, [snapListH]);

  // Measure snap list height after mount + on resize
  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        const raw = Math.round(containerRef.current.clientHeight * SNAP_LIST_RATIO);
        const h = Math.max(raw, SNAP_CARD + 80);
        setSnapListH(h);
        snapListHRef.current = h;
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // ── Native drag listeners (passive:false so we own the gesture) ──────────────
  useEffect(() => {
    const el = handleRef.current;
    if (!el) return;

    // Zoom state captured at drag start
    let startZoom  = 12;
    let startMapH  = 1;

    const containerH = () => containerRef.current?.clientHeight ?? 600;

    const applyZoom = () => {
      const map = mapInstanceRef.current;
      if (!map || startMapH <= 0) return;
      const newMapH    = Math.max(1, containerH() - sheetHRef.current);
      const zoomDelta  = Math.log2(newMapH / startMapH);
      const newZoom    = Math.max(2, Math.min(20, startZoom + zoomDelta));
      map.setZoom(newZoom);
    };

    const snap = () => {
      const current = sheetHRef.current;
      const snaps   = [SNAP_HANDLE, SNAP_CARD, snapListHRef.current];
      const nearest = snaps.reduce((prev, s) =>
        Math.abs(s - current) < Math.abs(prev - current) ? s : prev
      );
      setSheetHeight(nearest);
      sheetHRef.current = nearest;
      // After the CSS transition settles, trigger a map resize
      setTimeout(() => {
        const map = mapInstanceRef.current;
        if (map && window.google?.maps) {
          window.google.maps.event.trigger(map, 'resize');
        }
      }, 350);
    };

    const captureZoomStart = () => {
      const map = mapInstanceRef.current;
      if (map) {
        startZoom = map.getZoom() ?? 12;
        startMapH = Math.max(1, containerH() - sheetHRef.current);
      }
    };

    // ── Touch ──
    const onTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      setIsDragging(true);
      dragStartY.current = e.touches[0].clientY;
      dragStartH.current = sheetHRef.current;
      captureZoomStart();
    };
    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const dy   = dragStartY.current - e.touches[0].clientY;
      const maxH = containerH() * 0.92;
      const newH = Math.max(SNAP_HANDLE, Math.min(maxH, dragStartH.current + dy));
      setSheetHeight(newH);
      sheetHRef.current = newH;
      applyZoom();
    };
    const onTouchEnd = () => { setIsDragging(false); snap(); };

    // ── Mouse (desktop / dev-tools testing) ──
    const onMouseDown = (e: MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      dragStartY.current = e.clientY;
      dragStartH.current = sheetHRef.current;
      captureZoomStart();

      const onMouseMove = (e: MouseEvent) => {
        const dy   = dragStartY.current - e.clientY;
        const maxH = containerH() * 0.92;
        const newH = Math.max(SNAP_HANDLE, Math.min(maxH, dragStartH.current + dy));
        setSheetHeight(newH);
        sheetHRef.current = newH;
        applyZoom();
      };
      const onMouseUp = () => {
        setIsDragging(false);
        snap();
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    };

    el.addEventListener('touchstart',  onTouchStart, { passive: false });
    el.addEventListener('touchmove',   onTouchMove,  { passive: false });
    el.addEventListener('touchend',    onTouchEnd);
    el.addEventListener('mousedown',   onMouseDown);

    return () => {
      el.removeEventListener('touchstart',  onTouchStart);
      el.removeEventListener('touchmove',   onTouchMove);
      el.removeEventListener('touchend',    onTouchEnd);
      el.removeEventListener('mousedown',   onMouseDown);
    };
  }, []); // all logic uses refs — no deps needed

  // ── Data loading ────────────────────────────────────────────────────────────
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

  // ── Filtering ───────────────────────────────────────────────────────────────
  const filteredSublets = useMemo(() => {
    return sublets.filter(s => {
      const q = searchQuery.toLowerCase();
      const matchesSearch = !q
        || s.location.toLowerCase().includes(q)
        || s.originalText.toLowerCase().includes(q)
        || (s.city?.toLowerCase().includes(q))
        || (s.neighborhood?.toLowerCase().includes(q));

      const matchesPrice  = s.price >= filters.minPrice && s.price <= filters.maxPrice;
      const matchesStatus = filters.showTaken || s.status !== ListingStatus.TAKEN;
      const matchesType   = !filters.type || s.type === filters.type;
      const matchesCity   = !filters.city.trim()
        || (s.city?.toLowerCase().includes(filters.city.toLowerCase()));
      const matchesNbhd   = !filters.neighborhood.trim()
        || (s.neighborhood?.toLowerCase().includes(filters.neighborhood.toLowerCase()));
      const matchesDates  = !filters.startDate || !filters.endDate
        || (s.startDate <= filters.endDate && s.endDate >= filters.startDate);

      const rentTerm        = filters.rentTerm ?? RentTerm.ALL;
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
        && matchesCity && matchesNbhd && matchesDates && matchesRentTerm
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

  const selectedSublet = useMemo(
    () => selectedId ? filteredSublets.find(s => s.id === selectedId) : undefined,
    [selectedId, filteredSublets],
  );

  // Scroll selected card into view when in list mode
  useEffect(() => {
    if (!selectedId) return;
    const card = cardRefs.current[selectedId];
    if (card && cardListRef.current)
      card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [selectedId]);

  // ── Callbacks ───────────────────────────────────────────────────────────────
  const handleMarkerClick = useCallback((sublet: Sublet) => {
    setSelectedId(sublet.id);
    setSheetHeight(SNAP_CARD);
    sheetHRef.current = SNAP_CARD;
  }, []);

  const handleSave = useCallback((e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const willSave = !savedIds.has(id);
    toggleSavedById(id);
    if (willSave && user) setToastMessage('Saved ♡');
  }, [savedIds, toggleSavedById, user]);

  const handleClearFilters = useCallback(() => {
    setFilters(INITIAL_FILTERS);
    setSearchQuery('');
  }, []);

  // ── Derived sheet zones ──────────────────────────────────────────────────────
  const midHandleCard = (SNAP_HANDLE + SNAP_CARD) / 2;
  const midCardList   = (SNAP_CARD + snapListH)   / 2;
  const showCard = sheetHeight >= midHandleCard && sheetHeight < midCardList;
  const showList = sheetHeight >= midCardList;
  // Defer strip in card band until drag ends — mounting listings during touchmove janks the sheet.
  const showListingStrip = showList || (showCard && !selectedSublet && !isDragging);

  // ── Filter chip active states ────────────────────────────────────────────────
  const typeActive  = !!filters.type;
  const priceActive = filters.minPrice !== 0 || filters.maxPrice !== PRICE_MAX;
  const datesActive = !!filters.startDate || !!filters.endDate;

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col overflow-hidden bg-white">

      {/* ── Header ── */}
      <div className="bg-white shrink-0 px-4 pt-4 pb-3 space-y-3 border-b border-slate-100">

        {/* Row 1: Logo + Pickers + Avatar */}
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center shrink-0">
            <img src="/logo.png" alt="SubHub" className="h-16 w-auto mix-blend-multiply" />
          </Link>

          <div className="flex-1" />

          <MiniPicker
            value={currency}
            options={[
              { value: CurrencyCode.ILS, label: '₪ ILS', display: <><span className="font-black text-[#4A7CC7]">₪</span> ILS</> },
              { value: CurrencyCode.USD, label: '$ USD', display: <><span className="font-black text-[#4A7CC7]">$</span> USD</> },
              { value: CurrencyCode.EUR, label: '€ EUR', display: <><span className="font-black text-[#4A7CC7]">€</span> EUR</> },
              { value: CurrencyCode.GBP, label: '£ GBP', display: <><span className="font-black text-[#4A7CC7]">£</span> GBP</> },
            ]}
            onChange={v => setCurrency(v as CurrencyCode)}
          />
          <MiniPicker
            value={language}
            options={[
              { value: Language.EN, label: 'EN', display: <><img src="https://flagcdn.com/w20/us.png" alt="EN" className="w-4 h-3 rounded-sm object-cover" /> EN</> },
              { value: Language.HE, label: 'HE', display: <><img src="https://flagcdn.com/w20/il.png" alt="HE" className="w-4 h-3 rounded-sm object-cover" /> HE</> },
              { value: Language.FR, label: 'FR', display: <><img src="https://flagcdn.com/w20/fr.png" alt="FR" className="w-4 h-3 rounded-sm object-cover" /> FR</> },
              { value: Language.RU, label: 'RU', display: <><img src="https://flagcdn.com/w20/ru.png" alt="RU" className="w-4 h-3 rounded-sm object-cover" /> RU</> },
              { value: Language.ES, label: 'ES', display: <><img src="https://flagcdn.com/w20/es.png" alt="ES" className="w-4 h-3 rounded-sm object-cover" /> ES</> },
              { value: Language.DE, label: 'DE', display: <><img src="https://flagcdn.com/w20/de.png" alt="DE" className="w-4 h-3 rounded-sm object-cover" /> DE</> },
              { value: Language.PT, label: 'PT', display: <><img src="https://flagcdn.com/w20/pt.png" alt="PT" className="w-4 h-3 rounded-sm object-cover" /> PT</> },
              { value: Language.UK, label: 'UK', display: <><img src="https://flagcdn.com/w20/ua.png" alt="UK" className="w-4 h-3 rounded-sm object-cover" /> UK</> },
              { value: Language.IT, label: 'IT', display: <><img src="https://flagcdn.com/w20/it.png" alt="IT" className="w-4 h-3 rounded-sm object-cover" /> IT</> },
              { value: Language.ZH, label: 'ZH', display: <><img src="https://flagcdn.com/w20/cn.png" alt="ZH" className="w-4 h-3 rounded-sm object-cover" /> ZH</> },
            ]}
            onChange={handleLanguageChange}
          />

          {user ? (
            <div className="relative">
              <button onClick={() => setProfileOpen(v => !v)}
                className="w-9 h-9 rounded-full overflow-hidden border-2 border-slate-200 focus:outline-none">
                {firebaseUser?.photoURL ? (
                  <img src={firebaseUser.photoURL} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-[#4A7CC7] flex items-center justify-center text-white text-xs font-black">
                    {initials}
                  </div>
                )}
              </button>
              {profileOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />
                  <div className="absolute right-0 mt-2 w-44 bg-white border border-slate-200 rounded-2xl shadow-xl py-1.5 z-50 overflow-hidden">
                    <Link href="/profile" onClick={() => setProfileOpen(false)}
                      className="block px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                      Profile
                    </Link>
                    <Link href="/messages" onClick={() => setProfileOpen(false)}
                      className="block px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                      Messages
                    </Link>
                    <div className="border-t border-slate-100 mt-1">
                      <button onClick={() => { logout(); setProfileOpen(false); }}
                        className="w-full text-left px-4 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50">
                        Sign Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button onClick={() => setHeaderAuthOpen(true)}
              className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </button>
          )}
        </div>

        {/* Row 2: Search */}
        <SearchAutocomplete
          value={searchQuery}
          onChange={setSearchQuery}
          sublets={sublets}
          placeholder="Search neighborhood or city..."
          className="w-full"
          inputClassName="w-full py-3 pl-11 pr-4 text-sm bg-slate-100 rounded-2xl border-2 border-transparent focus:border-[#4A7CC7] focus:bg-white transition-all focus:outline-none font-medium text-slate-700 placeholder:text-slate-400"
          onCitySelect={city => {
            const center = CITY_CENTERS[city];
            if (center) setCityFlyTo(center);
          }}
        />

        {/* Row 3: Filter chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {/* All Filters — leftmost */}
          <button
            onClick={() => setDrawerOpen(true)}
            className={`relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-full shrink-0 transition-all duration-150 active:scale-95 text-[13px] font-medium ${
              activeFilterCount > 0
                ? 'bg-[#4A7CC7] text-white font-semibold shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
            aria-label="All filters"
          >
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              <circle cx="8"  cy="6"  r="1.5" fill="currentColor" stroke="none" />
              <circle cx="16" cy="12" r="1.5" fill="currentColor" stroke="none" />
              <circle cx="10" cy="18" r="1.5" fill="currentColor" stroke="none" />
            </svg>
            Filters
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 bg-white/20 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Divider */}
          <div className="w-px h-5 bg-slate-200 shrink-0 mx-0.5" />

          {([
            { label: 'Type',  active: typeActive },
            { label: 'Price', active: priceActive },
            { label: 'Dates', active: datesActive },
          ] as Array<{ label: string; active: boolean }>).map(chip => (
            <button
              key={chip.label}
              onClick={() => setDrawerOpen(true)}
              className={`flex items-center gap-1 px-3.5 py-1.5 rounded-full text-[13px] whitespace-nowrap shrink-0 transition-all duration-150 active:scale-95 ${
                chip.active
                  ? 'bg-[#4A7CC7] text-white font-semibold shadow-sm'
                  : 'bg-slate-100 text-slate-600 font-medium hover:bg-slate-200'
              }`}
            >
              {chip.active && <span className="w-1.5 h-1.5 rounded-full bg-white/70 shrink-0" />}
              {chip.label}
              <svg className={`w-3 h-3 shrink-0 ${chip.active ? 'opacity-70' : 'opacity-40'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          ))}
        </div>
      </div>

      {/* ── Map + Bottom Sheet ── */}
      <div ref={containerRef} className="flex-1 relative overflow-hidden">

        {/* Map — shrinks as sheet rises */}
        <div
          className="absolute inset-x-0 top-0"
          style={{
            bottom: sheetHeight,
            transition: isDragging ? 'none' : 'bottom 0.3s cubic-bezier(0.4,0,0.2,1)',
          }}>
          <MapVisualizer
            sublets={filteredSublets}
            onMarkerClick={handleMarkerClick}
            onDeselect={() => {
              setSelectedId(undefined);
              setSheetHeight(SNAP_HANDLE);
              sheetHRef.current = SNAP_HANDLE;
            }}
            selectedSubletId={selectedId}
            language={language}
            flyToCity={cityFlyTo}
            mapInstanceRef={mapInstanceRef}
          />
        </div>

        {/* Bottom Sheet */}
        <div
          className="absolute left-0 right-0 bottom-0 bg-white rounded-t-3xl z-10 flex flex-col overflow-hidden"
          style={{
            height: sheetHeight,
            boxShadow: sheetHeight > SNAP_HANDLE + 10 ? '0 -8px 32px rgba(0,0,0,0.12)' : 'none',
            transition: isDragging
              ? 'none'
              : 'height 0.3s cubic-bezier(0.4,0,0.2,1), box-shadow 0.3s',
          }}>

          {/* Drag handle */}
          <div
            ref={handleRef}
            className="flex justify-center py-4 shrink-0 touch-none cursor-grab active:cursor-grabbing select-none">
            <div className="w-9 h-1.5 bg-slate-300 rounded-full" />
          </div>

          {/* Card zone */}
          {showCard && selectedSublet && (
            <div className="flex-1 overflow-hidden">
              <SelectedCard
                sublet={selectedSublet}
                currency={currency}
                isSaved={savedIds.has(selectedSublet.id)}
                onSave={e => handleSave(e, selectedSublet.id)}
              />
            </div>
          )}

          {/* List zone */}
          {showListingStrip && (
            <>
              <div className="px-4 pb-2 shrink-0 flex items-center justify-between">
                <p className="text-sm font-bold text-slate-800">
                  {isLoading
                    ? <span className="inline-block w-24 h-4 bg-slate-200 rounded-full animate-pulse" />
                    : `${filteredSublets.length} rental${filteredSublets.length !== 1 ? 's' : ''}`}
                </p>
                {activeFilterCount > 0 && (
                  <button onClick={handleClearFilters} className="text-xs text-[#4A7CC7] font-semibold">
                    Clear filters
                  </button>
                )}
              </div>

              <div
                ref={cardListRef}
                className="flex-1 overflow-x-auto overflow-y-hidden px-4 pb-4"
                style={{ scrollbarWidth: 'none' } as React.CSSProperties}>
                <div className="flex gap-3 h-full items-start">
                  {isLoading
                    ? Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="flex-shrink-0 w-48 rounded-2xl overflow-hidden animate-pulse">
                          <div className="aspect-[4/3] bg-slate-200" />
                          <div className="p-2.5 bg-white space-y-1.5">
                            <div className="h-3 bg-slate-200 rounded w-3/4" />
                            <div className="h-2 bg-slate-100 rounded w-1/2" />
                          </div>
                        </div>
                      ))
                    : filteredSublets.length === 0
                    ? (
                        <div className="flex items-center justify-center w-full py-8">
                          <div className="text-center">
                            <svg className="w-10 h-10 text-slate-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-slate-600 font-semibold text-sm">No listings found</p>
                            {activeFilterCount > 0 && (
                              <button onClick={handleClearFilters}
                                className="mt-2 text-xs text-[#4A7CC7] font-semibold">
                                Clear filters
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    : filteredSublets.map(s => (
                        <div key={s.id} ref={el => { cardRefs.current[s.id] = el; }}>
                          <MiniCard
                            sublet={s}
                            isSelected={selectedId === s.id}
                            isSaved={savedIds.has(s.id)}
                            currency={currency}
                            onTap={() => {
                              setSelectedId(s.id);
                              setSheetHeight(SNAP_CARD);
                              sheetHRef.current = SNAP_CARD;
                            }}
                            onSave={e => handleSave(e, s.id)}
                          />
                        </div>
                      ))
                  }
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <MobileTabBar variant="embedded" />

      {/* ── Filters Drawer ── */}
      <FiltersDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        filters={filters}
        onFiltersChange={setFilters}
        onClear={handleClearFilters}
        resultCount={filteredSublets.length}
      />

      {/* Auth modal — save flow */}
      {showSignInModal && (
        <AuthModal
          reason="save"
          initialMode="signup"
          onSuccess={() => setToastMessage('Saved ♡')}
          onClose={closeSignInModal}
        />
      )}

      {/* Auth modal — header sign in */}
      {headerAuthOpen && (
        <AuthModal reason="general" initialMode="signup" onClose={() => setHeaderAuthOpen(false)} />
      )}

      {toastMessage && (
        <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
      )}
    </div>
  );
}
