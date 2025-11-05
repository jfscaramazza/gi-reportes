import { useState, useCallback } from 'react';
import { translations, Language, TranslationKey } from '@/lib/translations';

export function useTranslations() {
  const [language, setLanguage] = useState<Language>('en');

  const t = useCallback((key: TranslationKey): string => {
    return translations[language][key];
  }, [language]);

  const changeLanguage = useCallback((newLanguage: Language) => {
    setLanguage(newLanguage);
  }, []);

  return {
    language,
    t,
    changeLanguage
  };
}
