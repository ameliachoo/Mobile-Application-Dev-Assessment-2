import React, { createContext, useState, useContext } from 'react';

/**
 * Theme Context Type
 * 
 * - defines the theme context.
 */
type ThemeContextType = {
  isDarkMode: boolean;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

/**
 * ThemeProvider Component
 * 
 * - global state provider for managing light and dark mode.
 * - provides theme toggle to all child components.
 * 
 * - theme defaults to light mode (ugly i know).
 */
export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };
  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

/**
 * useTheme Hook
 * 
 * - custom hook to access the theme context.
 * - provides access to current theme state and toggle function.
 */
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};