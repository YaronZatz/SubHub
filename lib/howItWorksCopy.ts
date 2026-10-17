// Copy for /how-it-works. Keep every claim true to what the product does today:
// no in-app messaging, no verification, no alerts.

const en = {
  eyebrow: 'How it works',
  title: 'Every sublet from the Facebook groups, on one map.',
  subtitle: 'We read the posts, sort them by price, dates and location, and keep a link to the original.',
  ctaMap: 'Explore the map',
  ctaPost: 'Post a sublet',

  stepsTitle: 'From scattered posts to one map',
  steps: [
    { title: 'We collect the posts', body: 'Through the day, we gather new posts from public Facebook sublet groups.' },
    { title: 'AI turns them into listings', body: 'Gemini reads each post, in Hebrew or English, and pulls out the price, dates, property type and location. Duplicates are merged and old posts drop off the map.' },
    { title: 'You compare on one map', body: 'Filter by price, dates, type and area, then contact the poster through the original post.' },
  ],
  exampleEyebrow: 'Example',

  postTitle: 'Posting a sublet?',
  postSubtitle: 'It’s free, and you don’t have to retype anything.',
  postSteps: [
    { title: 'Paste your post', body: 'Sign in, paste the text of your Facebook post and add photos. Or fill in a short form instead.' },
    { title: 'The details fill in', body: 'Price, dates, location and property type are filled in for you.' },
    { title: 'Review and publish', body: 'Fix anything that’s off and publish. Your listing is on the map right away, and you can edit it later.' },
  ],

  compareTitle: 'Facebook groups vs. SubHub',
  colFacebook: 'Facebook groups',
  colSubHub: 'SubHub',
  compareRows: [
    { label: 'Finding a place', fb: 'Scrolling a feed', sh: 'Filters for price, dates, type and area' },
    { label: 'Location', fb: 'Somewhere in the text, if at all', sh: 'Pinned on a map' },
    { label: 'Details', fb: 'Spread across a paragraph', sh: 'The same fields for every listing' },
    { label: 'Old posts', fb: 'Stay in the feed', sh: 'Removed once the dates pass' },
    { label: 'Contact', fb: 'Comment or message', sh: 'The same, through a link to the original post' },
  ],
  noteTitle: 'Good to know',
  noteBody: 'We don’t check or verify listings or posters. Never transfer money before you’ve seen the place.',
};

type HowItWorksCopy = typeof en;

const he: HowItWorksCopy = {
  eyebrow: 'איך זה עובד',
  title: 'כל הסאבלטים מקבוצות הפייסבוק, על מפה אחת.',
  subtitle: 'אנחנו קוראים את הפוסטים, מסדרים אותם לפי מחיר, תאריכים ומיקום, ומשאירים קישור לפוסט המקורי.',
  ctaMap: 'לחיפוש במפה',
  ctaPost: 'לפרסום סאבלט',

  stepsTitle: 'מפוסטים מפוזרים למפה אחת',
  steps: [
    { title: 'אוספים את הפוסטים', body: 'במהלך היום אנחנו אוספים פוסטים חדשים מקבוצות סאבלטים ציבוריות בפייסבוק.' },
    { title: 'הבינה המלאכותית מסדרת אותם', body: 'Gemini קורא כל פוסט, בעברית או באנגלית, ומחלץ מחיר, תאריכים, סוג נכס ומיקום. כפילויות מאוחדות, ופוסטים ישנים יורדים מהמפה.' },
    { title: 'אתם משווים על מפה אחת', body: 'מסננים לפי מחיר, תאריכים, סוג נכס ואזור, ופונים למפרסם דרך הפוסט המקורי.' },
  ],
  exampleEyebrow: 'דוגמה',

  postTitle: 'מפרסמים סאבלט?',
  postSubtitle: 'זה בחינם, ולא צריך להקליד הכול מחדש.',
  postSteps: [
    { title: 'מדביקים את הפוסט', body: 'מתחברים, מדביקים את הטקסט מהפוסט שלכם בפייסבוק ומוסיפים תמונות. אפשר גם למלא טופס קצר.' },
    { title: 'הפרטים מתמלאים לבד', body: 'מחיר, תאריכים, מיקום וסוג הנכס ממולאים בשבילכם.' },
    { title: 'בודקים ומפרסמים', body: 'מתקנים מה שצריך ומפרסמים. המודעה עולה למפה מיד, ואפשר לערוך אותה בהמשך.' },
  ],

  compareTitle: 'קבוצות פייסבוק מול SubHub',
  colFacebook: 'קבוצות פייסבוק',
  colSubHub: 'SubHub',
  compareRows: [
    { label: 'חיפוש', fb: 'גלילה בפיד', sh: 'סינון לפי מחיר, תאריכים, סוג ואזור' },
    { label: 'מיקום', fb: 'כתוב בטקסט, אם בכלל', sh: 'מסומן על המפה' },
    { label: 'פרטים', fb: 'מפוזרים בפסקה', sh: 'אותם שדות בכל מודעה' },
    { label: 'מודעות ישנות', fb: 'נשארות בפיד', sh: 'יורדות כשהתאריכים עוברים' },
    { label: 'יצירת קשר', fb: 'תגובה או הודעה', sh: 'אותו דבר, דרך קישור לפוסט המקורי' },
  ],
  noteTitle: 'חשוב לדעת',
  noteBody: 'אנחנו לא בודקים או מאמתים מודעות ומפרסמים. אל תעבירו כסף לפני שראיתם את הדירה.',
};

export function howItWorksCopy(language: string): HowItWorksCopy {
  return language === 'he' ? he : en;
}
