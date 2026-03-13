"use client";

import { RiEyeOffLine } from "react-icons/ri";

import { usePrivacy } from "@/components/providers/PrivacyProvider";

import { Command } from "@/lib/commands/types";

export function usePrivacyCommands(): Command[] {
  const { isPrivacyModeActive, togglePrivacyMode } = usePrivacy();

  return [
    {
      id: "toggle-privacy-mode",
      title: isPrivacyModeActive
        ? "Disable Privacy Mode"
        : "Enable Privacy Mode",
      section: "privacy",
      keywords: ["privacy", "blur", "screenshot", "hide", "sensitive"],
      icon: RiEyeOffLine,
      perform: async () => {
        togglePrivacyMode();
      },
    },
  ];
}
