const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  he: 'Hebrew',
  es: 'Spanish',
  fr: 'French',
  it: 'Italian',
  ru: 'Russian',
  uk: 'Ukrainian',
  pt: 'Portuguese',
  de: 'German',
  zh: 'Chinese',
};

export async function translateText(
  text: string,
  targetLanguage: string,
): Promise<string | null> {
  if (!text) return null;

  try {
    const response = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text.slice(0, 1000), targetLanguage }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.translation ?? null;
  } catch {
    return null;
  }
}

export { LANGUAGE_NAMES };
