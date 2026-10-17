// Copy for /how-it-works. Keep every claim true to what the product does today:
// no in-app messaging, no alerts, listings aren't verified, scraping runs daily
// (pilot). When scraping moves to hourly, update `freshness` and the FAQ answer.

const en = {
  eyebrow: 'How it works',
  title: 'Every sublet from the Facebook groups, on one map.',
  subtitle: 'We read the posts, sort them by price, dates and location, and keep a link to the original.',
  doorSeekerTitle: 'Looking for a sublet',
  doorSeekerBody: 'Search, filter and compare every listing on one map.',
  doorSeekerLink: 'How to find one',
  doorPosterTitle: 'Posting a sublet',
  doorPosterBody: 'Paste your Facebook post and the details fill in for you.',
  doorPosterLink: 'How to post',

  sourceTitle: 'Where the listings come from',
  sourceSteps: [
    { title: 'Public Facebook groups', body: 'Every day we collect new posts from public sublet groups.' },
    { title: 'Read by AI', body: 'Gemini pulls out the price, dates, property type and location, in Hebrew or English.' },
    { title: 'The original, one tap away', body: 'Every listing links back to the post it came from.' },
  ],
  exampleEyebrow: 'Example',

  findTitle: 'Finding a sublet',
  findSubtitle: 'Four steps from search to the person renting it.',
  findSteps: [
    { title: 'Search', body: 'Type an area, a street, or what you need. Hebrew or English both work.', chips: ['Florentin', 'balcony', 'מרפסת'] },
    { title: 'Filter', body: 'Narrow it down to what fits, and see every result on the map.', chips: ['Price', 'Dates', 'Type', 'Bedrooms', 'Amenities'] },
    { title: 'Check the details', body: 'Photos, dates, the original post translated into your language, and the location on a map.', chips: [] as string[] },
    { title: 'Contact and save', body: 'Sign in and tap “Message Owner on Facebook” to open the original post. Tap the heart to keep a shortlist.', chips: [] as string[] },
  ],
  tipTitle: 'Tip',
  tipBody: 'Good sublets go fast. Tap “Posted today” on the map to see what’s new.',
  ctaMap: 'Explore the map',

  postTitle: 'Posting a sublet',
  postSubtitle: 'It’s free, and you don’t have to retype anything.',
  postSteps: [
    { title: 'Paste your post', body: 'Sign in, paste the text of your Facebook post and add photos. Or fill in a short form instead.' },
    { title: 'The details fill in', body: 'Price, dates, location and property type are filled in for you.' },
    { title: 'Review and publish', body: 'Fix anything that’s off and publish. Your listing is on the map right away, and you can edit it later.' },
  ],
  ctaPost: 'Post a sublet',

  faqTitle: 'Questions',
  faq: [
    { q: 'Is SubHub free?', a: 'Yes. Searching, saving and posting are all free.' },
    { q: 'Do I need an account?', a: 'Not to browse. Sign in with Google or email to save listings, contact posters or post a sublet.' },
    { q: 'Why do I contact people on Facebook?', a: 'The listings come from Facebook groups, so that’s where the poster is. The button opens their original post, where you can comment or message them.' },
    { q: 'How fresh are the listings?', a: 'We check the groups for new posts every day. Listings disappear once their dates have passed, or 60 days after they were posted.' },
    { q: 'Which cities are covered?', a: 'Most listings today are in Tel Aviv-Yafo.' },
    { q: 'Why is the location approximate?', a: 'Many posts only name a street or a neighborhood, so the pin shows the area rather than the exact building.' },
  ],
  safetyTitle: 'Listings aren’t verified.',
  safetyBody: 'We don’t check listings or posters. Never transfer money before you’ve seen the place and met the person renting it.',
};

type HowItWorksCopy = typeof en;

