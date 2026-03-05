/**
 * Real-time exchange rate service.
 * Fetches USD-based rates from exchangerate-api.com and caches them for 24 hours
 * in a module-level variable (persists for the browser tab session).
 */

// USD-based rates: 1 USD = N of each currency
const FALLBACK_USD_RATES: Record<string, number> = {
  USD: 1,
  ILS: 3.7,
  EUR: 0.92,
  GBP: 0.79,
};

const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

let cachedUSDRates: Record<string, number> | null = null;
let cacheTimestamp = 0;

/**
 * Fetch live exchange rates and store in module cache.
 * Safe to call multiple times — only fetches when cache is stale.
 */
export async function loadRates(): Promise<void> {
  const now = Date.now();
  if (cachedUSDRates && now - cacheTimestamp < CACHE_TTL) return;
  try {
    const res = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json() as { rates: Record<string, number> };
    cachedUSDRates = data.rates;
    cacheTimestamp = now;
  } catch (err) {
    console.warn('[currencyService] Failed to fetch live rates, using fallback:', err);
    if (!cachedUSDRates) cachedUSDRates = FALLBACK_USD_RATES;
  }
}

/** Returns cached USD-based rates (or fallback if not yet loaded). */
export function getCachedRates(): Record<string, number> {
  return cachedUSDRates ?? FALLBACK_USD_RATES;
}

/**
 * Convert an amount from one currency to another using cached rates.
 * @param amount The amount in `from` currency.
 * @param from   3-letter ISO code of the source currency (e.g. 'USD').
 * @param to     3-letter ISO code of the target currency (e.g. 'ILS').
 */
export function convertAmount(amount: number, from: string, to: string): number {
  if (from === to) return amount;
  const rates = getCachedRates();
  const fromRate = rates[from] ?? 1;
  const toRate = rates[to] ?? 1;
  // Convert to USD first, then to target
  return (amount / fromRate) * toRate;
}

/**
 * Returns ILS-based rates (1 ILS = N of each currency), compatible with
 * the existing formatters.ts EXCHANGE_RATES format.
 */
export function getILSBasedRates(): Record<string, number> {
  const rates = getCachedRates();
  const ilsRate = rates['ILS'] ?? FALLBACK_USD_RATES.ILS;
  const ilsBased: Record<string, number> = {};
  for (const [key, val] of Object.entries(rates)) {
    ilsBased[key] = val / ilsRate;
  }
  return ilsBased;
}
