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
      <p className="text-sm text-slate-700 whitespace-pre-wrap">{text}</p>
      {loading && (
        <p className="text-xs text-slate-400 mt-2 italic">{t.parsing}</p>
      )}
      {translation && !loading && (
        <div className="mt-2 pt-2 border-t border-slate-200">
          <p className="text-xs text-slate-400 mb-1">{t.translationLabel}</p>
          <p className="text-sm text-slate-600 whitespace-pre-wrap">{translation}</p>
        </div>
      )}
    </div>
  );
}
