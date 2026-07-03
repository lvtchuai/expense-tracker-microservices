'use client';

import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';
const KEY = 'expense_tracker_theme';

function current(): Theme {
  if (typeof document === 'undefined') return 'dark';
  return (document.documentElement.dataset.theme as Theme) || 'dark';
}

/** Reads/sets the theme on <html data-theme> and persists to localStorage. */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>('dark');

  useEffect(() => {
    setThemeState(current());
  }, []);

  function setTheme(next: Theme) {
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* ignore */
    }
    setThemeState(next);
  }

  const toggle = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  return { theme, setTheme, toggle };
}
