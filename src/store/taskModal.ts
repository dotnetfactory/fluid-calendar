import { create } from "zustand";

interface TaskModalStore {
  isOpen: boolean;
  setOpen: (open: boolean) => void;
}

export const useTaskModalStore = create<TaskModalStore>((set) => ({
  isOpen: false,
  setOpen: (open) => set({ isOpen: open }),
}));