const he: HowItWorksCopy = {
  eyebrow: 'איך זה עובד',
  title: 'כל הסאבלטים מקבוצות הפייסבוק, על מפה אחת.',
  subtitle: 'אנחנו קוראים את הפוסטים, מסדרים אותם לפי מחיר, תאריכים ומיקום, ומשאירים קישור לפוסט המקורי.',
  doorSeekerTitle: 'מחפשים סאבלט',
  doorSeekerBody: 'מחפשים, מסננים ומשווים את כל המודעות על מפה אחת.',
  doorSeekerLink: 'איך מוצאים',
  doorPosterTitle: 'מפרסמים סאבלט',
  doorPosterBody: 'מדביקים את הפוסט מפייסבוק, והפרטים מתמלאים לבד.',
  doorPosterLink: 'איך מפרסמים',

  sourceTitle: 'מאיפה המודעות מגיעות',
  sourceSteps: [
    { title: 'קבוצות פייסבוק ציבוריות', body: 'בכל יום אנחנו אוספים פוסטים חדשים מקבוצות סאבלטים ציבוריות.' },
    { title: 'נקראות על ידי AI', body: 'Gemini מחלץ מחיר, תאריכים, סוג נכס ומיקום, בעברית או באנגלית.' },
    { title: 'המקור במרחק לחיצה', body: 'כל מודעה מקושרת לפוסט שממנו היא הגיעה.' },
  ],
  exampleEyebrow: 'דוגמה',

  findTitle: 'מוצאים סאבלט',
  findSubtitle: 'ארבעה שלבים מהחיפוש ועד מי שמשכיר.',
  findSteps: [
    { title: 'מחפשים', body: 'מקלידים אזור, רחוב או מה שחשוב לכם. אפשר בעברית או באנגלית.', chips: ['פלורנטין', 'מרפסת', 'balcony'] },
    { title: 'מסננים', body: 'מצמצמים למה שמתאים לכם, ורואים כל תוצאה על המפה.', chips: ['מחיר', 'תאריכים', 'סוג נכס', 'חדרים', 'מאפיינים'] },
    { title: 'בודקים את הפרטים', body: 'תמונות, תאריכים, הפוסט המקורי מתורגם לשפה שלכם, והמיקום על המפה.', chips: [] },
    { title: 'פונים ושומרים', body: 'מתחברים ולוחצים על "שלח הודעה לבעלים בפייסבוק" כדי לפתוח את הפוסט המקורי. לוחצים על הלב כדי לשמור רשימה.', chips: [] },
  ],
  tipTitle: 'טיפ',
  tipBody: 'סאבלטים טובים נתפסים מהר. לחצו על "פורסם היום" במפה כדי לראות מה חדש.',
  ctaMap: 'לחיפוש במפה',

  postTitle: 'מפרסמים סאבלט',
  postSubtitle: 'זה בחינם, ולא צריך להקליד הכול מחדש.',
  postSteps: [
    { title: 'מדביקים את הפוסט', body: 'מתחברים, מדביקים את הטקסט מהפוסט שלכם בפייסבוק ומוסיפים תמונות. אפשר גם למלא טופס קצר.' },
    { title: 'הפרטים מתמלאים לבד', body: 'מחיר, תאריכים, מיקום וסוג הנכס ממולאים בשבילכם.' },
    { title: 'בודקים ומפרסמים', body: 'מתקנים מה שצריך ומפרסמים. המודעה עולה למפה מיד, ואפשר לערוך אותה בהמשך.' },
  ],
  ctaPost: 'לפרסום סאבלט',

  faqTitle: 'שאלות',
  faq: [
    { q: 'האם SubHub בחינם?', a: 'כן. חיפוש, שמירה ופרסום הם בחינם.' },
    { q: 'צריך חשבון?', a: 'לא כדי לגלוש. מתחברים עם Google או מייל כדי לשמור מודעות, לפנות למפרסמים או לפרסם סאבלט.' },
    { q: 'למה פונים למפרסם דרך פייסבוק?', a: 'המודעות מגיעות מקבוצות פייסבוק, ושם נמצא המפרסם. הכפתור פותח את הפוסט המקורי, ושם אפשר להגיב או לשלוח הודעה.' },
    { q: 'כמה עדכניות המודעות?', a: 'אנחנו בודקים את הקבוצות כל יום. מודעות יורדות כשהתאריכים שלהן עוברים, או 60 יום אחרי שפורסמו.' },
    { q: 'אילו ערים יש באתר?', a: 'רוב המודעות היום הן בתל אביב-יפו.' },
    { q: 'למה המיקום משוער?', a: 'הרבה פוסטים מציינים רק רחוב או שכונה, ולכן הסיכה מראה את האזור ולא את הבניין המדויק.' },
  ],
  safetyTitle: 'המודעות לא מאומתות.',
  safetyBody: 'אנחנו לא בודקים מודעות או מפרסמים. אל תעבירו כסף לפני שראיתם את הדירה ופגשתם את מי שמשכיר אותה.',
};

export function howItWorksCopy(language: string): HowItWorksCopy {
  return language === 'he' ? he : en;
}
