// Copy for sign-in, account pages (saved, profile, messages), listing actions
// and the small post-flow strings that aren't in translations.ts.
// Never mix languages: Hebrew strings use Hebrew words only (company names in
// Hebrew script), the only Latin allowed is the brand "SubHub".
// Keep claims accurate: search is keyword matching (not "AI-powered"), and the
// product is free (don't promise "free forever").

/** Stable auth error codes returned by services/authService.ts. */
export type AuthErrorCode =
  | 'not-configured'
  | 'invalid-credentials'
  | 'invalid-email'
  | 'email-in-use'
  | 'weak-password'
  | 'popup-blocked'
  | 'popup-redirect'
  | 'cancelled'
  | 'network'
  | 'too-many-requests'
  | 'signup-failed'
  | 'provider-failed'
  | 'unknown';

const en = {
  auth: {
    reasons: {
      save: {
        title: 'Sign up to save this listing',
        subtitle: 'Keep the listings you like in one place.',
      },
      contact: {
        title: 'Sign up to contact the poster',
        subtitle: 'You’ll message them on Facebook, where the listing was posted.',
      },
      general: {
        title: 'Join SubHub',
        subtitle: 'Save listings and contact posters.',
      },
    },
    welcomeBack: 'Welcome back',
    continueWithGoogle: 'Continue with Google',
    continueWithEmail: 'Continue with Email',
    haveAccount: 'Already have an account?',
    signInLink: 'Sign in',
    tagline: 'Takes a few seconds. It’s free.',
    signUpTab: 'Sign up',
    logInTab: 'Log in',
    namePlaceholder: 'Full name',
    emailPlaceholder: 'Email address',
    passwordPlaceholder: 'Password',
    createAccount: 'Create account',
    signInSubmit: 'Sign in',
    otherOptions: 'Other sign-in options',
    close: 'Close',
    // Validation (the English wording matches the original validator messages)
    emailRequired: 'Email is required.',
    emailInvalid: 'Please enter a valid email address.',
    passwordRequired: 'Password is required.',
    passwordTooShort: (n: number) => `Password must be at least ${n} characters.`,
    nameRequired: 'Name is required.',
    errors: {
      'not-configured': 'Sign-in isn’t available right now.',
      'invalid-credentials': 'Incorrect email or password.',
      'invalid-email': 'Please enter a valid email address.',
      'email-in-use': 'This email is already registered. Try logging in.',
      'weak-password': 'That password is too weak. Try a longer one.',
      'popup-blocked': 'Your browser blocked the sign-in window. Allow pop-ups and try again.',
      'popup-redirect': 'The sign-in window was blocked. Redirecting you to finish signing in…',
      cancelled: 'Sign-in was cancelled.',
      network: 'Network error. Check your connection and try again.',
      'too-many-requests': 'Too many attempts. Please wait a few minutes and try again.',
      'signup-failed': 'We couldn’t create your account. Please try again.',
      'provider-failed': 'Sign-in failed. Please try again.',
      unknown: 'Something went wrong. Please try again.',
    } satisfies Record<AuthErrorCode, string>,
  },

  saved: {
    removeFromSaved: 'Remove from saved',
    perMonth: '/mo',
    savedCount: (n: number) => `${n.toLocaleString('en')} saved`,
  },

  profile: {
    memberSince: (date: string) => `Member since ${date}`,
    loading: 'Loading…',
    signingOut: 'Signing out…',
    userFallback: 'User',
  },

  messages: {
    subtitle: 'Your conversations with landlords.',
    comingSoon: 'Coming soon',
    findListing: 'Find a listing',
    backToMessages: 'Back to messages',
    comingSoonTitle: 'Messaging coming soon',
    comingSoonBody: 'In-app messaging is on the way. For now, contact landlords directly through the original post.',
    browseListings: 'Browse listings',
  },

  listingActions: {
    menuLabel: 'Listing actions',
    notSignedIn: 'You’re signed out. Sign in and try again.',
    pauseFailed: 'Couldn’t pause the listing. Please try again.',
    resumeFailed: 'Couldn’t resume the listing. Please try again.',
    fillFailed: 'Couldn’t mark the listing as filled. Please try again.',
    deleteFailed: 'Couldn’t delete the listing. Please try again.',
  },

  post: {
    addressPlaceholder: '12 Rothschild Blvd',
    cityPlaceholder: 'Tel Aviv',
    addPhoto: 'Add',
    removePhoto: 'Remove photo',
    maxPhotos: (n: number) => `You can add up to ${n} photos.`,
    photoTooLarge: 'One or more photos are larger than 5 MB.',
    yourListing: 'Your listing',
    close: 'Close',
  },
};

export type AccountCopy = typeof en;

