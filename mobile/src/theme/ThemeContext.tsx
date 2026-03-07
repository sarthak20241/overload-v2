import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getColors, type ColorScheme } from './tokens';

const THEME_KEY = 'overload_theme';

type ThemeState = {
  theme: ColorScheme | 'system';
  isDark: boolean;
  colors: ReturnType<typeof getColors>;
  setTheme: (t: ColorScheme | 'system') => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeState | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [theme, setThemeState] = useState<ColorScheme | 'system'>('dark');

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((s) => {
      if (s === 'light' || s === 'dark' || s === 'system') setThemeState(s);
    });
  }, []);

  const setTheme = (t: ColorScheme | 'system') => {
    setThemeState(t);
    AsyncStorage.setItem(THEME_KEY, t);
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  };

  const resolvedScheme: ColorScheme =
    theme === 'system'
      ? (systemScheme === 'light' || systemScheme === 'dark' ? systemScheme : 'dark')
      : theme;
  const isDark = resolvedScheme === 'dark';
  const colors = getColors(isDark);

  return (
    <ThemeContext.Provider
      value={{ theme, isDark, colors, setTheme, toggleTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeState {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
