'use client';
import { useEffect, useState } from 'react';
import { translateText } from '@/lib/translationService';
import { useLanguage } from '@/contexts/LanguageContext';
import { translations } from '@/translations';

interface Props {
  text: string;
  language: string;
}

export function TranslatedText({ text, language }: Props) {
  const { language: uiLang } = useLanguage();
  const t = translations[uiLang];
  const [translation, setTranslation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!text) {
      setTranslation(null);
      return;
    }
    setLoading(true);
    translateText(text, language)
      .then((result) => {
        // Don't show translation if identical to original (post already in target language)
        setTranslation(result && result.trim() !== text.trim() ? result : null);
      })
      .catch((err) => console.error('[TranslatedText] error:', err))
      .finally(() => setLoading(false));
  }, [text, language]);

  return (
    <div>
      <p className="text-[15px] leading-relaxed text-ink whitespace-pre-wrap">{text}</p>
      {loading && (
        <p className="mt-2 text-xs text-muted">{t.translationLabel}…</p>
      )}
      {translation && !loading && (
        <div className="mt-3 border-t border-line pt-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.06em] text-muted">{t.translationLabel}</p>
          <p className="text-[15px] leading-relaxed text-ink whitespace-pre-wrap">{translation}</p>
        </div>
      )}
    </div>
  );
}
