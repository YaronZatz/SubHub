"use client";
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CurrencyCode } from '../types';

interface CurrencyContextType {
  currency: CurrencyCode;
  setCurrency: (code: CurrencyCode) => void;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // 1. אתחול עם ערך ברירת מחדל בטוח (ללא גישה ל-localStorage)
  const [currency, setCurrencyState] = useState<CurrencyCode>(CurrencyCode.ILS);

  // 2. טעינת הערך מהדפדפן רק לאחר שהרכיב עלה (Mount)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('subhub_currency');
      if (saved) {
        setCurrencyState(saved as CurrencyCode);
      }
    } catch (error) {
      console.error('Failed to access localStorage:', error);
    }
  }, []);

  const setCurrency = (code: CurrencyCode) => {
    setCurrencyState(code);
    // בדיקת הגנה ליתר ביטחון
    if (typeof window !== 'undefined') {
      localStorage.setItem('subhub_currency', code);
    }
  };

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = () => {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};