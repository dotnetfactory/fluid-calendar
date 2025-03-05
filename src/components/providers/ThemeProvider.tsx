"use client";

import React, { createContext, useContext, useEffect } from "react";
import { useSettingsStore } from "@/store/settings";
import { ThemeMode } from "@/types/settings";

type ThemeContextType = {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user, updateUserSettings } = useSettingsStore();

  // Update the class on the html element whenever the theme changes
  useEffect(() => {
    const root = window.document.documentElement;

    // Remove both classes first
    root.classList.remove("light", "dark");

    // Handle system preference
    if (user.theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";
      root.classList.add(systemTheme);
    } else {
      root.classList.add(user.theme);
    }
  }, [user.theme]);

  // Listen for system theme changes
  useEffect(() => {
    if (user.theme !== "system") return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleChange = () => {
      const root = window.document.documentElement;
      root.classList.remove("light", "dark");
      root.classList.add(mediaQuery.matches ? "dark" : "light");
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [user.theme]);

  const setTheme = (theme: ThemeMode) => {
    updateUserSettings({ theme });
  };

  return (
    <ThemeContext.Provider value={{ theme: user.theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
