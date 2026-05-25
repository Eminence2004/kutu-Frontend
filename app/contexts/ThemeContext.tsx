import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

export const Colors = {
  light: {
    background: '#ffffff', card: '#ffffff', text: '#1e293b', subtext: '#94a3b8',
    border: '#f1f5f9', inputBg: '#f8fafc', primary: '#2b59c3', tabIconDefault: '#94a3b8',
    hub: '#ffffff', hubLabel: '#475569', sectionTitle: '#1e293b', countBadge: '#e2e8f0',
    countText: '#475569', postCard: '#ffffff', postBorder: '#f1f5f9', postFooterBorder: '#f8fafc',
    actionColor: '#64748b', avatarBg: '#dcfce7', avatarText: '#166534', logoutBg: '#fee2e2',
    profileBtnBg: '#eff6ff', profileBtnBorder: '#dbeafe', loadingBg: '#ffffff',
  },
  dark: {
    background: '#0f172a', card: '#1e293b', text: '#f1f5f9', subtext: '#64748b',
    border: '#334155', inputBg: '#1e293b', primary: '#3b82f6', tabIconDefault: '#475569',
    hub: '#1e293b', hubLabel: '#94a3b8', sectionTitle: '#f1f5f9', countBadge: '#334155',
    countText: '#94a3b8', postCard: '#1e293b', postBorder: '#334155', postFooterBorder: '#0f172a',
    actionColor: '#94a3b8', avatarBg: '#14532d', avatarText: '#86efac', logoutBg: '#450a0a',
    profileBtnBg: '#1e3a5f', profileBtnBorder: '#1d4ed8', loadingBg: '#0f172a',
  },
};

type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  mode: ThemeMode;
  theme: 'light' | 'dark';
  colors: typeof Colors.light;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  mode: 'light', theme: 'light', colors: Colors.light,
  isDark: false, setMode: () => {}, toggleTheme: () => {},
});

const STORAGE_KEY = 'kutu_theme_mode';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const deviceScheme = useColorScheme() ?? 'light';
  const [mode, setModeState] = useState<ThemeMode>('light');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(saved => {
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        setModeState(saved);
      }
      setReady(true);
    });
  }, []);

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    AsyncStorage.setItem(STORAGE_KEY, newMode);
  }, []);

  const theme: 'light' | 'dark' = mode === 'system' ? deviceScheme : mode;
  const isDark = theme === 'dark';
  const colors = Colors[theme];

  const toggleTheme = useCallback(() => {
    setMode(isDark ? 'light' : 'dark');
  }, [isDark, setMode]);

  if (!ready) return null;

  return (
    <ThemeContext.Provider value={{ mode, theme, colors, isDark, setMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
