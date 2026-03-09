'use client';

import React, { useState, useRef, useEffect } from 'react';
import { importLibrary } from '../lib/googleMapsLoader';

interface CityAutocompleteProps {
  value: string;
  options: string[]; // kept for interface compatibility — Google Places provides suggestions
  placeholder?: string;
  onChange: (city: string) => void;
  onCitySelect?: (city: string) => void;
  className?: string;
}

const PinIcon = () => (
  <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
  </svg>
);

const CityAutocomplete: React.FC<CityAutocompleteProps> = ({
  value,
  options: _options, // unused — Places API provides suggestions
  placeholder = 'All cities',
  onChange,
  onCitySelect,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const serviceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Load Places service once
  useEffect(() => {
    importLibrary('places').then(() => {
      serviceRef.current = new google.maps.places.AutocompleteService();
    }).catch(console.error);
  }, []);

  // Fetch predictions on input change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const query = value.trim();
    if (!query || !serviceRef.current) {
      setPredictions([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const response = await serviceRef.current!.getPlacePredictions({
          input: query,
          types: ['(cities)'],
        });
        setPredictions(response.predictions);
      } catch {
        setPredictions([]);
      }
    }, 300);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [value]);

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

  const handleSelect = (cityName: string) => {
    onChange(cityName);
    onCitySelect?.(cityName);
    setIsOpen(false);
    setPredictions([]);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') { e.preventDefault(); setIsOpen(true); }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(i => (i < predictions.length - 1 ? i + 1 : -1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(i => (i > -1 ? i - 1 : predictions.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex === -1) {
          handleSelect('');
        } else if (predictions[highlightedIndex]) {
          handleSelect(predictions[highlightedIndex].structured_formatting.main_text);
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
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => { onChange(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={isOpen}
          aria-autocomplete="list"
          aria-controls="city-listbox"
          aria-activedescendant={
            highlightedIndex === -1 ? 'city-option-clear' : highlightedIndex >= 0 ? `city-option-${highlightedIndex}` : undefined
          }
          className={`w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-medium outline-none shadow-sm focus:ring-2 focus:ring-cyan-500 cursor-text placeholder:text-slate-400 ${value ? 'pr-8' : ''}`}
        />
        {value && (
          <button
            type="button"
            onClick={() => handleSelect('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Clear city filter"
            tabIndex={-1}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {isOpen && (
        <ul
          id="city-listbox"
          role="listbox"
          className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl py-1 custom-scrollbar"
        >
          {/* "All cities" clear option */}
          <li
            role="option"
            id="city-option-clear"
            aria-selected={!value}
            className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-slate-50 flex items-center gap-2 text-slate-400 italic ${highlightedIndex === -1 ? 'bg-slate-50' : ''}`}
            onMouseEnter={() => setHighlightedIndex(-1)}
            onClick={() => handleSelect('')}
          >
            {placeholder}
          </li>

          {predictions.map((pred, i) => (
            <li
              key={pred.place_id}
              role="option"
              id={`city-option-${i}`}
              aria-selected={false}
              className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-slate-50 flex items-center gap-2 text-slate-600 ${highlightedIndex === i ? 'bg-slate-50' : ''}`}
              onMouseEnter={() => setHighlightedIndex(i)}
              onClick={() => handleSelect(pred.structured_formatting.main_text)}
            >
              <PinIcon />
              <span>
                <span className="font-semibold">{pred.structured_formatting.main_text}</span>
                {pred.structured_formatting.secondary_text && (
                  <span className="text-slate-400 text-xs ml-1">{pred.structured_formatting.secondary_text}</span>
                )}
              </span>
            </li>
          ))}

          {value.trim() && predictions.length === 0 && (
            <li className="px-4 py-2.5 text-sm text-slate-400 italic">
              No matching cities
            </li>
          )}
        </ul>
      )}
    </div>
  );
};

export default CityAutocomplete;
