import React, { createContext, useContext, useState, useEffect } from 'react';
import { getDb } from '../services/db/client';

export type AppTheme = 'indigo_zen' | 'sakura_night' | 'kyoto_gold' | 'sakura_white';

interface ThemeColors {
  bg: string;
  hexBg: string;      // HEX pour style={{ backgroundColor: ... }}
  bgSecondary: string;
  hexBgSecondary: string;
  card: string;
  hexCard: string;
  text: string;
  hexText: string;
  subtext: string;
  hexSubtext: string;
  accent: string;
  accentText: string;
  accentBg: string;
  accentBorder: string;
  accentSoft: string;
  hexAccent: string;
  border: string;
  hexBorder: string;
  isLight: boolean;
}

export const Themes: Record<AppTheme, ThemeColors> = {
  indigo_zen: {
    bg: 'bg-slate-950', hexBg: '#020617',
    bgSecondary: 'bg-slate-800', hexBgSecondary: '#1e293b',
    card: 'bg-slate-900', hexCard: '#0f172a',
    text: 'text-white', hexText: '#ffffff',
    subtext: 'text-slate-500', hexSubtext: '#64748b',
    accent: 'indigo-500', hexAccent: '#6366f1',
    accentText: 'text-indigo-400',
    accentBg: 'bg-indigo-600',
    accentBorder: 'border-indigo-500',
    accentSoft: 'bg-indigo-500/10',
    border: 'border-slate-800', hexBorder: '#1e293b',
    isLight: false,
  },
  sakura_night: {
    bg: 'bg-black', hexBg: '#000000',
    bgSecondary: 'bg-rose-950/20', hexBgSecondary: '#4c0519',
    card: 'bg-slate-900/50', hexCard: '#0f172a80',
    text: 'text-white', hexText: '#ffffff',
    subtext: 'text-rose-300/40', hexSubtext: '#fda4af66',
    accent: 'rose-500', hexAccent: '#f43f5e',
    accentText: 'text-rose-400',
    accentBg: 'bg-rose-600',
    accentBorder: 'border-rose-500',
    accentSoft: 'bg-rose-500/10',
    border: 'border-rose-900/30', hexBorder: '#4c05194d',
    isLight: false,
  },
  kyoto_gold: {
    bg: 'bg-slate-950', hexBg: '#020617',
    bgSecondary: 'bg-amber-950/20', hexBgSecondary: '#451a03',
    card: 'bg-slate-900', hexCard: '#0f172a',
    text: 'text-white', hexText: '#ffffff',
    subtext: 'text-amber-500/40', hexSubtext: '#f59e0b66',
    accent: 'amber-500', hexAccent: '#f59e0b',
    accentText: 'text-amber-400',
    accentBg: 'bg-amber-600',
    accentBorder: 'border-amber-500',
    accentSoft: 'bg-amber-500/10',
    border: 'border-amber-900/30', hexBorder: '#451a034d',
    isLight: false,
  },
  sakura_white: {
    bg: 'bg-rose-50', hexBg: '#fff1f2',
    bgSecondary: 'bg-rose-100', hexBgSecondary: '#ffe4e6',
    card: 'bg-white', hexCard: '#ffffff',
    text: 'text-slate-900', hexText: '#0f172a',
    subtext: 'text-rose-400', hexSubtext: '#fb7185',
    accent: 'rose-500', hexAccent: '#f43f5e',
    accentText: 'text-rose-600',
    accentBg: 'bg-rose-500',
    accentBorder: 'border-rose-500',
    accentSoft: 'bg-rose-200',
    border: 'border-rose-100', hexBorder: '#ffe4e6',
    isLight: true,
  },
};

interface ThemeContextType {
  theme: AppTheme;
  colors: ThemeColors;
  setTheme: (t: AppTheme) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<AppTheme>('indigo_zen');

  useEffect(() => {
    let isMounted = true;
    async function loadTheme() {
      try {
        const db = await getDb();
        const user: any = await db.getFirstAsync('SELECT app_theme FROM users LIMIT 1');
        if (isMounted && user?.app_theme) {
          setThemeState(user.app_theme as AppTheme);
        }
      } catch (e) {
        console.error("Failed to load theme from DB", e);
      }
    }
    loadTheme();
    return () => { isMounted = false; };
  }, []);

  const setTheme = async (newTheme: AppTheme) => {
    // 1. Update UI state immediately
    setThemeState(newTheme);
    
    // 2. Persist to DB safely
    try {
      const db = await getDb();
      // Ensure the value is a string and not undefined/null
      const themeValue = String(newTheme);
      
      // Use execAsync for a direct update or runAsync with explicit params
      await db.runAsync('UPDATE users SET app_theme = ?', [themeValue]);
      console.log(`✅ Theme saved: ${themeValue}`);
    } catch (e) {
      console.error("Failed to save theme to DB:", e);
    }
  };

  const colors = Themes[theme];

  return (
    <ThemeContext.Provider value={{ theme, colors, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
