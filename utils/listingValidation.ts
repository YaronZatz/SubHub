/**
 * Central validation and sanitization for listing form data.
 * Use in AddListingModal, EditListingModal, and any API that accepts listing payloads.
 */

const MAX_TEXT = 2000;
const MAX_LOCATION = 300;
const MAX_CITY = 100;
const MAX_NEIGHBORHOOD = 150;
const PRICE_MIN = 0;
const PRICE_MAX = 500_000;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

function stripScriptTagsAndLimit(text: string, maxLen: number): string {
  const stripped = text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .trim();
  return stripped.slice(0, maxLen);
}

function trimAndLimit(s: string, maxLen: number): string {
  return s.trim().slice(0, maxLen);
}

export interface ListingFormData {
  location: string;
  price: number | string;
  city?: string;
  neighborhood?: string;
  startDate: string;
  endDate: string;
  description?: string;
  type?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  sanitized?: Partial<ListingFormData>;
}

/**
 * Validate and sanitize listing form fields. Returns errors for UI and optional sanitized values.
 */
export function validateListingForm(data: ListingFormData): ValidationResult {
  const errors: string[] = [];

  const location = trimAndLimit(data.location, MAX_LOCATION);
  if (!location) {
    errors.push('Location is required.');
  }

  const priceNum = typeof data.price === 'string' ? parseFloat(data.price) : data.price;
  if (Number.isNaN(priceNum) || priceNum < PRICE_MIN || priceNum > PRICE_MAX) {
    errors.push(`Price must be a number between ${PRICE_MIN} and ${PRICE_MAX}.`);
  }

  if (!data.startDate?.trim()) {
    errors.push('Start date is required.');
  }
  const startDate = data.startDate?.trim() || '';
  const endDate = (data.endDate?.trim() || '').slice(0, 10);
  if (startDate && endDate) {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    if (!Number.isNaN(start) && !Number.isNaN(end) && end < start) {
      errors.push('End date must be on or after start date.');
    }
  }

  const city = data.city != null ? trimAndLimit(String(data.city), MAX_CITY) : '';
  const neighborhood = data.neighborhood != null ? trimAndLimit(String(data.neighborhood), MAX_NEIGHBORHOOD) : '';
  const description = data.description != null ? stripScriptTagsAndLimit(String(data.description), MAX_TEXT) : '';

  return {
    valid: errors.length === 0,
    errors,
    sanitized: {
      location: location || undefined,
      price: Number.isNaN(priceNum) ? undefined : priceNum,
      city: city || undefined,
      neighborhood: neighborhood || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      description: description || undefined,
    },
  };
}

/**
 * Auth input validation. Returns an error message or null if valid.
 */
export function validateAuthEmail(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) return 'Email is required.';
  if (!EMAIL_REGEX.test(trimmed)) return 'Please enter a valid email address.';
  return null;
}

export function validateAuthPassword(password: string, isSignup: boolean): string | null {
  if (!password) return 'Password is required.';
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  return null;
}

export function validateAuthName(name: string): string | null {
  if (!name.trim()) return 'Name is required.';
  return null;
}
