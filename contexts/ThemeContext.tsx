// app/contexts/ThemeContext.tsx
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { Colors } from '../constants/theme';

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
  mode: 'system',
  theme: 'light',
  colors: Colors.light,
  isDark: false,
  setMode: () => {},
  toggleTheme: () => {},
});

const STORAGE_KEY = 'kutu_theme_mode';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const deviceScheme = useColorScheme() ?? 'light';
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(saved => {
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        setModeState(saved);
      }
    });
  }, []);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    AsyncStorage.setItem(STORAGE_KEY, newMode);
  };

  const theme: 'light' | 'dark' = mode === 'system' ? deviceScheme : mode;
  const isDark = theme === 'dark';
  const colors = Colors[theme];

  const toggleTheme = () => setMode(isDark ? 'light' : 'dark');

  return (
    <ThemeContext.Provider value={{ mode, theme, colors, isDark, setMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);