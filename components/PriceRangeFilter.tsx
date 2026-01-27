
import React, { useState, useEffect, useCallback } from 'react';
import { Language } from '../types';
import { translations } from '../translations';
import { useCurrency } from '../contexts/CurrencyContext';
import { getCurrencySymbol } from '../utils/formatters';

interface PriceRangeFilterProps {
  min: number;
  max: number;
  minLimit?: number;
  maxLimit?: number;
  language: Language;
  onChange: (min: number, max: number) => void;
}

const PriceRangeFilter: React.FC<PriceRangeFilterProps> = ({
  min,
  max,
  minLimit = 0,
  maxLimit = 20000,
  language,
  onChange,
}) => {
  const t = translations[language];
  const { currency: currentCurrencyCode } = useCurrency();
  const currencySymbol = getCurrencySymbol(currentCurrencyCode);
  
  const [localMin, setLocalMin] = useState(min);
  const [localMax, setLocalMax] = useState(max);

  // Update local state when props change (e.g., filter reset)
  useEffect(() => {
    setLocalMin(min);
    setLocalMax(max);
  }, [min, max]);

  // Debounce the parent update
  useEffect(() => {
    const handler = setTimeout(() => {
      if (localMin !== min || localMax !== max) {
        onChange(localMin, localMax);
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [localMin, localMax, onChange, min, max]);

  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.min(Number(e.target.value), localMax - 100);
    setLocalMin(value);
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(Number(e.target.value), localMin + 100);
    setLocalMax(value);
  };

  const getPercent = useCallback(
    (value: number) => Math.round(((value - minLimit) / (maxLimit - minLimit)) * 100),
    [minLimit, maxLimit]
  );

  return (
    <div className="w-full space-y-6 pt-2 pb-4 px-1">
      <div className="flex items-center justify-between mb-1">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.priceRange}</label>
        <div className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full dir-ltr">
          {currencySymbol}{localMin.toLocaleString()} – {currencySymbol}{localMax >= maxLimit ? `${localMax.toLocaleString()}+` : localMax.toLocaleString()}
        </div>
      </div>

      {/* Range Slider Container */}
      <div className="relative h-6 flex items-center">
        <div className="absolute w-full h-1.5 bg-slate-200 rounded-full" />
        <div
          className="absolute h-1.5 bg-indigo-600 rounded-full transition-all duration-100"
          style={{
            left: `${getPercent(localMin)}%`,
            right: `${100 - getPercent(localMax)}%`,
          }}
        />

        {/* Dual Inputs */}
        <input
          type="range"
          min={minLimit}
          max={maxLimit}
          step={100}
          value={localMin}
          onChange={handleMinChange}
          className="absolute w-full appearance-none pointer-events-none bg-transparent z-20 slider-thumb-indigo"
        />
        <input
          type="range"
          min={minLimit}
          max={maxLimit}
          step={100}
          value={localMax}
          onChange={handleMaxChange}
          className="absolute w-full appearance-none pointer-events-none bg-transparent z-20 slider-thumb-indigo"
        />
      </div>

      {/* Manual Input Fields */}
      <div className="flex items-center gap-3">
        <div className="flex-1 space-y-1">
          <span className="text-[9px] font-bold text-slate-400 uppercase ml-1">{t.minPrice}</span>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">{currencySymbol}</span>
            <input
              type="number"
              value={localMin}
              onChange={(e) => setLocalMin(Math.min(Number(e.target.value), localMax))}
              className="w-full pl-7 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
            />
          </div>
        </div>
        <div className="flex-1 space-y-1">
          <span className="text-[9px] font-bold text-slate-400 uppercase ml-1">{t.maxPrice}</span>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">{currencySymbol}</span>
            <input
              type="number"
              value={localMax}
              onChange={(e) => setLocalMax(Math.max(Number(e.target.value), localMin))}
              className="w-full pl-7 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
            />
          </div>
        </div>
      </div>

      <style>{`
        .slider-thumb-indigo::-webkit-slider-thumb {
          appearance: none;
          pointer-events: auto;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: white;
          border: 2px solid #4f46e5;
          cursor: grab;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
          transition: transform 0.1s ease;
        }
        .slider-thumb-indigo::-webkit-slider-thumb:active {
          cursor: grabbing;
          transform: scale(1.1);
        }
        .slider-thumb-indigo::-moz-range-thumb {
          appearance: none;
          pointer-events: auto;
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: white;
          border: 2px solid #4f46e5;
          cursor: grab;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
        }
      `}</style>
    </div>
  );
};

export default PriceRangeFilter;
