"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type PrivacyContextType = {
  isPrivacyModeActive: boolean;
  togglePrivacyMode: () => void;
};

const PrivacyContext = createContext<PrivacyContextType | undefined>(undefined);

export function usePrivacy() {
  const context = useContext(PrivacyContext);
  if (context === undefined) {
    throw new Error("usePrivacy must be used within a PrivacyProvider");
  }
  return context;
}

export function PrivacyProvider({ children }: { children: React.ReactNode }) {
  const [isPrivacyModeActive, setIsPrivacyModeActive] = useState(false);

  const togglePrivacyMode = () => {
    setIsPrivacyModeActive((prev) => !prev);
  };

  // Add a class to the body when privacy mode is active
  useEffect(() => {
    if (isPrivacyModeActive) {
      document.body.classList.add("privacy-mode-active");
    } else {
      document.body.classList.remove("privacy-mode-active");
    }
  }, [isPrivacyModeActive]);

  return (
    <PrivacyContext.Provider value={{ isPrivacyModeActive, togglePrivacyMode }}>
      {children}
    </PrivacyContext.Provider>
  );
}
