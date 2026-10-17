'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Sublet } from '../types';
import { SearchIcon } from './Icons';
import { GLOBAL_CITIES } from '../constants';
import { useLanguage } from '../contexts/LanguageContext';
import { homeCopy } from '../lib/homeCopy';
import { cityFor, neighborhoodFor, inLanguage } from '../lib/placeNames';

type Section = 'Cities' | 'Neighborhoods' | 'Streets';
/** `value` is the stored name (used for map fly-to); `label` is what the user sees, in the UI language. */
interface Suggestion { value: string; label: string }

interface SearchAutocompleteProps {
  value: string;
  onChange: (query: string) => void;
  sublets: Sublet[];
  placeholder?: string;
  className?: string;
  /** Classes for the <input> element itself (excluding pl-* and pr-* — managed internally) */
  inputClassName?: string;
  /** Called when a Cities suggestion is selected — use to trigger map fly-to */
  onCitySelect?: (city: string) => void;
}

function matchesSuggestion(s: Suggestion, q: string): boolean {
  return s.label.toLowerCase().includes(q) || s.value.toLowerCase().includes(q);
}

function HighlightMatch({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return <span>{text.slice(0, idx)}<span className="font-bold text-slate-900">{text.slice(idx, idx + q.length)}</span>{text.slice(idx + q.length)}</span>;
}

const SearchAutocomplete: React.FC<SearchAutocompleteProps> = ({
  value,
  onChange,
  sublets,
  placeholder,
  className = '',
  inputClassName = 'w-full py-2 bg-slate-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-cyan-500 outline-none border border-transparent focus:bg-white',
  onCitySelect,
}) => {
  const { language } = useLanguage();
  const copy = homeCopy(language);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Build deduplicated suggestion pools from all loaded listings. Each name is shown in
  // the UI language; names we only have in the other language are left out.
  const { neighborhoods, streets, cities } = useMemo(() => {
    const ns = new Map<string, Suggestion>();
    const sts = new Map<string, Suggestion>();
    const cs = new Map<string, Suggestion>();
    const addCity = (raw: string) => {
      const label = cityFor(raw, language);
      if (label && !cs.has(label)) cs.set(label, { value: raw, label });
    };
    GLOBAL_CITIES.forEach(addCity);
    sublets.forEach(s => {
      const nb = neighborhoodFor(s.neighborhood, language, s.neighborhoodTranslations);
      if (nb && !ns.has(nb)) ns.set(nb, { value: s.neighborhood!.trim(), label: nb });
      const st = s.location?.split(',')[0].trim();
      if (st && inLanguage(st, language) && !sts.has(st)) sts.set(st, { value: st, label: st });
      if (s.city?.trim()) addCity(s.city.trim());
    });
    const sorted = (m: Map<string, Suggestion>) => Array.from(m.values()).sort((a, b) => a.label.localeCompare(b.label, language));
    return { neighborhoods: sorted(ns), streets: sorted(sts), cities: sorted(cs) };
  }, [sublets, language]);

  // Compute matches for each section independently (match the shown label or the stored name)
  const q = value.trim().toLowerCase();
  const cityMatches         = useMemo(() => q ? cities.filter(s => matchesSuggestion(s, q)).slice(0, 4)        : [], [q, cities]);
  const neighborhoodMatches = useMemo(() => q ? neighborhoods.filter(s => matchesSuggestion(s, q)).slice(0, 4) : [], [q, neighborhoods]);
  const streetMatches       = useMemo(() => q ? streets.filter(s => matchesSuggestion(s, q)).slice(0, 4)       : [], [q, streets]);

  // Flat ordered list for keyboard navigation: cities first, then neighborhoods, then streets
  const flatItems = useMemo(() => [
    ...cityMatches.map(item         => ({ item, sectionLabel: 'Cities'        as Section })),
    ...neighborhoodMatches.map(item => ({ item, sectionLabel: 'Neighborhoods' as Section })),
    ...streetMatches.map(item       => ({ item, sectionLabel: 'Streets'       as Section })),
  ], [cityMatches, neighborhoodMatches, streetMatches]);

  const totalItems   = flatItems.length;
  const showDropdown = isOpen && totalItems > 0;

  useEffect(() => { setHighlightedIndex(-1); }, [value]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const select = (item: Suggestion, sectionLabel: Section) => {
    onChange(item.label);
    if (sectionLabel === 'Cities') onCitySelect?.(item.value);
    setIsOpen(false);
    setHighlightedIndex(-1);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(i => Math.min(i + 1, totalItems - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(i => Math.max(i - 1, -1));
        break;
      case 'Enter':
        if (highlightedIndex >= 0) {
          e.preventDefault();
          const entry = flatItems[highlightedIndex];
          if (entry) select(entry.item, entry.sectionLabel);
        } else {
          // Let Enter fall through so a surrounding <form> can submit free text.
          setIsOpen(false);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setHighlightedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const itemClass = (flatIdx: number) =>
    `px-4 py-2.5 text-sm text-slate-700 cursor-pointer flex items-center gap-2.5 transition-colors ${
      highlightedIndex === flatIdx ? 'bg-slate-50' : 'hover:bg-slate-50'
    }`;

  const sectionHeaderClass = 'px-4 pt-2 pb-1 text-[10px] font-black uppercase tracking-widest text-slate-400';

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Search icon */}
      <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 z-10 pointer-events-none" />

      {/* Input */}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => { onChange(e.target.value); setIsOpen(true); }}
        onFocus={() => setIsOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder ?? copy.searchFallbackPlaceholder}
        autoComplete="off"
        className={`pl-10 ${value ? 'pr-8' : 'pr-4'} ${inputClassName}`}
      />

      {/* Clear button */}
      {value && (
        <button
          type="button"
          onClick={() => { onChange(''); setIsOpen(false); }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors z-10"
          aria-label={copy.clearSearch}
          tabIndex={-1}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      {/* Dropdown — only mounts when there is at least one match */}
      {showDropdown && (
        <div className="absolute z-[100] top-full w-full bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-64 overflow-y-auto">

          {cityMatches.length > 0 && (
            <div>
              <div className={sectionHeaderClass}>🏙 {copy.searchCities}</div>
              {cityMatches.map((item, i) => (
                <div
                  key={item.label}
                  className={itemClass(i)}
                  onMouseEnter={() => setHighlightedIndex(i)}
                  onClick={() => select(item, 'Cities')}
                >
                  <HighlightMatch text={item.label} query={value} />
                </div>
              ))}
            </div>
          )}

          {neighborhoodMatches.length > 0 && (
            <div>
              <div className={sectionHeaderClass}>🏘 {copy.searchNeighborhoods}</div>
              {neighborhoodMatches.map((item, i) => {
                const flatIdx = cityMatches.length + i;
                return (
                  <div
                    key={item.label}
                    className={itemClass(flatIdx)}
                    onMouseEnter={() => setHighlightedIndex(flatIdx)}
                    onClick={() => select(item, 'Neighborhoods')}
                  >
                    <HighlightMatch text={item.label} query={value} />
                  </div>
                );
              })}
            </div>
          )}

          {streetMatches.length > 0 && (
            <div>
              <div className={sectionHeaderClass}>📍 {copy.searchStreets}</div>
              {streetMatches.map((item, i) => {
                const flatIdx = cityMatches.length + neighborhoodMatches.length + i;
                return (
                  <div
                    key={item.label}
                    className={itemClass(flatIdx)}
                    onMouseEnter={() => setHighlightedIndex(flatIdx)}
                    onClick={() => select(item, 'Streets')}
                  >
                    <HighlightMatch text={item.label} query={value} />
                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}
    </div>
  );
};

export default SearchAutocomplete;
