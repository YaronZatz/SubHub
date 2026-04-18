/**
 * Firestore document types for the 8-stage SubHub ingestion pipeline.
 *
 * Collections:
 *   raw_posts/{postId}         — every post from Apify, never deleted
 *   listing_sources/{sourceId} — N:1 mapping of raw posts to a listing
 *   listings/{listingId}       — the published unit (shared with Next.js frontend)
 *   gemini_calls/{callId}      — observability: every Gemini call
 *   geocoding_calls/{callId}   — observability: every Google Maps call
 */

// ─── Stage enums ──────────────────────────────────────────────────────────────

export type RawPostStage = 'ingested' | 'filtered' | 'deduped' | 'rejected';

export type ListingStage =
  | 'pending_extraction'
  | 'extracted'
  | 'geocoded'
  | 'scored'
  | 'titled'
  | 'published'
  | 'rejected';

/** Gemini extraction confidence — how precisely the location was identified. */
export type ExtractionConfidence = 'exact' | 'street' | 'neighborhood' | 'none';

/**
 * Authoritative pin status.
 * - exact        → pin at street + number coords
 * - street       → pin at street centerline
 * - approximate  → pin at neighborhood centroid (or no geocodable pin, listed in sidebar)
 * - rejected     → no usable location, listing not published
 */
export type PinStatus = 'exact' | 'street' | 'approximate' | 'rejected';

export type FilterStatus = 'passed' | 'rejected';

export type RejectedReason = 'no_photos' | 'text_too_short' | 'banned_author' | 'broken_images';

// ─── raw_posts ────────────────────────────────────────────────────────────────

export interface RawPost {
  /** Apify post ID */
  apify_id: string;
  /** ISO timestamp of when Apify scraped this */
  scraped_at: string;
  /** Facebook author user ID */
  author_id: string;
  group_url: string;
  group_name?: string;
  /** Normalized post text (all text fields joined) */
  text: string;
  /** Original CDN image URLs from Apify */
  photo_urls: string[];
  /** Phone numbers extracted by Stage 1 regex, normalized */
  phone_numbers: string[];
  /** SHA-256 of normalized text (lowercase, stripped), first 16 hex chars */
  text_hash: string;
  /** pHash of each image — populated in v1.1, empty array initially */
  image_phashes: string[];
  pipeline_stage: RawPostStage;
  filter_status?: FilterStatus;
  rejected_reason?: RejectedReason;
  /** Set by Stage 3 when this post is linked to an existing listing (dup) */
  canonical_listing_id?: string;
  /** Set by Stage 3 when a new listing is created from this post */
  created_listing_id?: string;
  /** Facebook post URL (normalized) */
  source_url?: string;
}

// ─── listing_sources ─────────────────────────────────────────────────────────

export interface ListingSource {
  raw_post_id: string;
  listing_id: string;
  /** True for the original post; false for re-listings / cross-group posts */
  is_canonical: boolean;
  /** Which dedup signals matched, e.g. ["text_hash", "author_jaccard"] */
  dedup_signals_matched: string[];
  created_at: number;
}

// ─── listings ─────────────────────────────────────────────────────────────────

export interface Listing {
  // Stage 3 (Dedupe) ─────────────────────────────────────────────────────────
  canonical_post_id: string;
  pipeline_stage: ListingStage;
  source_url?: string;
  original_text?: string;
  images_cdn?: string[];   // CDN URLs from Stage 3, uploaded to Storage at Stage 8

  // Stage 4 (Extract) ────────────────────────────────────────────────────────
  language_detected?: string;
  country?: string | null;
  city?: string | null;
  neighborhood?: string | null;
  street?: string | null;
  street_number?: string | null;
  landmarks?: string[];
  extraction_confidence?: ExtractionConfidence;
  extraction_notes?: string;
  extractor_version?: string;
  prompt_version?: string;
  // Other extracted fields:
  price?: number;
  currency?: string;
  startDate?: string;
  endDate?: string;
  type?: string;
  parsedRooms?: Record<string, unknown> | null;
  parsedAmenities?: Record<string, unknown> | null;

  // Stage 5 (Geocode) ────────────────────────────────────────────────────────
  lat?: number | null;
  lng?: number | null;
  geocode_location_type?: string;
  /** City extracted from Google Maps address_components — used for city mismatch check */
  geocode_city?: string;

  // Stage 6 (Score) ──────────────────────────────────────────────────────────
  pin_status?: PinStatus;
  decision_reason?: string;

  // Stage 7 (Title) ──────────────────────────────────────────────────────────
  titles_by_lang?: Record<string, string>;

  // Stage 8 (Publish) ────────────────────────────────────────────────────────
  status?: string;
  published_at?: number;
  /** Firebase Storage URLs (permanent) — populated at Stage 8 */
  images?: string[];

  // Metadata ─────────────────────────────────────────────────────────────────
  createdAt?: number;
  parserVersion?: string;

  // Legacy fields — kept for backward compat with existing frontend during migration
  location?: string;
  fullAddress?: string | null;
  locationConfidence?: string | null;
  ai_summary?: string;
  countryCode?: string | null;
  needs_review?: boolean;
  posterName?: string;
  likesCount?: number;
  commentsCount?: number;
  postedAt?: string | null;
  contentHash?: string;
}

// ─── Extraction response from Gemini (Stage 4) ───────────────────────────────

export interface GeminiExtractionResponse {
  language_detected?: string;
  country?: string | null;
  city?: string | null;
  neighborhood?: string | null;
  street?: string | null;
  street_number?: string | null;
  landmarks?: string[];
  extraction_confidence: ExtractionConfidence;
  extraction_notes?: string;
  price?: number;
  currency?: string;
  start_date?: string | null;
  end_date?: string | null;
  is_flexible?: boolean;
  duration?: string;
  immediate_availability?: boolean;
  type?: string;
  rooms?: Record<string, unknown>;
  amenities?: Record<string, unknown>;
  ai_summary?: string;
}

// ─── Geocoding result (Stage 5) ───────────────────────────────────────────────

export interface GeocodingResult {
  lat: number;
  lng: number;
  /** ROOFTOP | RANGE_INTERPOLATED | GEOMETRIC_CENTER | APPROXIMATE */
  location_type: string;
  partial_match: boolean;
  /** City string extracted from Google Maps address_components */
  city_from_google?: string;
  query_used: string;
  full_response: Record<string, unknown>;
}

// ─── Observability logs ────────────────────────────────────────────────────────

export interface GeminiCallLog {
  listing_id: string;
  call_type: 'extract' | 'title';
  prompt_version: string;
  model_version: string;
  input: string;
  output: string;
  latency_ms: number;
  created_at: number;
}

export interface GeocodingCallLog {
  listing_id: string;
  query: string;
  response: Record<string, unknown>;
  location_type?: string;
  partial_match?: boolean;
  created_at: number;
}
