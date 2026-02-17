import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

type Theme = 'light' | 'dark';

type ThemeContextType = {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
};

const THEME_KEY = 'ops_theme';

const ThemeContext = createContext<ThemeContextType | null>(null);

const applyThemeClass = (theme: Theme) => {
  const root = document.documentElement;
  if (theme === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
};

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
    return 'light';
  });

  useEffect(() => {
    applyThemeClass(theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  const value = useMemo<ThemeContextType>(
    () => ({
      theme,
      toggleTheme: () => setThemeState((prev) => (prev === 'light' ? 'dark' : 'light')),
      setTheme: (next) => setThemeState(next),
    }),
    [theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};

