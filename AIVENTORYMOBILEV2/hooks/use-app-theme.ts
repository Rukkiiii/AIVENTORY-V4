import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeContextType = {
  theme: 'light' | 'dark' | 'system';
  toggleTheme: (theme: 'light' | 'dark' | 'system') => void;
  currentTheme: 'light' | 'dark';
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemTheme = useColorScheme() || 'light';
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem('theme');
      if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system')) {
        setTheme(savedTheme as 'light' | 'dark' | 'system');
      }
    } catch (error) {
      console.error('Failed to load theme', error);
    }
  };

  const toggleTheme = async (newTheme: 'light' | 'dark' | 'system') => {
    try {
      setTheme(newTheme);
      await AsyncStorage.setItem('theme', newTheme);
    } catch (error) {
      console.error('Failed to save theme', error);
    }
  };

  const currentTheme = theme === 'system' ? systemTheme : theme;

  return React.createElement(
    ThemeContext.Provider,
    { value: { theme, toggleTheme, currentTheme } },
    children,
  );
}

export function useAppTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useAppTheme must be used within a ThemeProvider');
  }
  return context;
}