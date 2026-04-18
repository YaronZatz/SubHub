/**
 * Versioned Gemini extraction prompt for Stage 4.
 *
 * Bump EXTRACT_PROMPT_VERSION whenever the prompt changes, so the version tag
 * propagates into listings.prompt_version and all gemini_calls records.
 * Run the eval harness before shipping any prompt change:
 *   node eval/run-extract-eval.js
 */

export const EXTRACT_PROMPT_VERSION = 'v1.0';
export const EXTRACT_MODEL = 'gemini-2.5-flash';

export function buildExtractionPrompt(postText: string, groupName?: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const groupHint = groupName
    ? `\nFACEBOOK GROUP CONTEXT: This post is from the group "${groupName}". Use the group name to resolve location ambiguity — the listing is almost certainly in that group's city/country.\n`
    : '';

  return `Extract structured data from this sublet/rental Facebook post. Handle any language: Hebrew, English, Spanish, German, French, Russian, Arabic, or others.
${groupHint}
TODAY'S DATE: ${today}

Return strict JSON. Follow every rule below exactly.

━━━ LOCATION RULES (most important) ━━━
- Extract location fields in the ORIGINAL language of the post.
- For Hebrew, Arabic, or Cyrillic scripts: also provide the Latin transliteration as an alternative spelling inside extraction_notes (e.g., "Latin: Dizengoff Street").
- city: common English name only, no country suffix (e.g., "Tel Aviv" not "Tel Aviv-Yafo").
- neighborhood: ONLY if explicitly stated in the post. Do NOT infer from city.
- street: ONLY if explicitly stated. Do NOT infer from neighborhood.
- street_number: ONLY if a building/house number appears alongside a street name.
- landmarks: notable nearby places mentioned (e.g., "near Central Station", "next to the park").
- extraction_confidence:
    "exact"        = street name + number are both stated explicitly (e.g., "Dizengoff 42")
    "street"       = street name stated but no number (e.g., "Dizengoff Street")
    "neighborhood" = only neighborhood or area stated, no street (e.g., "Florentin", "Mitte")
    "none"         = city only, vague area, or no location at all
- extraction_notes: REQUIRED — explain your confidence choice in one sentence. If you are guessing or uncertain, say so.
- CRITICAL: If you are not sure, return null. Do NOT invent street names, neighborhoods, or cities.

━━━ PRICE RULES ━━━
- price: number only (0 if unknown)
- currency: detect from symbols ($ = USD, € = EUR, ₪ or NIS = ILS, £ = GBP). Infer from city/country if no symbol.

━━━ DATE RULES ━━━
- Dates in ISO YYYY-MM-DD; null if not mentioned.
- Year inference: when only day/month is given (e.g., "7/3", "March 7"), pick the nearest future occurrence from today.
- immediate_availability: true for "now", "immediately", "available now".
- duration: human-readable if no exact end date (e.g., "2 months").

━━━ ROOMS RULES ━━━
- Israeli room count convention: 3 rooms = 2 bedrooms + living room.
- floor_area_unit: "sqm" or "sqft".

━━━ AMENITIES RULES ━━━
- Set each boolean to true ONLY if explicitly mentioned in the post.

━━━ OTHER RULES ━━━
- type: exactly "Entire Place", "Room in Shared", or "Studio".
- ai_summary: one Airbnb-style marketing sentence in English (evocative, factual, 10–15 words). Always English regardless of post language.

POST TEXT:
"${postText}"`;
}
