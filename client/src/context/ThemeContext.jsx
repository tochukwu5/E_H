import { createContext, useContext, useEffect, useState } from 'react';

const ThemeCtx = createContext({ theme: 'light', toggle: () => {} });

function initial() {
  try {
    const saved = localStorage.getItem('eh-theme');
    if (saved) return saved;
  } catch {
    /* storage blocked */
  }
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(initial);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0F1629' : '#2747D6');
    try {
      localStorage.setItem('eh-theme', theme);
    } catch {
      /* storage blocked */
    }
  }, [theme]);
  return <ThemeCtx.Provider value={{ theme, toggle: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')) }}>{children}</ThemeCtx.Provider>;
}

export const useTheme = () => useContext(ThemeCtx);
