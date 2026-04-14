import { create } from "zustand";

import { Area, NewArea, UpdateArea } from "@/types/area";

interface AreaState {
  areas: Area[];
  loading: boolean;
  error: Error | null;

  fetchAreas: () => Promise<void>;
  createArea: (area: NewArea) => Promise<Area>;
  updateArea: (id: string, updates: UpdateArea) => Promise<Area>;
  deleteArea: (id: string) => Promise<void>;
}

export const useAreaStore = create<AreaState>()((set) => ({
  areas: [],
  loading: false,
  error: null,

  fetchAreas: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch("/api/areas");
      if (!res.ok) throw new Error("Failed to fetch areas");
      const areas = await res.json();
      set({ areas });
    } catch (error) {
      set({ error: error as Error });
    } finally {
      set({ loading: false });
    }
  },

  createArea: async (area: NewArea) => {
    const res = await fetch("/api/areas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(area),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to create area");
    }
    const created = await res.json();
    set((state) => ({ areas: [...state.areas, created] }));
    return created;
  },

  updateArea: async (id: string, updates: UpdateArea) => {
    const res = await fetch(`/api/areas/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to update area");
    }
    const updated = await res.json();
    set((state) => ({
      areas: state.areas.map((a) => (a.id === id ? updated : a)),
    }));
    return updated;
  },

  deleteArea: async (id: string) => {
    const res = await fetch(`/api/areas/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to delete area");
    }
    set((state) => ({
      areas: state.areas.filter((a) => a.id !== id),
    }));
  },
}));
