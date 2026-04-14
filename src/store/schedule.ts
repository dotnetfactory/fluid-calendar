import { create } from "zustand";

import { NewSchedule, Schedule, UpdateSchedule } from "@/types/schedule";

interface ScheduleState {
  schedules: Schedule[];
  loading: boolean;
  error: Error | null;

  fetchSchedules: () => Promise<void>;
  createSchedule: (schedule: NewSchedule) => Promise<Schedule>;
  updateSchedule: (id: string, updates: UpdateSchedule) => Promise<Schedule>;
  deleteSchedule: (id: string) => Promise<void>;
}

export const useScheduleStore = create<ScheduleState>()((set) => ({
  schedules: [],
  loading: false,
  error: null,

  fetchSchedules: async () => {
    set({ loading: true, error: null });
    try {
      const res = await fetch("/api/schedules");
      if (!res.ok) throw new Error("Failed to fetch schedules");
      const schedules = await res.json();
      set({ schedules });
    } catch (error) {
      set({ error: error as Error });
    } finally {
      set({ loading: false });
    }
  },

  createSchedule: async (schedule: NewSchedule) => {
    const res = await fetch("/api/schedules", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(schedule),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to create schedule");
    }
    const created = await res.json();
    set((state) => ({ schedules: [...state.schedules, created] }));
    return created;
  },

  updateSchedule: async (id: string, updates: UpdateSchedule) => {
    const res = await fetch(`/api/schedules/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to update schedule");
    }
    const updated = await res.json();
    set((state) => ({
      schedules: state.schedules.map((s) => (s.id === id ? updated : s)),
    }));
    return updated;
  },

  deleteSchedule: async (id: string) => {
    const res = await fetch(`/api/schedules/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to delete schedule");
    }
    set((state) => ({
      schedules: state.schedules.filter((s) => s.id !== id),
    }));
  },
}));
