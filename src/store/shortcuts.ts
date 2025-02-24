import { create } from "zustand";

interface ShortcutsStore {
  isOpen: boolean;
  setOpen: (open: boolean) => void;
}

export const useShortcutsStore = create<ShortcutsStore>((set) => ({
  isOpen: false,
  setOpen: (open) => set({ isOpen: open }),
}));
