import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import pt from './translations/pt';
import en from './translations/en';
import es from './translations/es';
import fr from './translations/fr';

export const LANGUAGES = [
  { code: 'pt', label: 'Português', flag: '🇵🇹' },
  { code: 'en', label: 'English',   flag: '🇬🇧' },
  { code: 'es', label: 'Español',   flag: '🇪🇸' },
  { code: 'fr', label: 'Français',  flag: '🇫🇷' },
];

const STORAGE_KEY = 'app_language';

export async function initI18n() {
  if (i18n.isInitialized) {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored && stored !== i18n.language) await i18n.changeLanguage(stored);
    return;
  }

  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  const deviceLang = Localization.getLocales()[0]?.languageCode ?? 'en';
  const supported = LANGUAGES.map(l => l.code);
  const lng = stored ?? (supported.includes(deviceLang) ? deviceLang : 'en');

  await i18n.use(initReactI18next).init({
    resources: { pt: { translation: pt }, en: { translation: en }, es: { translation: es }, fr: { translation: fr } },
    lng,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
}

export async function changeLanguage(code: string) {
  await AsyncStorage.setItem(STORAGE_KEY, code);
  await i18n.changeLanguage(code);
}

export async function getStoredLanguage(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_KEY);
}

export default i18n;
