import { createContext, useContext, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { commonTranslations } from './i18n/common';
import { supportingTranslations } from './i18n/supporting';
import { datastationTranslations } from './i18n/datastation';
import { brochureTranslations } from './i18n/brochures';
import { calibrationTranslations } from './i18n/calibration';
import { customerTranslations } from './i18n/customer';
import { freeToolTranslations } from './i18n/freeTools';

export type Language = 'ko' | 'en' | 'ru';
const translations = { ...commonTranslations, ...supportingTranslations, ...datastationTranslations, ...brochureTranslations, ...calibrationTranslations, ...customerTranslations, ...freeToolTranslations };
type LanguageContextValue = { language: Language; setLanguage: (language: Language) => void; t: (source: string) => string };
const LanguageContext = createContext<LanguageContextValue | null>(null);
export const readingElements = 'main h1, main h2, main h3, main h4, main p, main li, main figure, main tr, main summary';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, changeLanguage] = useState<Language>(() => {
    try { const stored = localStorage.getItem('oryx-language'); return stored === 'en' || stored === 'ru' ? stored : 'ko'; } catch { return 'ko'; }
  });
  const position = useRef<{ element: Element; top: number } | null>(null);
  const atTop = useRef(false);
  const setLanguage = (next: Language) => {
    if (next === language) return;
    atTop.current = window.scrollY < 4;
    const line = (document.querySelector('.site-header')?.getBoundingClientRect().bottom ?? 94) + 40;
    // Closed details can retain layout rectangles for their hidden descendants.
    // Only visible content should anchor a language change.
    const elements = Array.from(document.querySelectorAll(readingElements)).filter(el => {
      const closedDetails = el.closest('details:not([open])');
      return !closedDetails || el === closedDetails.querySelector(':scope > summary');
    });
    const element = elements.find(el => { const r = el.getBoundingClientRect(); return r.height > 0 && r.top <= line && r.bottom > line; })
      ?? elements.find(el => { const r = el.getBoundingClientRect(); return r.height > 0 && r.top >= line && r.top < innerHeight; });
    position.current = element ? { element, top: element.getBoundingClientRect().top } : null;
    changeLanguage(next);
  };
  const t = (source: string) => language === 'ko' ? source : translations[source]?.[language] ?? source;
  useLayoutEffect(() => {
    document.documentElement.lang = language;
    try { localStorage.setItem('oryx-language', language); } catch { /* Preference is optional. */ }
    if (atTop.current) window.scrollTo({ top: 0, behavior: 'instant' });
    else if (position.current?.element.isConnected) {
      window.scrollBy({ top: position.current.element.getBoundingClientRect().top - position.current.top, behavior: 'instant' });
    }
    position.current = null;
    atTop.current = false;
    const title = t('Oryx DataSafe | 전자기록·전자서명·데이터 무결성');
    const description = t('Oryx DataSafe의 전자기록, 전자서명, 데이터 무결성 및 교정 업무 소프트웨어. 제품 기능과 도입 범위를 확인하세요.');
    document.title = title;
    for (const selector of ['meta[name="description"]', 'meta[property="og:description"]', 'meta[name="twitter:description"]']) document.querySelector(selector)?.setAttribute('content', description);
    for (const selector of ['meta[property="og:title"]', 'meta[name="twitter:title"]']) document.querySelector(selector)?.setAttribute('content', title);
    document.querySelector('meta[property="og:locale"]')?.setAttribute('content', { ko: 'ko_KR', en: 'en_US', ru: 'ru_RU' }[language]);
    document.querySelector('meta[property="og:image:alt"]')?.setAttribute('content', t('Oryx DataSafe — 전자기록, 전자서명, 데이터 무결성'));
  }, [language]);
  return <LanguageContext.Provider value={{ language, setLanguage, t }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const value = useContext(LanguageContext);
  if (!value) throw new Error('LanguageProvider is required.');
  return value;
}
