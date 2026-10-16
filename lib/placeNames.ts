// Hebrew ↔ English place names so listing titles use one language.
//
// Cities are stored in English, but ~18% of neighborhoods arrive in Hebrew
// straight from the Facebook post (e.g. "פלורנטין"), which produced mixed
// titles like "לב העיר, Tel Aviv". These tables cover the common Tel Aviv-area
// names; anything else falls back to showing the city alone.

const HE_NEIGHBORHOODS: Record<string, string> = {
  'פלורנטין': 'Florentin',
  'צפון הישן': 'Old North',
  'צפון ישן': 'Old North',
  'צפון החדש': 'New North',
  'שפירא': 'Shapira',
  'יד אליהו': 'Yad Eliyahu',
  'כרם התימנים': 'Kerem HaTeimanim',
  'כרם': 'Kerem HaTeimanim',
  'הכרם': 'Kerem HaTeimanim',
  'נווה צדק': 'Neve Tzedek',
  'מרכז תל אביב': 'Central Tel Aviv',
  'מרכז ת"א': 'Central Tel Aviv',
  'מרכז העיר': 'City Center',
  'ביצרון': 'Bitzaron',
  'נחלת בנימין': 'Nahalat Binyamin',
  'לב תל אביב': 'Lev Tel Aviv',
  'לב ת"א': 'Lev Tel Aviv',
  'לב העיר': 'Lev HaIr',
  'הדר יוסף': 'Hadar Yosef',
  'בבלי': 'Bavli',
  'מונטיפיורי': 'Montefiore',
  'יפו': 'Jaffa',
  'צפון יפו': 'North Jaffa',
  'מרכז יפו': 'Central Jaffa',
  'נמל יפו': 'Jaffa Port',
  'כיכר המדינה': 'Kikar HaMedina',
  'נווה שרת': 'Neve Sharet',
  'נווה אביבים': 'Neve Avivim',
  'קרית שלום': 'Kiryat Shalom',
  'קריית שלום': 'Kiryat Shalom',
  'צפון תל אביב': 'North Tel Aviv',
  'צפון ת"א': 'North Tel Aviv',
  'כיכר דיזנגוף': 'Dizengoff Square',
  'כיכר דיזינגוף': 'Dizengoff Square',
  'שינקין': 'Sheinkin',
  'שנקין': 'Sheinkin',
  'חרוזים': 'Haruzim',
  'רמת אביב': 'Ramat Aviv',
  'רמת אביב הירוקה': 'Green Ramat Aviv',
  "רמת אביב ג'": 'Ramat Aviv Gimel',
  'רמת אביב ג': 'Ramat Aviv Gimel',
  'רמת אביב גימל': 'Ramat Aviv Gimel',
  'נווה עופר': 'Neve Ofer',
  'לבונטין': 'Levontin',
  'שוק לוינסקי': 'Levinsky Market',
  'לוינסקי': 'Levinsky',
  'שוק הכרמל': 'Carmel Market',
  'שוק הפשפשים': 'Jaffa Flea Market',
  'נגה': 'Noga',
  'נוגה': 'Noga',
  'מתחם נגה': 'Noga',
  'יהודה המכבי': 'Yehuda HaMaccabi',
  'יהודה מכבי': 'Yehuda HaMaccabi',
  'כיכר רבין': 'Rabin Square',
  'המשתלה': 'HaMishtala',
  'נאות גולף': 'Neot Golf',
  "עג'מי": 'Ajami',
  'כוכב הצפון': 'Kochav HaTzafon',
  "נאות אפקה ב'": 'Neot Afeka B',
  'נאות אפקה': 'Neot Afeka',
  'אפקה': 'Afeka',
  'התקווה': 'HaTikva',
  'התקוה': 'HaTikva',
  'פארק צמרת': 'Park Tzameret',
  'צהלון': 'Tzahalon',
  'צהלה': 'Tzahala',
  'נווה שאנן': 'Neve Sha’anan',
  'תל ברוך': 'Tel Baruch',
  'תל ברוך צפון': 'North Tel Baruch',
  'תל ברוך דרום': 'South Tel Baruch',
  'למד': 'Lamed',
  'למד החדשה': 'New Lamed',
  'גן החשמל': 'Gan HaHashmal',
  'פארק המסילה': 'HaMesila Park',
  'רמת ישראל': 'Ramat Yisrael',
  'נחלת יצחק': 'Nahalat Yitzhak',
  'שוק היווני': 'Greek Market',
  'השוק היווני': 'Greek Market',
  'תל כביר': 'Tel Kabir',
  'כפר שלם': 'Kfar Shalem',
  'בוגרשוב': 'Bograshov',
  'רמת החייל': 'Ramat HaHayal',
  'הבימה': 'Habima',
  'אזור הבימה': 'Habima',
  'מעוז אביב': 'Maoz Aviv',
  'עזרא': 'Ezra',
  'רמות יורם': 'Ramot Yoram',
  'נווה אליעזר': 'Neve Eliezer',
  'נווה איילון': 'Neve Ayalon',
  'אזור הבורסה': 'Bursa',
  'הבורסה': 'Bursa',
  'רמת הטייסים': 'Ramat HaTayasim',
  'קרית רבין': 'Kiryat Rabin',
  'רוטשילד': 'Rothschild',
  'כיכר מילאנו': 'Milano Square',
  'כיכר מסריק': 'Masaryk Square',
  'צפון דיזנגוף': 'North Dizengoff',
  'צפון דיזינגוף': 'North Dizengoff',
  'מרכז גבעתיים': 'Central Givatayim',
  'מרכז הרצליה': 'Central Herzliya',
  'מרינה הרצליה': 'Herzliya Marina',
  'רמת גן': 'Ramat Gan',
  'נורדאו': 'Nordau',
  'דיזנגוף': 'Dizengoff',
  'דיזינגוף': 'Dizengoff',
  'בן יהודה': 'Ben Yehuda',
  'אבן גבירול': 'Ibn Gabirol',
  'שרונה': 'Sarona',
  'נמל תל אביב': 'Tel Aviv Port',
  'קרית המלאכה': 'Kiryat HaMelacha',
  'הצפון החדש': 'New North',
  'צפון חדש': 'New North',
  'מרכז': 'Center',
};

