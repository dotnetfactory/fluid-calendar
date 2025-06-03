import { createStandardStore } from "../lib/store-factory";

// Separate state and actions for enhanced TypeScript support
interface ShortcutsState {
  isOpen: boolean;
}

interface ShortcutsActions {
  setOpen: (open: boolean) => void;
}

export const useShortcutsStore = createStandardStore({
  name: "shortcuts",
  initialState: { isOpen: false } as ShortcutsState,
  storeCreator: (set) =>
    ({
      setOpen: (open: boolean) => set({ isOpen: open }),
    }) satisfies ShortcutsActions,
});
