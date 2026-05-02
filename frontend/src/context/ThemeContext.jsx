import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem("clashofcode_theme");
    return stored && stored !== "undefined" ? stored : "dark";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("clashofcode_theme", theme);
  }, [theme]);

  // Clean up corrupted localStorage
  useEffect(() => {
    const themeStored = localStorage.getItem("clashofcode_theme");
    if (themeStored === "undefined") {
      localStorage.removeItem("clashofcode_theme");
    }
  }, []);

  const toggleTheme = () => setTheme((current) => (current === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
