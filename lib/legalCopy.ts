// Copy for the legal pages (/privacy, /data-deletion, /data-deletion-instructions)
// and the 404 page. Never mix languages: Hebrew strings use Hebrew words only.
// Only "SubHub", email addresses and URLs stay in Latin script.
// The English text is the binding version; the Hebrew pages say so via
// `translationNotice`. When changing a legal commitment, change both languages.

/** Date the legal pages were last revised (shown as month + year). */
export const LEGAL_LAST_UPDATED = new Date(Date.UTC(2026, 1, 1));

function localeFor(language: string): string {
  return language === 'he' ? 'he' : 'en';
}

/** "February 2026" / "פברואר 2026". UTC so server and client render the same text. */
export function formatMonthYear(date: Date, language: string): string {
  return new Intl.DateTimeFormat(localeFor(language), { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date);
}

/** "17 October 2026" / "17 באוקטובר 2026". UTC so server and client render the same text. */
export function formatFullDate(date: Date, language: string): string {
  return new Intl.DateTimeFormat(localeFor(language), { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date);
}

interface PolicySection {
  title: string;
  items: { label: string; text: string }[];
}

const en = {
  homeAriaLabel: 'SubHub home',
  /** Shown only on translated pages; empty in English. */
  translationNotice: '',

  privacy: {
    documentTitle: 'Privacy Policy — SubHub',
    title: 'Privacy Policy',
    lastUpdated: (date: string) => `Last updated: ${date}`,
    intro:
      'SubHub ("we", "us", or "our") operates a short-term rental listing platform. This Privacy Policy explains what personal information we collect, how we use it, and your rights regarding your data. By using SubHub you agree to the practices described here.',
    sections: [
      {
        title: '1. Information We Collect',
        items: [
          { label: 'Account information', text: 'When you sign in with Google, Apple, or Facebook we receive your name, email address, and profile photo from that provider.' },
          { label: 'Listing content', text: 'Text, photos, price, dates, and location information you submit when posting a sublet listing.' },
          { label: 'Usage data', text: 'Pages viewed, search queries, and interaction events collected automatically to improve the service.' },
          { label: 'Device & log data', text: 'Browser type, IP address, and timestamps recorded in server logs.' },
        ],
      },
      {
        title: '2. How We Use Your Information',
        items: [
          { label: 'Provide the service', text: 'Display your listings to other users and allow you to browse listings.' },
          { label: 'Authentication', text: 'Verify your identity and maintain your login session.' },
          { label: 'Communication', text: 'Send transactional emails such as listing confirmations or support responses.' },
          { label: 'Improvement', text: 'Analyse usage patterns to fix bugs and improve features.' },
          { label: 'Legal compliance', text: 'Meet obligations under applicable law and respond to lawful requests.' },
        ],
      },
      {
        title: '3. Third-Party Services',
        items: [
          { label: 'Firebase (Google)', text: 'Authentication, database, and hosting. Data is stored in Google Cloud. See google.com/policies/privacy.' },
          { label: 'Facebook Login', text: 'Optional sign-in method. We receive only your public profile and email. See facebook.com/policy.php.' },
          { label: 'Google Sign-In', text: 'Optional sign-in method. See policies.google.com/privacy.' },
          { label: 'Apify', text: 'We use Apify to collect publicly available Facebook group posts. No personal data is sent to Apify beyond what is publicly visible.' },
        ],
      },
      {
        title: '4. Data Sharing',
        items: [
          { label: 'We do not sell your data', text: 'We never sell or rent your personal information to third parties.' },
          { label: 'Service providers', text: 'We share data only with the infrastructure providers listed above, under strict data processing agreements.' },
          { label: 'Legal requirements', text: 'We may disclose information if required by law, court order, or to protect the rights and safety of users.' },
        ],
      },
      {
        title: '5. Data Retention',
        items: [
          { label: 'Active accounts', text: 'We retain your data for as long as your account is active.' },
          { label: 'Listings', text: 'Listings are retained until you delete them or your account is removed.' },
          { label: 'Logs', text: 'Server logs are automatically purged after 90 days.' },
        ],
      },
      {
        title: '6. Your Rights',
        items: [
          { label: 'Access', text: 'You may request a copy of the personal data we hold about you.' },
          { label: 'Correction', text: 'You may update your name or email through your account settings.' },
          { label: 'Deletion', text: 'You may request deletion of your account and all associated data at any time.' },
          { label: 'Portability', text: 'You may request your data in a structured, machine-readable format.' },
        ],
      },
      {
        title: '7. Cookies',
        items: [
          { label: 'Session cookies', text: 'Used to keep you logged in during a browsing session.' },
          { label: 'No tracking cookies', text: 'We do not use advertising or cross-site tracking cookies.' },
        ],
      },
      {
        title: "8. Children's Privacy",
        items: [
          { label: 'Age requirement', text: 'SubHub is not directed at children under 13. We do not knowingly collect data from children. If you believe a child has provided us with personal data, contact us and we will delete it.' },
        ],
      },
      {
        title: '9. Security',
        items: [
          { label: 'Encryption', text: 'All data is transmitted over HTTPS/TLS.' },
          { label: 'Access controls', text: 'Database access is restricted to authenticated service accounts with the minimum required permissions.' },
          { label: 'Limitations', text: 'No system is perfectly secure. In the event of a breach we will notify affected users as required by law.' },
        ],
      },
      {
        title: '10. Changes to This Policy',
        items: [
          { label: 'Notification', text: 'We may update this policy from time to time. The "Last updated" date at the top of this page will reflect any changes. Continued use of SubHub after changes constitutes acceptance.' },
        ],
      },
    ] as PolicySection[],
    contactTitle: 'Contact Us',
    contactBody: 'For any privacy-related questions or to exercise your rights, contact us at:',
    contactMailSubject: 'Privacy Request',
    deletionLinkBefore: 'To delete your data, visit our ',
    deletionLinkText: 'Data Deletion Instructions',
    deletionLinkAfter: ' page.',
  },

  deletion: {
    documentTitle: 'Data Deletion — SubHub',
    title: 'Data Deletion',
    subtitle: 'SubHub · Facebook Data Removal',
    statusNotFound: 'Request not found',
    statusCompleted: 'Data deleted',
    statusFailed: 'Deletion failed — contact us',
    statusPending: 'Deletion in progress',
    confirmationCodeLabel: 'Confirmation code:',
    requestedOn: (date: string) => `Requested: ${date}`,
    deletedTitle: 'What gets deleted',
    deletedItems: [
      'Your account and login credentials',
      'All sublet listings you posted',
      'Any saved preferences or settings',
    ],
    manualTitle: 'Request deletion manually',
    manualBodyBefore: 'To delete your SubHub data, send an email with the subject line',
    mailSubject: 'Data Deletion Request',
    manualBodyAfter: 'from the email address associated with your account:',
    manualTimeline: 'We will process your request within 30 days.',
    requiredByBefore: 'This page is required by ',
    requiredByLink: "Facebook's data deletion policy",
    requiredByAfter: '.',
  },

  instructions: {
    documentTitle: 'Data Deletion Instructions — SubHub',
    title: 'Data Deletion Instructions',
    subtitle: 'How to remove your SubHub account and all associated data from our systems.',
    stepsTitle: 'Step-by-step via Facebook',
    steps: [
      { title: 'Open Facebook Settings', body: 'On Facebook, go to Settings & Privacy → Settings → Security and Login → Apps and Websites.' },
      { title: 'Find SubHub', body: 'Locate SubHub in the list of apps connected to your Facebook account.' },
      { title: 'Remove the App', body: 'Click "Remove" next to SubHub. Facebook will automatically notify us to delete your data.' },
      { title: 'Confirmation', body: 'You will receive a confirmation code and a link to track your deletion request status.' },
    ],
    contactTitle: 'Prefer to contact us directly?',
    contactBodyBefore: 'Send an email with the subject line',
    mailSubject: 'Data Deletion Request',
    contactBodyAfter: 'from the address linked to your SubHub account. We will process it within 30 days.',
    deletedTitle: 'What gets deleted',
    deletedItems: [
      'Your SubHub account and login credentials',
      'All sublet listings you created',
      'Saved searches and preferences',
      'Any personal information extracted from your Facebook profile (name, email)',
    ],
    retainedTitle: 'What may be retained',
    retainedItems: [
      'Anonymised, non-identifiable analytics data',
      'Aggregated statistics that cannot be linked back to you',
    ],
    processingTitle: 'Processing time',
    processingBodyBefore: 'Deletion requests triggered via Facebook are processed automatically and typically complete within minutes. Manual email requests are processed within ',
    processingBodyStrong: '30 days',
    processingBodyAfter: '.',
    trackQuestion: 'Have a confirmation code from a previous deletion request?',
    trackLink: 'Check deletion status',
    footer: (date: string) => `SubHub · Last updated ${date}`,
  },

  notFound: {
    title: 'Looks like this page moved out',
    body: 'The page you’re looking for doesn’t exist or may have been removed.',
    browse: 'Browse listings',
    home: 'Go home',
  },
};

export type LegalCopy = typeof en;

const he: LegalCopy = {
  homeAriaLabel: 'לדף הבית של SubHub',
  translationNotice: 'תרגום זה נועד לנוחיותכם. במקרה של סתירה, הנוסח האנגלי הוא הקובע.',

  privacy: {
    documentTitle: 'מדיניות פרטיות — SubHub',
    title: 'מדיניות פרטיות',
    lastUpdated: (date: string) => `עודכן לאחרונה: ${date}`,
    intro:
      'SubHub (״אנחנו״, ״אנו״ או ״שלנו״) מפעיל פלטפורמה לפרסום מודעות להשכרה לטווח קצר. מדיניות פרטיות זו מסבירה איזה מידע אישי אנו אוספים, כיצד אנו משתמשים בו ומהן הזכויות שלכם לגבי המידע שלכם. השימוש ב-SubHub מהווה הסכמה שלכם לנהלים המתוארים כאן.',
    sections: [
      {
        title: '1. המידע שאנו אוספים',
        items: [
          { label: 'פרטי חשבון', text: 'כשאתם מתחברים עם Google, Apple או פייסבוק, אנו מקבלים מאותו ספק את שמכם, את כתובת המייל שלכם ואת תמונת הפרופיל שלכם.' },
          { label: 'תוכן המודעות', text: 'טקסט, תמונות, מחיר, תאריכים ופרטי מיקום שאתם מוסרים כשאתם מפרסמים מודעת סאבלט.' },
          { label: 'נתוני שימוש', text: 'דפים שנצפו, חיפושים ואירועי אינטראקציה, הנאספים באופן אוטומטי לשיפור השירות.' },
          { label: 'נתוני מכשיר ויומני שרת', text: 'סוג הדפדפן, כתובת ה-IP וחותמות זמן הנרשמים ביומני השרת.' },
        ],
      },
      {
        title: '2. כיצד אנו משתמשים במידע שלכם',
        items: [
          { label: 'מתן השירות', text: 'הצגת המודעות שלכם למשתמשים אחרים ומתן האפשרות לכם לגלוש במודעות.' },
          { label: 'אימות', text: 'אימות זהותכם ושמירה על החיבור שלכם לחשבון.' },
          { label: 'תקשורת', text: 'שליחת הודעות מייל תפעוליות, כגון אישורים על פרסום מודעות או תשובות מהתמיכה.' },
          { label: 'שיפור', text: 'ניתוח דפוסי שימוש כדי לתקן תקלות ולשפר את התכונות.' },
          { label: 'עמידה בדרישות החוק', text: 'עמידה בחובות לפי הדין החל ומענה לבקשות חוקיות.' },
        ],
      },
      {
        title: '3. שירותי צד שלישי',
        items: [
          { label: 'Firebase (Google)', text: 'אימות, מסד נתונים ואירוח. המידע מאוחסן ב-Google Cloud. ראו google.com/policies/privacy.' },
          { label: 'התחברות עם פייסבוק', text: 'אפשרות התחברות לבחירתכם. אנו מקבלים רק את הפרופיל הציבורי שלכם ואת כתובת המייל שלכם. ראו facebook.com/policy.php.' },
          { label: 'התחברות עם Google', text: 'אפשרות התחברות לבחירתכם. ראו policies.google.com/privacy.' },
          { label: 'Apify', text: 'אנו משתמשים ב-Apify כדי לאסוף פוסטים זמינים לציבור מקבוצות פייסבוק. לא נשלח ל-Apify כל מידע אישי מעבר למה שגלוי לציבור.' },
        ],
      },
      {
        title: '4. שיתוף מידע',
        items: [
          { label: 'איננו מוכרים את המידע שלכם', text: 'לעולם איננו מוכרים או משכירים את המידע האישי שלכם לצדדים שלישיים.' },
          { label: 'ספקי שירות', text: 'אנו משתפים מידע רק עם ספקי התשתית המפורטים לעיל, במסגרת הסכמי עיבוד נתונים מחמירים.' },
          { label: 'דרישות החוק', text: 'אנו עשויים למסור מידע אם הדבר נדרש על פי חוק או צו בית משפט, או כדי להגן על הזכויות והבטיחות של המשתמשים.' },
        ],
      },
      {
        title: '5. שמירת מידע',
        items: [
          { label: 'חשבונות פעילים', text: 'אנו שומרים את המידע שלכם כל עוד החשבון שלכם פעיל.' },
          { label: 'מודעות', text: 'מודעות נשמרות עד שתמחקו אותן או עד שהחשבון שלכם יוסר.' },
          { label: 'יומני שרת', text: 'יומני השרת נמחקים אוטומטית לאחר 90 יום.' },
        ],
      },
      {
        title: '6. הזכויות שלכם',
        items: [
          { label: 'עיון', text: 'באפשרותכם לבקש עותק של המידע האישי שאנו מחזיקים עליכם.' },
          { label: 'תיקון', text: 'באפשרותכם לעדכן את שמכם או את כתובת המייל שלכם דרך הגדרות החשבון.' },
          { label: 'מחיקה', text: 'באפשרותכם לבקש בכל עת את מחיקת החשבון שלכם ואת כל המידע הקשור אליו.' },
          { label: 'ניוד', text: 'באפשרותכם לבקש את המידע שלכם בפורמט מובנה וקריא למכונה.' },
        ],
      },
      {
        title: '7. עוגיות',
        items: [
          { label: 'עוגיות הפעלה', text: 'משמשות כדי שתישארו מחוברים במהלך הגלישה.' },
          { label: 'אין עוגיות מעקב', text: 'איננו משתמשים בעוגיות פרסום או בעוגיות למעקב בין אתרים.' },
        ],
      },
      {
        title: '8. פרטיות ילדים',
        items: [
          { label: 'דרישת גיל', text: 'SubHub אינו מיועד לילדים מתחת לגיל 13. איננו אוספים ביודעין מידע מילדים. אם אתם סבורים שילד מסר לנו מידע אישי, פנו אלינו ונמחק אותו.' },
        ],
      },
      {
        title: '9. אבטחה',
        items: [
          { label: 'הצפנה', text: 'כל המידע מועבר בחיבור מוצפן (HTTPS/TLS).' },
          { label: 'בקרת גישה', text: 'הגישה למסד הנתונים מוגבלת לחשבונות שירות מאומתים, עם ההרשאות המינימליות הנדרשות.' },
          { label: 'מגבלות', text: 'אף מערכת אינה מאובטחת באופן מושלם. במקרה של פרצת אבטחה, נודיע למשתמשים שנפגעו כנדרש על פי חוק.' },
        ],
      },
      {
        title: '10. שינויים במדיניות זו',
        items: [
          { label: 'הודעה על שינויים', text: 'אנו עשויים לעדכן מדיניות זו מעת לעת. תאריך ״עודכן לאחרונה״ בראש דף זה ישקף כל שינוי. המשך השימוש ב-SubHub לאחר השינויים מהווה הסכמה להם.' },
        ],
      },
    ],
    contactTitle: 'צרו קשר',
    contactBody: 'לכל שאלה בנושא פרטיות או כדי לממש את זכויותיכם, פנו אלינו בכתובת:',
    contactMailSubject: 'בקשה בנושא פרטיות',
    deletionLinkBefore: 'כדי למחוק את המידע שלכם, בקרו בדף ',
    deletionLinkText: 'הוראות למחיקת נתונים',
    deletionLinkAfter: '.',
  },

  deletion: {
    documentTitle: 'מחיקת נתונים — SubHub',
    title: 'מחיקת נתונים',
    subtitle: 'SubHub · הסרת נתוני פייסבוק',
    statusNotFound: 'הבקשה לא נמצאה',
    statusCompleted: 'הנתונים נמחקו',
    statusFailed: 'המחיקה נכשלה — פנו אלינו',
    statusPending: 'המחיקה בתהליך',
    confirmationCodeLabel: 'קוד אישור:',
    requestedOn: (date: string) => `תאריך הבקשה: ${date}`,
    deletedTitle: 'מה נמחק',
    deletedItems: [
      'החשבון ופרטי ההתחברות שלכם',
      'כל מודעות הסאבלט שפרסמתם',
      'כל ההעדפות או ההגדרות ששמרתם',
    ],
    manualTitle: 'בקשת מחיקה ידנית',
    manualBodyBefore: 'כדי למחוק את הנתונים שלכם ב-SubHub, שלחו מייל עם שורת הנושא',
    mailSubject: 'בקשת מחיקת נתונים',
    manualBodyAfter: 'מכתובת המייל המשויכת לחשבון שלכם:',
    manualTimeline: 'נטפל בבקשתכם תוך 30 יום.',
    requiredByBefore: 'דף זה נדרש לפי ',
    requiredByLink: 'מדיניות מחיקת הנתונים של פייסבוק',
    requiredByAfter: '.',
  },

  instructions: {
    documentTitle: 'הוראות למחיקת נתונים — SubHub',
    title: 'הוראות למחיקת נתונים',
    subtitle: 'איך להסיר את חשבון SubHub שלכם ואת כל המידע הקשור אליו מהמערכות שלנו.',
    stepsTitle: 'שלב אחר שלב דרך פייסבוק',
    steps: [
      { title: 'פתחו את ההגדרות בפייסבוק', body: 'בפייסבוק, עברו אל הגדרות ופרטיות ← הגדרות ← אבטחה והתחברות ← אפליקציות ואתרים.' },
      { title: 'אתרו את SubHub', body: 'מצאו את SubHub ברשימת האפליקציות המחוברות לחשבון הפייסבוק שלכם.' },
      { title: 'הסירו את האפליקציה', body: 'לחצו על ״הסרה״ ליד SubHub. פייסבוק יודיע לנו באופן אוטומטי למחוק את הנתונים שלכם.' },
      { title: 'אישור', body: 'תקבלו קוד אישור וקישור למעקב אחר סטטוס בקשת המחיקה שלכם.' },
    ],
    contactTitle: 'מעדיפים לפנות אלינו ישירות?',
    contactBodyBefore: 'שלחו מייל עם שורת הנושא',
    mailSubject: 'בקשת מחיקת נתונים',
    contactBodyAfter: 'מהכתובת המקושרת לחשבון SubHub שלכם. נטפל בבקשה תוך 30 יום.',
    deletedTitle: 'מה נמחק',
    deletedItems: [
      'חשבון SubHub ופרטי ההתחברות שלכם',
      'כל מודעות הסאבלט שיצרתם',
      'חיפושים והעדפות שמורים',
      'כל מידע אישי שחולץ מפרופיל הפייסבוק שלכם (שם, כתובת מייל)',
    ],
    retainedTitle: 'מה עשוי להישמר',
    retainedItems: [
      'נתוני אנליטיקה אנונימיים שאינם מזהים',
      'נתונים סטטיסטיים מצרפיים שלא ניתן לקשר אליכם',
    ],
    processingTitle: 'זמן טיפול',
    processingBodyBefore: 'בקשות מחיקה שנשלחות דרך פייסבוק מטופלות באופן אוטומטי ומסתיימות בדרך כלל תוך דקות. בקשות ידניות במייל מטופלות תוך ',
    processingBodyStrong: '30 יום',
    processingBodyAfter: '.',
    trackQuestion: 'יש לכם קוד אישור מבקשת מחיקה קודמת?',
    trackLink: 'לבדיקת סטטוס המחיקה',
    footer: (date: string) => `SubHub · עודכן לאחרונה ב${date}`,
  },

  notFound: {
    title: 'נראה שהדף הזה עבר דירה',
    body: 'הדף שחיפשתם לא קיים או שאולי הוסר.',
    browse: 'לצפייה במודעות',
    home: 'לדף הבית',
  },
};

export function legalCopy(language: string): LegalCopy {
  return language === 'he' ? he : en;
}

export function mailtoHref(subject: string): string {
  return `mailto:support@subhub.app?subject=${encodeURIComponent(subject)}`;
}
