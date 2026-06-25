import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = 'pro_theme';
const ACCENT_KEY = 'pro_accent';

// Cores sólidas
export const ACCENT_COLORS = [
  { hex: '#e94560', label: 'Vermelho' },
  { hex: '#007aff', label: 'Azul' },
  { hex: '#5856d6', label: 'Violeta' },
  { hex: '#34c759', label: 'Verde' },
  { hex: '#ff9500', label: 'Laranja' },
  { hex: '#ff2d55', label: 'Rosa' },
  { hex: '#00c7be', label: 'Teal' },
  { hex: '#af52de', label: 'Roxo' },
  { hex: '#ffb3c6', label: 'Rosa Pastel' },
];

// Gradientes — formato especial: "gradient:#cor1,#cor2"
export const GRADIENT_ACCENTS = [
  { id: 'gradient:#ff2d78,#bf5af2', label: 'Neon', colors: ['#ff2d78', '#bf5af2'] },
  { id: 'gradient:#0a84ff,#00d4aa', label: 'Ocean', colors: ['#0a84ff', '#00d4aa'] },
  { id: 'gradient:#f0a500,#ff6b00', label: 'Ouro', colors: ['#f0a500', '#ff6b00'] },
  { id: 'gradient:#30d158,#0a84ff', label: 'Aurora', colors: ['#30d158', '#0a84ff'] },
  { id: 'gradient:#ff6b6b,#feca57', label: 'Sunset', colors: ['#ff6b6b', '#feca57'] },
  { id: 'gradient:#bf5af2,#ff2d55', label: 'Candy', colors: ['#bf5af2', '#ff2d55'] },
  { id: 'gradient:#ffb3c6,#ff6b9d', label: 'Flamingo', colors: ['#ffb3c6', '#ff6b9d'] },
  { id: 'gradient:#2c2c2e,#8e8e93', label: 'Cinza', colors: ['#2c2c2e', '#8e8e93'] },
];

// Devolve os stops do gradiente ou [hex, hex] para cores sólidas
export function parseAccent(value: string): { accent: string; gradient: string[] } {
  if (value.startsWith('gradient:')) {
    const stops = value.replace('gradient:', '').split(',');
    return { accent: stops[0], gradient: stops };
  }
  return { accent: value, gradient: [value, value] };
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function buildColors(isDark: boolean, accentValue: string) {
  const { accent, gradient } = parseAccent(accentValue);
  const base = isDark
    ? {
        bg: '#0f0f0f',
        card: '#1a1a1a',
        card2: '#252525',
        border: '#2a2a2a',
        text: '#ffffff',
        textSub: '#888888',
        textMuted: '#555555',
        inputBg: '#1a1a1a',
        tabBar: '#111111',
        tabBarBorder: '#1a1a1a',
        statusBar: 'light' as const,
        bubble: '#1e1e1e',
        bubbleText: '#eeeeee',
      }
    : {
        bg: '#f2f2f7',
        card: '#ffffff',
        card2: '#f0f0f0',
        border: '#e0e0e0',
        text: '#111111',
        textSub: '#666666',
        textMuted: '#999999',
        inputBg: '#ffffff',
        tabBar: '#ffffff',
        tabBarBorder: '#e0e0e0',
        statusBar: 'dark' as const,
        bubble: '#e8e8e8',
        bubbleText: '#111111',
      };
  return {
    ...base,
    accent,
    accentGradient: gradient,
    isGradient: gradient[0] !== gradient[1],
    accentBg: hexToRgba(accent, isDark ? 0.12 : 0.08),
    accentBorder: hexToRgba(accent, isDark ? 0.25 : 0.3),
  };
}

export type Colors = ReturnType<typeof buildColors>;

type ThemeContextType = {
  isDark: boolean;
  colors: Colors;
  accentColor: string;
  toggleTheme: () => void;
  setAccentColor: (hex: string) => void;
};

const ThemeContext = createContext<ThemeContextType>({
  isDark: true,
  colors: buildColors(true, '#e94560'),
  accentColor: '#e94560',
  toggleTheme: () => {},
  setAccentColor: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(true);
  const [accentColor, setAccentColorState] = useState('#e94560');

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(THEME_KEY),
      AsyncStorage.getItem(ACCENT_KEY),
    ]).then(([theme, accent]) => {
      if (theme !== null) setIsDark(theme === 'dark');
      if (accent !== null) setAccentColorState(accent);
    });
  }, []);

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    AsyncStorage.setItem(THEME_KEY, next ? 'dark' : 'light');
  }

  function setAccentColor(hex: string) {
    setAccentColorState(hex);
    AsyncStorage.setItem(ACCENT_KEY, hex);
  }

  return (
    <ThemeContext.Provider value={{
      isDark,
      colors: buildColors(isDark, accentColor),
      accentColor,
      toggleTheme,
      setAccentColor,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
