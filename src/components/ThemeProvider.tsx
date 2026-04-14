'use client';

import * as React from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextValue {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = React.createContext<ThemeContextValue>({
  theme: 'dark',
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = React.useState<Theme>('dark');

  React.useEffect(() => {
    const stored = localStorage.getItem('stashflow-theme') as Theme | null;
    const initial = stored ?? 'dark';
    setTheme(initial);
    document.documentElement.setAttribute('data-theme', initial);
    document.documentElement.classList.toggle('dark', initial === 'dark');
    document.documentElement.classList.toggle('light', initial === 'light');
  }, []);

  const toggleTheme = React.useCallback(() => {
    setTheme(prev => {
      const next: Theme = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('stashflow-theme', next);
      document.documentElement.setAttribute('data-theme', next);
      document.documentElement.classList.toggle('dark', next === 'dark');
      document.documentElement.classList.toggle('light', next === 'light');
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => React.useContext(ThemeContext);
