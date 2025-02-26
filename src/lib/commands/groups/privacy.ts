"use client";

import { Command } from "@/lib/commands/types";
import { usePrivacy } from "@/components/providers/PrivacyProvider";
import { RiEyeOffLine } from "react-icons/ri";

export function usePrivacyCommands(): Command[] {
  const { isPrivacyModeActive, togglePrivacyMode } = usePrivacy();

  return [
    {
      id: "toggle-privacy-mode",
      title: isPrivacyModeActive
        ? "Disable Privacy Mode"
        : "Enable Privacy Mode",
      shortcut: "p",
      section: "privacy",
      keywords: ["privacy", "blur", "screenshot", "hide", "sensitive"],
      icon: RiEyeOffLine,
      perform: async () => {
        togglePrivacyMode();
      },
    },
  ];
}