const he: AccountCopy = {
  auth: {
    reasons: {
      save: {
        title: 'הירשמו כדי לשמור את המודעה',
        subtitle: 'כל המודעות שאהבתם במקום אחד.',
      },
      contact: {
        title: 'הירשמו כדי לפנות למפרסם',
        subtitle: 'שולחים לו הודעה בפייסבוק, איפה שהמודעה פורסמה.',
      },
      general: {
        title: 'הצטרפו ל-SubHub',
        subtitle: 'שומרים מודעות ופונים למפרסמים.',
      },
    },
    welcomeBack: 'ברוכים השבים',
    continueWithGoogle: 'המשך עם גוגל',
    continueWithEmail: 'המשך עם אימייל',
    haveAccount: 'כבר יש לכם חשבון?',
    signInLink: 'התחברות',
    tagline: 'לוקח כמה שניות, וזה בחינם.',
    signUpTab: 'הרשמה',
    logInTab: 'התחברות',
    namePlaceholder: 'שם מלא',
    emailPlaceholder: 'כתובת אימייל',
    passwordPlaceholder: 'סיסמה',
    createAccount: 'יצירת חשבון',
    signInSubmit: 'התחברות',
    otherOptions: 'אפשרויות התחברות אחרות',
    close: 'סגירה',
    emailRequired: 'נא להזין אימייל.',
    emailInvalid: 'נא להזין כתובת אימייל תקינה.',
    passwordRequired: 'נא להזין סיסמה.',
    passwordTooShort: (n: number) => `הסיסמה צריכה להכיל לפחות ${n.toLocaleString('he')} תווים.`,
    nameRequired: 'נא להזין שם.',
    errors: {
      'not-configured': 'ההתחברות לא זמינה כרגע.',
      'invalid-credentials': 'האימייל או הסיסמה שגויים.',
      'invalid-email': 'נא להזין כתובת אימייל תקינה.',
      'email-in-use': 'האימייל הזה כבר רשום. נסו להתחבר.',
      'weak-password': 'הסיסמה חלשה מדי. נסו סיסמה ארוכה יותר.',
      'popup-blocked': 'הדפדפן חסם את חלון ההתחברות. אפשרו חלונות קופצים ונסו שוב.',
      'popup-redirect': 'חלון ההתחברות נחסם. מעבירים אתכם להשלמת ההתחברות…',
      cancelled: 'ההתחברות בוטלה.',
      network: 'בעיית רשת. בדקו את החיבור ונסו שוב.',
      'too-many-requests': 'יותר מדי ניסיונות. חכו כמה דקות ונסו שוב.',
      'signup-failed': 'לא הצלחנו ליצור את החשבון. נסו שוב.',
      'provider-failed': 'ההתחברות נכשלה. נסו שוב.',
      unknown: 'משהו השתבש. נסו שוב.',
    },
  },

  saved: {
    removeFromSaved: 'הסרה מהשמורים',
    perMonth: '/חודש',
    savedCount: (n: number) => (n === 1 ? 'מודעה שמורה אחת' : `${n.toLocaleString('he')} מודעות שמורות`),
  },

  profile: {
    memberSince: (date: string) => `תאריך הצטרפות: ${date}`,
    loading: 'בטעינה…',
    signingOut: 'מתנתקים…',
    userFallback: 'משתמש',
  },

  messages: {
    subtitle: 'השיחות שלכם עם משכירים.',
    comingSoon: 'בקרוב',
    findListing: 'חיפוש מודעה',
    backToMessages: 'חזרה להודעות',
    comingSoonTitle: 'הודעות באתר יגיעו בקרוב',
    comingSoonBody: 'אנחנו עובדים על הודעות בתוך האתר. בינתיים אפשר לפנות למשכירים ישירות דרך הפוסט המקורי.',
    browseListings: 'לכל המודעות',
  },

  listingActions: {
    menuLabel: 'פעולות למודעה',
    notSignedIn: 'אתם לא מחוברים. התחברו ונסו שוב.',
    pauseFailed: 'לא הצלחנו להשהות את המודעה. נסו שוב.',
    resumeFailed: 'לא הצלחנו לחדש את המודעה. נסו שוב.',
    fillFailed: 'לא הצלחנו לסמן את המודעה כמאוכלסת. נסו שוב.',
    deleteFailed: 'לא הצלחנו למחוק את המודעה. נסו שוב.',
  },

  post: {
    addressPlaceholder: 'רוטשילד 12',
    cityPlaceholder: 'תל אביב-יפו',
    addPhoto: 'הוספה',
    removePhoto: 'הסרת תמונה',
    maxPhotos: (n: number) => `אפשר להוסיף עד ${n.toLocaleString('he')} תמונות.`,
    photoTooLarge: 'תמונה אחת או יותר גדולה מ-5 מגה-בייט.',
    yourListing: 'המודעה שלכם',
    close: 'סגירה',
  },
};

export function accountCopy(language: string): AccountCopy {
  return language === 'he' ? he : en;
}

/** Localized message for an auth error code; unknown or missing codes get a generic message. */
export function authErrorMessage(code: AuthErrorCode | string | undefined, language: string): string {
  const errors = accountCopy(language).auth.errors;
  return (code && code in errors ? errors[code as AuthErrorCode] : errors.unknown);
}
