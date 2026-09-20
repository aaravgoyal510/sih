'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, TRANSLATIONS } from './translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'en',
  setLanguage: () => {},
  t: (key) => key,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    let saved: Language | null = null;
    try {
      saved = localStorage.getItem('maha_lang') as Language;
    } catch {}
    if (saved && (saved === 'en' || saved === 'hi' || saved === 'mr')) {
      setLanguageState(saved);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('maha_lang', lang);
    } catch {}
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: string): string => {
    const dict = TRANSLATIONS[language] || TRANSLATIONS['en'];
    return dict[key] || TRANSLATIONS['en'][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);

/**
 * Top-bar Language Toggle Pill Component
 */
export const LanguageTogglePill: React.FC = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <div
      style={{
        display: 'inline-flex',
        backgroundColor: '#e8f0e8',
        backdropFilter: 'blur(4px)',
        borderRadius: '20px',
        padding: '3px',
        border: '1px solid rgba(255, 255, 255, 0.4)',
      }}
    >
      <button
        onClick={() => setLanguage('en')}
        style={{
          border: 'none',
          backgroundColor: language === 'en' ? '#ffffff' : 'transparent',
          color: language === 'en' ? '#15803d' : '#385344',
          fontWeight: 700,
          fontSize: '0.75rem',
          borderRadius: '16px',
          padding: '4px 10px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
      >
        EN
      </button>
      <button
        onClick={() => setLanguage('hi')}
        style={{
          border: 'none',
          backgroundColor: language === 'hi' ? '#ffffff' : 'transparent',
          color: language === 'hi' ? '#15803d' : '#385344',
          fontWeight: 700,
          fontSize: '0.75rem',
          borderRadius: '16px',
          padding: '4px 10px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
      >
        हिन्दी
      </button>
      <button
        onClick={() => setLanguage('mr')}
        style={{
          border: 'none',
          backgroundColor: language === 'mr' ? '#ffffff' : 'transparent',
          color: language === 'mr' ? '#15803d' : '#385344',
          fontWeight: 700,
          fontSize: '0.75rem',
          borderRadius: '16px',
          padding: '4px 10px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }}
      >
        मराठी
      </button>
    </div>
  );
};