const HE_CITIES: Record<string, string> = {
  'Tel Aviv': 'תל אביב',
  'Tel Aviv-Yafo': 'תל אביב-יפו',
  'Tel Aviv-Jaffa': 'תל אביב-יפו',
  'Jaffa': 'יפו',
  'Ramat Gan': 'רמת גן',
  'Givatayim': 'גבעתיים',
  'Bat Yam': 'בת ים',
  'Bat-Yam': 'בת ים',
  'Holon': 'חולון',
  'Herzliya': 'הרצליה',
  'Ramat HaSharon': 'רמת השרון',
  "Ra'anana": 'רעננה',
  'Jerusalem': 'ירושלים',
  'Haifa': 'חיפה',
  'Beersheba': 'באר שבע',
  "Be'er Sheva": 'באר שבע',
  'Rishon LeZion': 'ראשון לציון',
  'Ashdod': 'אשדוד',
  'Or Yehuda': 'אור יהודה',
  'Caesarea': 'קיסריה',
  'Hadera': 'חדרה',
  'London': 'לונדון',
  'Berlin': 'ברלין',
  'Budapest': 'בודפשט',
  'Amsterdam': 'אמסטרדם',
  'Lisbon': 'ליסבון',
  'Porto': 'פורטו',
  'Paris': 'פריז',
  'Vienna': 'וינה',
  'Warsaw': 'ורשה',
  'Rotterdam': 'רוטרדם',
};

/** Cities where we have Hebrew neighborhood names; elsewhere Latin names stay as-is in Hebrew UI. */
const ISRAELI_CITIES = new Set(Object.keys(HE_CITIES).filter(c => HE_CITIES[c] && ![
  'London', 'Berlin', 'Budapest', 'Amsterdam', 'Lisbon', 'Porto', 'Paris', 'Vienna', 'Warsaw', 'Rotterdam',
].includes(c)));

export function isIsraeliCity(city: string | undefined | null): boolean {
  return !!city && ISRAELI_CITIES.has(city.trim());
}

const EN_NEIGHBORHOODS_TO_HE: Record<string, string> = Object.fromEntries(
  Object.entries(HE_NEIGHBORHOODS).map(([he, en]) => [en.toLowerCase(), he]),
);

const HEBREW = /[֐-׿]/;

export function hasHebrew(text: string | undefined | null): boolean {
  return !!text && HEBREW.test(text);
}

/** Canonical form for dictionary lookups: trims quotes/newlines, unifies geresh, drops "שכונת", parentheses. */
function normalizeHe(raw: string): string {
  return raw
    .replace(/[\r\n]+/g, ' ')
    .replace(/["“”]/g, '"')
    .replace(/[׳’]/g, "'")
    .replace(/״/g, '"')
    .replace(/^"+|"+$/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/^(שכונת|אזור|איזור)\s+/, '')
    .replace(/^ה(צפון)/, '$1')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** English name for a Hebrew neighborhood, or undefined when unknown. Handles "A / B" and "A, B" lists. */
export function neighborhoodToEnglish(raw: string): string | undefined {
  const direct = HE_NEIGHBORHOODS[normalizeHe(raw)];
  if (direct) return direct;
  const parts = raw.split(/\s*[/,]\s*/).filter(Boolean);
  if (parts.length > 1) {
    const translated = parts.map(p => HE_NEIGHBORHOODS[normalizeHe(p)]);
    if (translated.every(Boolean)) return [...new Set(translated)].slice(0, 2).join(' / ');
  }
  return undefined;
}

function neighborhoodToHebrew(raw: string): string | undefined {
  return EN_NEIGHBORHOODS_TO_HE[raw.trim().toLowerCase()];
}

/** Neighborhood in the UI language, or undefined if we can't show it without mixing scripts. */
export function neighborhoodFor(raw: string | undefined | null, lang: string, stored?: Record<string, string>): string | undefined {
  if (stored?.[lang]) return stored[lang];
  const value = raw?.trim();
  if (!value || value.toLowerCase() === 'null') return undefined;
  if (lang === 'he') return hasHebrew(value) ? value : (neighborhoodToHebrew(value) ?? value);
  return hasHebrew(value) ? neighborhoodToEnglish(value) : value;
}

/** City in the UI language (cities are stored in English). */
export function cityFor(raw: string | undefined | null, lang: string): string | undefined {
  const value = raw?.trim();
  if (!value || value.toLowerCase() === 'null' || value.toLowerCase() === 'unknown') return undefined;
  if (lang === 'he') return HE_CITIES[value] ?? value;
  return value;
}
