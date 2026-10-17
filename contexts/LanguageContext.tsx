"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language } from '../types';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(Language.EN);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('subhub_lang');
      // Only English and Hebrew are offered; anything else saved earlier falls back to English.
      if (saved === Language.HE || saved === Language.EN) setLanguageState(saved);
      else if (saved) localStorage.setItem('subhub_lang', Language.EN);
    } catch {
      // localStorage unavailable
    }
  }, []);

  // Keep <html lang/dir> in sync with the language — including the one restored
  // from localStorage on load, so Hebrew pages are RTL after a reload too.
  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = language === Language.HE ? 'rtl' : 'ltr';
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('subhub_lang', lang);
    }
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
