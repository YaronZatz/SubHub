
import { CurrencyCode } from '../types';
import { getILSBasedRates } from '../lib/currencyService';

const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  [CurrencyCode.ILS]: '₪',
  [CurrencyCode.USD]: '$',
  [CurrencyCode.EUR]: '€',
  [CurrencyCode.GBP]: '£',
};

// Some Firestore docs (parsed by Gemini) store the display symbol instead of the ISO code.
const SYMBOL_TO_CODE: Record<string, CurrencyCode> = {
  '₪': CurrencyCode.ILS,
  '$': CurrencyCode.USD,
  '€': CurrencyCode.EUR,
  '£': CurrencyCode.GBP,
};

/** Coerce a potentially-symbol currency value to a valid ISO 4217 code. */
export function normalizeCurrencyCode(raw: string | undefined | null): CurrencyCode {
  if (!raw) return CurrencyCode.ILS;
  if (SYMBOL_TO_CODE[raw]) return SYMBOL_TO_CODE[raw];
  const upper = raw.toUpperCase();
  if ((Object.values(CurrencyCode) as string[]).includes(upper)) return upper as CurrencyCode;
  return CurrencyCode.ILS;
}

/**
 * Formats a price according to the selected currency and locale.
 * @param amountInBase The amount in the listing's original currency (or ILS if unknown).
 * @param targetCurrency The currency to display.
 * @param locale The language locale for formatting.
 * @param listingCurrency The original currency code from the Firestore listing (e.g. "USD", "EUR").
 */
export const formatPrice = (
  amountInBase: number,
  targetCurrency: CurrencyCode,
  locale: string = 'en-US',
  listingCurrency?: string
): string => {
  // Coerce symbol strings (€, $, £, ₪) that Gemini occasionally writes instead of ISO codes.
  const safeCurrency = normalizeCurrencyCode(targetCurrency);
  const safeListingCurrency = listingCurrency ? normalizeCurrencyCode(listingCurrency) : undefined;

  const ilsRates = getILSBasedRates();
  let priceInILS = amountInBase;
  if (safeListingCurrency && safeListingCurrency !== CurrencyCode.ILS) {
    const rate = ilsRates[safeListingCurrency];
    if (rate && rate > 0) priceInILS = amountInBase / rate;
  }

  const convertedAmount = priceInILS * (ilsRates[safeCurrency] ?? 0.27);

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: safeCurrency,
    maximumFractionDigits: 0,
  }).format(convertedAmount);
};

export const getCurrencySymbol = (code: CurrencyCode): string => {
  return CURRENCY_SYMBOLS[code] || code;
};

/**
 * Formats a date string or timestamp to DD/MM/YYYY.
 */
export const formatDate = (dateValue: string | number | undefined | null): string => {
  if (!dateValue || dateValue === 'null') return '';
  const date = new Date(dateValue);
  if (isNaN(date.getTime())) return String(dateValue);
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  
  return `${day}/${month}/${year}`;
};

/**
 * Converts a value from a source currency back to the base currency (ILS).
 * Useful for filtering when the user types a value in USD.
 */
export const convertToBase = (amount: number, fromCurrency: CurrencyCode): number => {
  const ilsRates = getILSBasedRates();
  return amount / (ilsRates[fromCurrency] ?? 1);
};
