import { NEIGHBORHOODS, STREETS, LANDMARKS, GeoPoint } from '../data/telAvivGeo';

export interface ExtractionResult {
  location: string;
  neighborhood?: string;
  lat: number;
  lng: number;
  confidence: 'high' | 'medium' | 'low';
  startDate?: string;
  endDate?: string;
  price?: number;
  rooms?: number;
  floor?: number;
}

const DEFAULT = { lat: 32.0853, lng: 34.7818 };

// -------------------------------------------------------------------
// Dictionary lookup — try longer keys first (more specific wins)
// -------------------------------------------------------------------
function findInDict(text: string, dict: Record<string, GeoPoint>): { key: string; geo: GeoPoint } | null {
  const lower = text.toLowerCase();
  const sorted = Object.keys(dict).sort((a, b) => b.length - a.length);
  for (const key of sorted) {
    if (lower.includes(key.toLowerCase())) {
      return { key, geo: dict[key] };
    }
  }
  return null;
}

// -------------------------------------------------------------------
// Street extraction
// -------------------------------------------------------------------
interface StreetMatch { name: string; number?: string; intersect?: string }

function extractHebrewStreet(text: string): StreetMatch | null {
  // "רחוב הירקון פינת זרובבל 5" / "ברחוב דיזנגוף 100" / "שדרות רוטשילד"
  const m = text.match(
    /(?:ב)?(?:רחוב|שדרות|שדרת|סמטת)\s+([\u05D0-\u05EA][\u05D0-\u05EA\s'\-"]{0,25?})(?:\s+פינת\s+([\u05D0-\u05EA][\u05D0-\u05EA\s'\-"]{0,20?}))?(?:\s+(\d{1,4}))?(?=[\s,.\n]|$)/
  );
  if (!m) return null;
  return { name: m[1].trim(), intersect: m[2]?.trim(), number: m[3] };
}

function extractEnglishStreet(text: string): StreetMatch | null {
  // "on Ben Yehuda street" / "123 Dizengoff St"
  const m = text.match(
    /(?:on\s+)?(\d{1,4}\s+)?([A-Za-z][A-Za-z\s\-]{2,30?})\s+(?:street|st\.?|ave(?:nue)?\.?|boulevard|blvd\.?|road|rd\.?)/i
  );
  if (!m) return null;
  return { name: m[2].trim(), number: m[1]?.trim() };
}

// -------------------------------------------------------------------
// Neighborhood extraction (explicit keyword)
// -------------------------------------------------------------------
function extractHebrewNeighborhood(text: string): string | null {
  const m = text.match(/(?:ב)?שכונת\s+([\u05D0-\u05EA][\u05D0-\u05EA\s'\-"]{1,25?})(?=[\s,.\n]|$)/);
  return m ? m[1].trim() : null;
}

// -------------------------------------------------------------------
// Date extraction
// -------------------------------------------------------------------
const HEBREW_MONTHS: Record<string, string> = {
  'ינואר': '01', 'פברואר': '02', 'מרץ': '03', 'מרס': '03',
  'אפריל': '04', 'מאי': '05', 'יוני': '06', 'יולי': '07',
  'אוגוסט': '08', 'ספטמבר': '09', 'אוקטובר': '10', 'נובמבר': '11', 'דצמבר': '12',
};
const ENGLISH_MONTHS: Record<string, string> = {
  'january': '01', 'jan': '01', 'february': '02', 'feb': '02',
  'march': '03', 'mar': '03', 'april': '04', 'apr': '04',
  'may': '05', 'june': '06', 'jun': '06', 'july': '07', 'jul': '07',
  'august': '08', 'aug': '08', 'september': '09', 'sep': '09',
  'october': '10', 'oct': '10', 'november': '11', 'nov': '11',
  'december': '12', 'dec': '12',
};

function pad(n: string) { return n.padStart(2, '0'); }

function extractDates(text: string): { startDate?: string; endDate?: string } {
  // Numeric range: "1.3-15.3" or "1/3 - 15/4" (DD.MM or DD/MM)
  const numRange = text.match(
    /(\d{1,2})[./](\d{1,2})(?:[./]\d{2,4})?\s*[-–]\s*(\d{1,2})[./](\d{1,2})/
  );
  if (numRange) {
    return {
      startDate: `${pad(numRange[1])}.${pad(numRange[2])}`,
      endDate:   `${pad(numRange[3])}.${pad(numRange[4])}`,
    };
  }

  // Hebrew: "מ-1 במרץ עד 15 באפריל"
  const heRange = text.match(
    /מ[- ](\d{1,2})\s+ב([\u05D0-\u05EA]+)\s+עד\s+(\d{1,2})\s+ב([\u05D0-\u05EA]+)/
  );
  if (heRange) {
    const sm = HEBREW_MONTHS[heRange[2]], em = HEBREW_MONTHS[heRange[4]];
    if (sm && em) return { startDate: `${pad(heRange[1])}.${sm}`, endDate: `${pad(heRange[3])}.${em}` };
  }

  // English: "March 1 - April 15" or "March 1-15"
  const monthList = Object.keys(ENGLISH_MONTHS).join('|');
  const enRange = text.match(
    new RegExp(`(${monthList})\\s+(\\d{1,2})\\s*[-–to]+\\s*(?:(${monthList})\\s+)?(\\d{1,2})`, 'i')
  );
  if (enRange) {
    const sm = ENGLISH_MONTHS[enRange[1].toLowerCase()];
    const em = enRange[3] ? ENGLISH_MONTHS[enRange[3].toLowerCase()] : sm;
    if (sm) return { startDate: `${pad(enRange[2])}.${sm}`, endDate: em ? `${pad(enRange[4])}.${em}` : undefined };
  }

  return {};
}

// -------------------------------------------------------------------
// Price extraction
// -------------------------------------------------------------------
function extractPrice(text: string): number | undefined {
  const patterns = [
    /(\d{1,3}(?:,\d{3})*|\d{3,6})\s*(?:₪|שח|ש"ח|שקל)/i,
    /\$\s*(\d{1,3}(?:,\d{3})*|\d{3,6})/,
    /(\d{1,3}(?:,\d{3})*|\d{3,6})\s*(?:ל|per\s*)(?:חודש|month)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return parseInt(m[1].replace(/,/g, ''), 10);
  }
  return undefined;
}

// -------------------------------------------------------------------
// Rooms extraction
// -------------------------------------------------------------------
function extractRooms(text: string): number | undefined {
  if (/סטודיו|studio/i.test(text)) return 1;
  const m = text.match(/(\d+(?:\.\d)?)\s*(?:חדרים|חדר|rooms?|bedrooms?)/i);
  return m ? parseFloat(m[1]) : undefined;
}

// -------------------------------------------------------------------
// Floor extraction
// -------------------------------------------------------------------
function extractFloor(text: string): number | undefined {
  const NAMED: Record<string, number> = {
    'קרקע': 0, 'ראשונה': 1, 'ראשון': 1, 'שנייה': 2, 'שני': 2,
    'שלישית': 3, 'שלישי': 3, 'רביעית': 4, 'רביעי': 4,
    'חמישית': 5, 'חמישי': 5,
  };
  const heMatch = text.match(/קומה\s+([\u05D0-\u05EA]+|\d+)/);
  if (heMatch) {
    const v = heMatch[1];
    if (NAMED[v] !== undefined) return NAMED[v];
    const n = parseInt(v, 10);
    if (!isNaN(n)) return n;
  }
  const enMatch = text.match(/(?:floor|fl\.?)\s*(\d+)/i);
  if (enMatch) return parseInt(enMatch[1], 10);
  return undefined;
}

// -------------------------------------------------------------------
// Main extractor
// -------------------------------------------------------------------
export function extractLocation(text: string): ExtractionResult {
  if (!text) {
    return { location: 'Tel Aviv', lat: DEFAULT.lat, lng: DEFAULT.lng, confidence: 'low' };
  }

  let location = '';
  let neighborhood: string | undefined;
  let geo: GeoPoint = DEFAULT;
  let confidence: 'high' | 'medium' | 'low' = 'low';

  // --- Location resolution (priority: street+number > street > neighborhood > landmark) ---

  const heStreet = extractHebrewStreet(text);
  const enStreet = extractEnglishStreet(text);
  const streetMatch = heStreet ?? enStreet;
  const streetName = streetMatch?.name ?? '';

  // Check extracted street name against dictionary
  const streetDictHit = streetName
    ? findInDict(streetName, STREETS) ?? findInDict(text, STREETS)
    : findInDict(text, STREETS);

  if (streetDictHit) {
    geo = streetDictHit.geo;
    const num = streetMatch?.number;
    location = num
      ? `${streetDictHit.key} ${num}, Tel Aviv`
      : `${streetDictHit.key}, Tel Aviv`;
    confidence = num ? 'high' : 'medium';
  } else if (streetName) {
    // Pattern matched but street not in dictionary — still use it for display
    location = `${streetName}, Tel Aviv`;
    confidence = 'medium';
  }

  // --- Neighborhood ---
  const heNeighborhood = extractHebrewNeighborhood(text);
  const neighborhoodDictHit = findInDict(text, NEIGHBORHOODS);

  const resolvedNeighborhood = heNeighborhood ?? neighborhoodDictHit?.key;
  if (resolvedNeighborhood) {
    neighborhood = resolvedNeighborhood;
    // Only override geo if we have no street yet
    if (confidence === 'low') {
      const nGeo = NEIGHBORHOODS[resolvedNeighborhood] ?? neighborhoodDictHit?.geo;
      if (nGeo) {
        geo = nGeo;
        location = `${resolvedNeighborhood}, Tel Aviv`;
        confidence = 'medium';
      }
    }
  }

  // --- Landmark fallback ---
  if (confidence === 'low') {
    const landmarkHit = findInDict(text, LANDMARKS);
    if (landmarkHit) {
      geo = landmarkHit.geo;
      location = `${landmarkHit.key}, Tel Aviv`;
      confidence = 'medium';
    }
  }

  if (!location) location = 'Tel Aviv';

  return {
    location,
    neighborhood,
    lat: geo.lat,
    lng: geo.lng,
    confidence,
    ...extractDates(text),
    price: extractPrice(text),
    rooms: extractRooms(text),
    floor: extractFloor(text),
  };
}
