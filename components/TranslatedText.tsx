'use client';
import { useEffect, useState } from 'react';
import { translateText } from '@/lib/translationService';
import { inLanguage } from '@/lib/placeNames';
import { homeCopy } from '@/lib/homeCopy';

interface Props {
  text: string;
  language: string;
}

/**
 * A post's text in the UI language. Text already in that language is shown as is;
 * anything else is shown only as its translation, never next to the original, so a
 * page never mixes languages. The original stays one tap away via the post link.
 */
export function TranslatedText({ text, language }: Props) {
  const copy = homeCopy(language);
  const alreadyInLanguage = inLanguage(text, language);
  const [translation, setTranslation] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'failed'>('idle');

  useEffect(() => {
    if (!text || alreadyInLanguage) {
      setTranslation(null);
      setStatus('idle');
      return;
    }
    let cancelled = false;
    setStatus('loading');
    translateText(text, language)
      .then((result) => {
        if (cancelled) return;
        const usable = result && result.trim() !== text.trim() && inLanguage(result, language);
        setTranslation(usable ? result : null);
        setStatus(usable ? 'done' : 'failed');
      })
      .catch((err) => {
        console.error('[TranslatedText] error:', err);
        if (!cancelled) setStatus('failed');
      });
    return () => { cancelled = true; };
  }, [text, language, alreadyInLanguage]);

  if (alreadyInLanguage) {
    return <p className="text-[15px] leading-relaxed text-ink whitespace-pre-wrap">{text}</p>;
  }
  if (status === 'loading' || status === 'idle') {
    return (
      <div className="space-y-2" aria-busy="true">
        <div className="h-4 w-full animate-pulse rounded bg-brand-50" />
        <div className="h-4 w-4/5 animate-pulse rounded bg-brand-50" />
      </div>
    );
  }
  if (status === 'failed' || !translation) {
    return <p className="text-sm text-muted">{copy.translationUnavailable}</p>;
  }
  return <p className="text-[15px] leading-relaxed text-ink whitespace-pre-wrap">{translation}</p>;
}
