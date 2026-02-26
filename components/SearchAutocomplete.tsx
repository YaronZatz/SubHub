'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Sublet } from '../types';
import { SearchIcon } from './Icons';

interface SearchAutocompleteProps {
  value: string;
  onChange: (query: string) => void;
  sublets: Sublet[];
  placeholder?: string;
  className?: string;
  /** Classes for the <input> element itself (excluding pl-* and pr-* — managed internally) */
  inputClassName?: string;
}

function HighlightMatch({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <span className="font-bold text-slate-900">{text.slice(idx, idx + q.length)}</span>
      {text.slice(idx + q.length)}
    </>
  );
}

type SectionItem = { label: string; flatIdx: number };
type Section = { label: string; icon: string; items: SectionItem[] };

const SearchAutocomplete: React.FC<SearchAutocompleteProps> = ({
  value,
  onChange,
  sublets,
  placeholder = 'Search...',
  className = '',
  inputClassName = 'w-full py-2 bg-slate-100 rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none border border-transparent focus:bg-white',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Build deduplicated suggestion pools from all loaded listings
  const { neighborhoods, streets, cities } = useMemo(() => {
    const ns = new Set<string>();
    const sts = new Set<string>();
    const cs = new Set<string>();
    sublets.forEach(s => {
      if (s.neighborhood?.trim()) ns.add(s.neighborhood.trim());
      if (s.location?.trim()) {
        const st = s.location.split(',')[0].trim();
        if (st) sts.add(st);
      }
      if (s.city?.trim()) cs.add(s.city.trim());
    });
    return {
      neighborhoods: Array.from(ns).sort(),
      streets: Array.from(sts).sort(),
      cities: Array.from(cs).sort(),
    };
  }, [sublets]);

  // Filter, group, and annotate with flat indices for keyboard nav
  const sections: Section[] = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return [];
    const result: Section[] = [];
    let idx = 0;

    const mn = neighborhoods.filter(n => n.toLowerCase().includes(q)).slice(0, 4);
    if (mn.length) result.push({ label: 'Neighborhoods', icon: '🏘', items: mn.map(label => ({ label, flatIdx: idx++ })) });

    const ms = streets.filter(s => s.toLowerCase().includes(q)).slice(0, 4);
    if (ms.length) result.push({ label: 'Streets', icon: '📍', items: ms.map(label => ({ label, flatIdx: idx++ })) });

    const mc = cities.filter(c => c.toLowerCase().includes(q)).slice(0, 4);
    if (mc.length) result.push({ label: 'Cities', icon: '🏙', items: mc.map(label => ({ label, flatIdx: idx++ })) });

    return result;
  }, [value, neighborhoods, streets, cities]);

  const totalItems = sections.reduce((sum, s) => sum + s.items.length, 0);

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

  const select = (label: string) => {
    onChange(label);
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
        e.preventDefault();
        if (highlightedIndex >= 0) {
          const flat = sections.flatMap(s => s.items);
          const item = flat[highlightedIndex];
          if (item) select(item.label);
        } else {
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
        placeholder={placeholder}
        autoComplete="off"
        className={`pl-10 ${value ? 'pr-8' : 'pr-4'} ${inputClassName}`}
      />

      {/* Clear button */}
      {value && (
        <button
          type="button"
          onClick={() => { onChange(''); setIsOpen(false); }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors z-10"
          aria-label="Clear search"
          tabIndex={-1}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      {/* Dropdown */}
      {isOpen && sections.length > 0 && (
        <div className="absolute z-[100] mt-1 w-full bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
          {sections.map(section => (
            <div key={section.label}>
              <div className="px-4 pt-3 pb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                {section.label}
              </div>
              {section.items.map(({ label, flatIdx }) => (
                <div
                  key={label}
                  className={`px-4 py-2.5 text-sm text-slate-700 cursor-pointer flex items-center gap-2.5 transition-colors ${
                    highlightedIndex === flatIdx ? 'bg-slate-50' : 'hover:bg-slate-50'
                  }`}
                  onMouseEnter={() => setHighlightedIndex(flatIdx)}
                  onClick={() => select(label)}
                >
                  <span className="text-base leading-none shrink-0">{section.icon}</span>
                  <HighlightMatch text={label} query={value} />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchAutocomplete;
