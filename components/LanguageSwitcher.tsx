
import React, { useState, useRef, useEffect } from 'react';
import { Language } from '../types';

interface LanguageSwitcherProps {
  language: Language;
  setLanguage: (lang: Language) => void;
}

const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ language, setLanguage }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const languages = [
    { code: Language.EN, label: 'English', flagUrl: 'https://flagcdn.com/w40/us.png', alt: 'US' },
    { code: Language.HE, label: 'עברית', flagUrl: 'https://flagcdn.com/w40/il.png', alt: 'IL' },
    { code: Language.FR, label: 'Français', flagUrl: 'https://flagcdn.com/w40/fr.png', alt: 'FR' },
    { code: Language.RU, label: 'Русский', flagUrl: 'https://flagcdn.com/w40/ru.png', alt: 'RU' },
  ];

  const current = languages.find(l => l.code === language) || languages[0];
  const isRTL = language === Language.HE;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 sm:gap-2 px-2 py-1 sm:px-3 sm:py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full transition-all text-[10px] sm:text-xs font-black shadow-sm group border border-transparent hover:border-slate-200"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <img 
            src={current.flagUrl} 
            alt={current.alt} 
            className="w-5 h-3.5 object-cover rounded-[2px] shadow-sm opacity-90 group-hover:opacity-100 transition-opacity" 
        />
        <span className="hidden sm:inline uppercase tracking-wider text-[10px]">{current.code}</span>
        <svg 
          className={`w-3 h-3 transition-transform duration-200 text-slate-400 group-hover:text-slate-600 ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div 
          className={`absolute top-full mt-2 w-40 bg-white border border-slate-100 rounded-2xl shadow-2xl z-[150] overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${isRTL ? 'left-0' : 'right-0'}`}
        >
          <div className="p-1.5 flex flex-col gap-1">
            {languages.map((item) => (
              <button
                key={item.code}
                type="button"
                onClick={() => {
                  setLanguage(item.code);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-xs font-bold rounded-xl transition-all
                  ${language === item.code 
                    ? 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-indigo-600'}
                `}
              >
                <div className="flex items-center gap-3">
                    <img 
                        src={item.flagUrl} 
                        alt={item.alt} 
                        className="w-5 h-3.5 object-cover rounded-[2px] shadow-sm" 
                    />
                    <span>{item.label}</span>
                </div>
                {language === item.code && (
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
