'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';

interface CityAutocompleteProps {
  value: string;
  options: string[];
  placeholder?: string;
  onChange: (city: string) => void;
  onCitySelect?: (city: string) => void;
  className?: string;
}

const CityAutocomplete: React.FC<CityAutocompleteProps> = ({
  value,
  options,
  placeholder = 'All cities',
  onChange,
  onCitySelect,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredOptions = useMemo(() => {
    if (!value.trim()) return options;
    const q = value.toLowerCase().trim();
    return options.filter((city) => city.toLowerCase().includes(q));
  }, [options, value]);

  useEffect(() => {
    setHighlightedIndex(-1);
  }, [value, filteredOptions]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (city: string) => {
    onChange(city);
    onCitySelect?.(city);
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((i) => (i < filteredOptions.length - 1 ? i + 1 : -1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((i) => (i > -1 ? i - 1 : filteredOptions.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex === -1) {
          handleSelect('');
        } else if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
          handleSelect(filteredOptions[highlightedIndex]);
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
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
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
        className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-medium outline-none shadow-sm focus:ring-2 focus:ring-blue-500 cursor-text placeholder:text-slate-400"
      />
      {isOpen && (
        <ul
          id="city-listbox"
          role="listbox"
          className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg py-1 custom-scrollbar"
        >
          <li
            role="option"
            id="city-option-clear"
            aria-selected={!value}
            className={`px-3 py-2.5 text-xs font-medium cursor-pointer hover:bg-slate-50 ${
              highlightedIndex === -1 ? 'bg-slate-50' : ''
            }`}
            onMouseEnter={() => setHighlightedIndex(-1)}
            onClick={() => handleSelect('')}
          >
            {placeholder}
          </li>
          {filteredOptions.map((city, i) => (
            <li
              key={city}
              role="option"
              id={`city-option-${i}`}
              aria-selected={value === city}
              className={`px-3 py-2.5 text-xs font-medium cursor-pointer hover:bg-slate-50 ${
                highlightedIndex === i ? 'bg-slate-50' : ''
              }`}
              onMouseEnter={() => setHighlightedIndex(i)}
              onClick={() => handleSelect(city)}
            >
              {city}
            </li>
          ))}
          {filteredOptions.length === 0 && value.trim() && (
            <li className="px-3 py-2.5 text-xs text-slate-400 italic">
              No matching cities
            </li>
          )}
        </ul>
      )}
    </div>
  );
};

export default CityAutocomplete;
