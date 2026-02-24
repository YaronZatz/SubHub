
import { CurrencyCode } from '../types';

// Mock exchange rates (Base: ILS)
// In a real app, these would be fetched from an API
const EXCHANGE_RATES: Record<CurrencyCode, number> = {
  [CurrencyCode.ILS]: 1,
  [CurrencyCode.USD]: 0.27, // 1 ILS = 0.27 USD
  [CurrencyCode.EUR]: 0.25, // 1 ILS = 0.25 EUR
};

const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  [CurrencyCode.ILS]: '₪',
  [CurrencyCode.USD]: '$',
  [CurrencyCode.EUR]: '€',
};

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
  // Normalize to ILS first if the listing is priced in a known non-ILS currency
  let priceInILS = amountInBase;
  if (listingCurrency && listingCurrency !== 'ILS') {
    const rate = EXCHANGE_RATES[listingCurrency as CurrencyCode];
    if (rate && rate > 0) priceInILS = amountInBase / rate;
    // Unknown currencies (GBP etc.) fall through and are treated as ILS
  }

  const convertedAmount = priceInILS * EXCHANGE_RATES[targetCurrency];

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: targetCurrency,
    maximumFractionDigits: 0,
  }).format(convertedAmount);
};

export const getCurrencySymbol = (code: CurrencyCode): string => {
  return CURRENCY_SYMBOLS[code] || code;
};

/**
 * Formats a date string or timestamp to DD/MM/YYYY.
 */
export const formatDate = (dateValue: string | number | undefined): string => {
  if (!dateValue) return '';
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
  return amount / EXCHANGE_RATES[fromCurrency];
};
