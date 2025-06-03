import { createStandardStore } from "../lib/store-factory";

interface TaskModalState {
  isOpen: boolean;
}

interface TaskModalActions {
  setOpen: (open: boolean) => void;
}

// Using our standardized store factory
export const useTaskModalStore = createStandardStore({
  name: "task-modal",
  initialState: { isOpen: false } as TaskModalState,
  storeCreator: (set) =>
    ({
      setOpen: (open: boolean) => set({ isOpen: open }),
    }) satisfies TaskModalActions,
});
