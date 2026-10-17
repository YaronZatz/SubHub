import type { AreaDef } from './types';

/**
 * Tel Aviv-Yafo browse areas.
 *
 * Every official neighborhood (ids 1–71, see data/tel-aviv-neighborhoods.json)
 * belongs to exactly one area. A few are grouped where people use one name
 * for several official neighborhoods (e.g. Old North = north + south parts).
 * Aliases are the free-text spellings seen in listings; they're only used when
 * a listing has no reliable map pin.
 */
export const TEL_AVIV_AREAS: AreaDef[] = [
  { slug: 'florentin', he: 'פלורנטין', en: 'Florentin', polygonIds: [52] },
  { slug: 'old-north', he: 'הצפון הישן', en: 'Old North', polygonIds: [30, 31], aliases: ['צפון ישן', 'Old north'] },
  { slug: 'new-north', he: 'הצפון החדש', en: 'New North', polygonIds: [33, 34, 35], aliases: ['צפון חדש', 'כיכר המדינה', 'Kikar HaMedina'] },
  {
    slug: 'lev-tel-aviv', he: 'לב תל אביב', en: 'Lev Tel Aviv', polygonIds: [37],
    aliases: ['לב העיר', 'Lev HaIr', 'לב ת"א', 'מרכז העיר', 'City Center', 'מרכז תל אביב', 'מרכז ת"א', 'Central Tel Aviv', 'Center', 'כיכר דיזנגוף', 'Dizengoff Square', 'Dizengoff', 'שינקין', 'Sheinkin', 'רוטשילד', 'Rothschild', 'נחלת בנימין', 'Nahalat Binyamin'],
  },
  { slug: 'kerem-hateimanim', he: 'כרם התימנים', en: 'Kerem HaTeimanim', polygonIds: [38], aliases: ['הכרם', 'כרם', 'שוק הכרמל', 'Carmel Market'] },
  { slug: 'neve-tzedek', he: 'נווה צדק', en: 'Neve Tzedek', polygonIds: [39], aliases: ['נוה צדק'] },
  { slug: 'montefiore', he: 'מונטיפיורי', en: 'Montefiore', polygonIds: [41] },
  { slug: 'sarona', he: 'שרונה', en: 'Sarona', polygonIds: [40], aliases: ['גני שרונה'] },
  { slug: 'north-jaffa', he: 'צפון יפו', en: 'North Jaffa', polygonIds: [42], aliases: ['השוק היווני', 'Greek Market'] },
  {
    slug: 'jaffa', he: 'יפו', en: 'Jaffa', polygonIds: [43, 44, 45, 47, 48, 49],
    aliases: ['Yafo', "עג'מי", 'Ajami', 'יפו העתיקה', 'Old Jaffa', 'נמל יפו', 'Jaffa Port', 'שוק הפשפשים', 'Jaffa Flea Market', 'גבעת עליה'],
  },
  { slug: 'shapira', he: 'שפירא', en: 'Shapira', polygonIds: [54] },
  { slug: 'neve-shaanan', he: 'נווה שאנן', en: 'Neve Sha’anan', polygonIds: [53], aliases: ['נוה שאנן', "Neve Sha'anan", 'Neve Shaanan', 'לוינסקי', 'Levinsky'] },
  { slug: 'yad-eliyahu', he: 'יד אליהו', en: 'Yad Eliyahu', polygonIds: [62] },
  { slug: 'hatikva', he: 'התקווה', en: 'HaTikva', polygonIds: [63], aliases: ['התקוה', 'Hatikva', 'שכונת התקווה'] },
  { slug: 'bitzaron', he: 'ביצרון ורמת ישראל', en: 'Bitzaron', polygonIds: [58], aliases: ['ביצרון', 'רמת ישראל', 'Ramat Yisrael'] },
  { slug: 'nahalat-yitzhak', he: 'נחלת יצחק', en: 'Nahalat Yitzhak', polygonIds: [57] },
  { slug: 'kiryat-shalom', he: 'קריית שלום', en: 'Kiryat Shalom', polygonIds: [56], aliases: ['קרית שלום'] },
  { slug: 'neve-ofer', he: 'נווה עופר', en: 'Neve Ofer', polygonIds: [50], aliases: ['תל כביר', 'Tel Kabir'] },
  { slug: 'ramat-aviv', he: 'רמת אביב', en: 'Ramat Aviv', polygonIds: [7, 9, 10], aliases: ['רמת אביב ג', 'Ramat Aviv Gimel', 'נווה אביבים', 'Neve Avivim', 'רמת אביב הירוקה'] },
  { slug: 'afeka', he: 'אפקה', en: 'Afeka', polygonIds: [8, 17, 18], aliases: ['נאות אפקה', 'Neot Afeka'] },
  { slug: 'bavli', he: 'בבלי', en: 'Bavli', polygonIds: [32] },
  { slug: 'tel-aviv-port', he: 'נמל תל אביב', en: 'Tel Aviv Port', polygonIds: [29], aliases: ['הנמל', 'Namal'] },
  { slug: 'tel-baruch', he: 'תל ברוך', en: 'Tel Baruch', polygonIds: [14, 15] },
  { slug: 'maoz-aviv', he: 'מעוז אביב', en: 'Maoz Aviv', polygonIds: [16] },
  { slug: 'hadar-yosef', he: 'הדר יוסף', en: 'Hadar Yosef', polygonIds: [19] },
  { slug: 'kiryat-shaul', he: 'קריית שאול', en: 'Kiryat Shaul', polygonIds: [20], aliases: ['קרית שאול'] },
  { slug: 'hamishtala', he: 'המשתלה', en: 'HaMishtala', polygonIds: [21] },
  { slug: 'tzahala', he: 'צהלה', en: 'Tzahala', polygonIds: [22, 23] },
  { slug: 'neve-sharet', he: 'נווה שרת', en: 'Neve Sharet', polygonIds: [24] },
  { slug: 'revivim', he: 'רביבים', en: 'Revivim', polygonIds: [25] },
  { slug: 'neve-dan', he: 'נווה דן', en: 'Neve Dan', polygonIds: [26] },
  { slug: 'ramat-hahayal', he: 'רמת החייל', en: 'Ramat HaHayal', polygonIds: [27, 28] },
  { slug: 'kochav-hatzafon', he: 'כוכב הצפון', en: 'Kochav HaTzafon', polygonIds: [6] },
  { slug: 'lamed', he: 'תוכנית ל', en: 'Lamed', polygonIds: [5], aliases: ['למד', 'למד החדשה'] },
  { slug: 'tzameret', he: 'צמרות איילון', en: 'Tzameret', polygonIds: [36], aliases: ['פארק צמרת', 'Park Tzameret'] },
  { slug: 'tzahalon', he: 'צהלון', en: 'Tzahalon', polygonIds: [46] },
  { slug: 'neve-chen', he: 'נווה חן', en: 'Neve Chen', polygonIds: [70] },
  { slug: 'kfar-shalem', he: 'כפר שלם', en: 'Kfar Shalem', polygonIds: [68, 69], aliases: ['נווה ברבור', 'נווה אליעזר', 'Neve Eliezer'] },
  { slug: 'ezra', he: 'עזרא והארגזים', en: 'Ezra', polygonIds: [64], aliases: ['עזרא', 'הארגזים'] },
  { slug: 'tel-haim', he: 'תל חיים', en: 'Tel Haim', polygonIds: [59] },
  { slug: 'ramat-hatayasim', he: 'רמת הטייסים', en: 'Ramat HaTayasim', polygonIds: [60] },
  { slug: 'orot', he: 'אורות', en: 'Orot', polygonIds: [61] },
  { slug: 'livne', he: 'לבנה וידידיה', en: 'Livne', polygonIds: [65] },
  { slug: 'kfir', he: 'כפיר', en: 'Kfir', polygonIds: [67] },
  { slug: 'nir-aviv', he: 'ניר אביב', en: 'Nir Aviv', polygonIds: [71] },
  { slug: 'glilot', he: 'גלילות', en: 'Glilot', polygonIds: [1] },
  { slug: 'tzukei-aviv', he: 'צוקי אביב', en: 'Tzukei Aviv', polygonIds: [2] },
  { slug: 'sde-dov', he: 'שדה דב', en: 'Sde Dov', polygonIds: [3] },
  { slug: 'nofei-yam', he: 'נופי ים', en: 'Nofei Yam', polygonIds: [4] },
  { slug: 'tel-aviv-university', he: 'אוניברסיטת תל אביב', en: 'Tel Aviv University', polygonIds: [11] },
  { slug: 'expo', he: 'מרכז הירידים', en: 'Expo', polygonIds: [12] },
  { slug: 'yarkon-park', he: 'פארק הירקון', en: 'Yarkon Park', polygonIds: [13] },
  { slug: 'hahorshot-park', he: 'פארק החורשות', en: 'HaHorshot Park', polygonIds: [55] },
  { slug: 'south-park', he: 'פארק דרום', en: 'South Park', polygonIds: [66] },
  { slug: 'holon-junction', he: 'צומת חולון', en: 'Holon Junction', polygonIds: [51] },
];
