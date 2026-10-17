// Copy for /how-it-works. Keep every claim true to what the product does today:
// no in-app messaging, no alerts, listings aren't verified, scraping runs daily
// (pilot). When scraping moves to hourly, update `sourceBody` and the FAQ answer.
// Never mix languages: Hebrew strings use Hebrew words only (no Latin names),
// and the preview examples are written separately for each language.

const en = {
  title: 'Find your next sublet in four steps.',
  subtitle: 'SubHub collects sublet posts from Facebook groups and puts them on one map. Here’s how to use it.',
  ctaMap: 'Explore the map',
  posterLink: 'Posting a sublet?',

  stepLabel: (n: number) => `Step ${n}`,
  steps: [
    { title: 'Search for a place, or for what you need', body: 'Type a neighborhood or a street, or something that matters to you, like a balcony or pets.' },
    { title: 'Filter down to what fits', body: 'Set your budget and dates, then narrow it by type, rooms and amenities. Tap “Posted today” to see only the newest.' },
    { title: 'Compare listings side by side', body: 'Every listing shows the same details: price, dates, type and location, with photos and the original post.' },
    { title: 'Contact the poster', body: 'Sign in to message the poster on Facebook, where the post was published. Save the ones you like to compare later.' },
  ],

  // Preview examples (step visuals)
  searchQuery: 'Florentin balcony',
  suggestions: [
    { name: 'Florentin', place: 'Neighborhood · Tel Aviv-Yafo' },
    { name: 'Florentin Street', place: 'Street · Tel Aviv-Yafo' },
  ],
  budgetLabel: 'Budget / mo',
  budgetRange: '₪3,000 – ₪6,000',
  datesLabel: 'Dates',
  sampleArea: 'Florentin',
  sampleCity: 'Tel Aviv-Yafo',
  opensOriginal: 'Opens the original post on Facebook',

  sourceTitle: 'Where the listings come from',
  sourceBody: 'Every day we collect new posts from public Facebook sublet groups. AI reads each one and pulls out the price, dates, type and location. The original post is always one tap away.',

  postTitle: 'Posting a sublet?',
  postBody: 'Paste your Facebook post and the price, dates and location fill in for you. Check them, add photos and publish. It’s free.',
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

  closingTitle: 'Start with the map',
  closingBody: 'Every sublet that’s available now, in one place.',
};

type HowItWorksCopy = typeof en;

const he: HowItWorksCopy = {
  title: 'מוצאים סאבלט בארבעה צעדים.',
  subtitle: 'אנחנו אוספים פוסטים של סאבלטים מקבוצות פייסבוק ומציגים אותם על מפה אחת. ככה משתמשים בזה.',
  ctaMap: 'לחיפוש במפה',
  posterLink: 'מפרסמים סאבלט?',

  stepLabel: (n: number) => `שלב ${n}`,
  steps: [
    { title: 'מחפשים מקום, או את מה שחשוב לכם', body: 'מקלידים שכונה או רחוב, או משהו שחשוב לכם, כמו מרפסת או חיות מחמד.' },
    { title: 'מסננים למה שמתאים', body: 'קובעים תקציב ותאריכים, ומצמצמים לפי סוג נכס, חדרים ומאפיינים. לחיצה על "פורסם היום" מציגה רק את החדשים.' },
    { title: 'משווים בין מודעות', body: 'בכל מודעה מופיעים אותם פרטים: מחיר, תאריכים, סוג נכס ומיקום, עם תמונות והפוסט המקורי.' },
    { title: 'פונים למפרסם', body: 'מתחברים ושולחים הודעה למפרסם בפייסבוק, איפה שהפוסט פורסם. שומרים את המודעות שאהבתם כדי להשוות אחר כך.' },
  ],

  searchQuery: 'פלורנטין מרפסת',
  suggestions: [
    { name: 'פלורנטין', place: 'שכונה · תל אביב-יפו' },
    { name: 'רחוב פלורנטין', place: 'רחוב · תל אביב-יפו' },
  ],
  budgetLabel: 'תקציב לחודש',
  budgetRange: '₪3,000 – ₪6,000',
  datesLabel: 'תאריכים',
  sampleArea: 'פלורנטין',
  sampleCity: 'תל אביב-יפו',
  opensOriginal: 'פותח את הפוסט המקורי בפייסבוק',

  sourceTitle: 'מאיפה המודעות מגיעות',
  sourceBody: 'בכל יום אנחנו אוספים פוסטים חדשים מקבוצות סאבלטים ציבוריות בפייסבוק. בינה מלאכותית קוראת כל פוסט ומחלצת מחיר, תאריכים, סוג נכס ומיקום. הפוסט המקורי תמיד במרחק לחיצה.',

  postTitle: 'מפרסמים סאבלט?',
  postBody: 'מדביקים את הפוסט מפייסבוק, והמחיר, התאריכים והמיקום מתמלאים לבד. בודקים, מוסיפים תמונות ומפרסמים. זה בחינם.',
  ctaPost: 'לפרסום סאבלט',

  faqTitle: 'שאלות',
  faq: [
    { q: 'האם השירות בחינם?', a: 'כן. חיפוש, שמירה ופרסום הם בחינם.' },
    { q: 'צריך חשבון?', a: 'לא כדי לגלוש. מתחברים עם גוגל או מייל כדי לשמור מודעות, לפנות למפרסמים או לפרסם סאבלט.' },
    { q: 'למה פונים למפרסם דרך פייסבוק?', a: 'המודעות מגיעות מקבוצות פייסבוק, ושם נמצא המפרסם. הכפתור פותח את הפוסט המקורי, ושם אפשר להגיב או לשלוח הודעה.' },
    { q: 'כמה עדכניות המודעות?', a: 'אנחנו בודקים את הקבוצות כל יום. מודעות יורדות כשהתאריכים שלהן עוברים, או 60 יום אחרי שפורסמו.' },
    { q: 'אילו ערים יש באתר?', a: 'רוב המודעות היום הן בתל אביב-יפו.' },
    { q: 'למה המיקום משוער?', a: 'הרבה פוסטים מציינים רק רחוב או שכונה, ולכן הסיכה מראה את האזור ולא את הבניין המדויק.' },
  ],
  safetyTitle: 'המודעות לא מאומתות.',
  safetyBody: 'אנחנו לא בודקים מודעות או מפרסמים. אל תעבירו כסף לפני שראיתם את הדירה ופגשתם את מי שמשכיר אותה.',

  closingTitle: 'מתחילים מהמפה',
  closingBody: 'כל הסאבלטים שזמינים עכשיו, במקום אחד.',
};

export function howItWorksCopy(language: string): HowItWorksCopy {
  return language === 'he' ? he : en;
}
