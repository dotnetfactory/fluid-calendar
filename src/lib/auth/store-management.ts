/**
 * Store Management Module
 *
 * This module provides centralized functions for managing application stores:
 * - Initializing stores with user data on app mount or login
 * - Clearing user-specific data from stores on logout
 * - React hook for logout with automatic store cleanup
 */
import { useCallback, useState } from "react";

import { signOut } from "next-auth/react";

import { useCalendarStore, useViewStore } from "@/store/calendar";
import { useFocusModeStore } from "@/store/focusMode";
import { useProjectStore } from "@/store/project";
import { useSettingsStore } from "@/store/settings";
import { useSetupStore } from "@/store/setup";
import { useTaskStore } from "@/store/task";

/**
 * Lists of stores to handle during logout
 */
const STORE_KEYS = {
  // These stores should be completely cleared
  clearCompletely: [
    "task-store",
    "project-store",
    "calendar-store",
    "fluid-calendar-setup-storage",
  ],

  // These stores should keep UI preferences but clear user-specific data
  keepPreferences: [
    "calendar-view-store",
    "calendar-ui-store",
    "settings-store",
  ],
};

/**
 * Clear user-specific data from stores when a user logs out
 * This prevents the next user on the same device from seeing previous user's data
 */
export function clearStoresOnLogout() {
  // Clear each store using their dedicated clear methods
  useTaskStore.getState().clear();
  useProjectStore.getState().clear();
  useCalendarStore.getState().clear();
  useViewStore.getState().clear();
  useFocusModeStore.getState().clear();
  useSettingsStore.getState().clear();

  // Clear SaaS-specific stores if available
  import(
    `@/store/waitlist${process.env.NEXT_PUBLIC_ENABLE_SAAS_FEATURES === "true" ? ".saas" : ".open"}`
  )
    .then(({ useWaitlistStore }) => {
      try {
        useWaitlistStore.getState().clear();
      } catch (error) {
        console.error("Failed to clear waitlist store:", error);
      }
    })
    .catch(() => {
      // Silently ignore if the module is not available
    });

  // Force localStorage cleanup for complete data removal
  STORE_KEYS.clearCompletely.forEach((storeKey) => {
    Object.keys(localStorage).forEach((key) => {
      if (key.includes(storeKey)) {
        localStorage.removeItem(key);
      }
    });
  });
}

/**
 * Initialize all stores with user data on login or app mount
 * This ensures that the stores are populated with the latest data from the server
 *
 * @returns A promise that resolves when all stores have been initialized
 */
export async function initializeStores() {
  // Create an array to track initialization promises
  const initPromises: Promise<void>[] = [];

  // Reset setup store to ensure a fresh check
  try {
    const setupStore = useSetupStore.getState();
    if (setupStore) {
      setupStore.resetSetupStatus();
    }
  } catch (error) {
    console.error("Failed to reset setup store:", error);
  }

  // Initialize settings store
  try {
    const settingsStore = useSettingsStore.getState();
    if (settingsStore && settingsStore.initializeSettings) {
      const settingsPromise = settingsStore.initializeSettings();
      initPromises.push(settingsPromise);
    }
  } catch (error) {
    console.error("Failed to initialize settings store:", error);
  }

  // Initialize tasks store
  try {
    const taskStore = useTaskStore.getState();
    if (taskStore && taskStore.fetchTasks) {
      const tasksPromise = taskStore.fetchTasks();
      initPromises.push(tasksPromise);
    }
  } catch (error) {
    console.error("Failed to initialize task store:", error);
  }

  // Initialize projects store
  try {
    const projectStore = useProjectStore.getState();
    if (projectStore && projectStore.fetchProjects) {
      const projectsPromise = projectStore.fetchProjects();
      initPromises.push(projectsPromise);
    }
  } catch (error) {
    console.error("Failed to initialize project store:", error);
  }

  // Initialize calendar store
  try {
    const calendarStore = useCalendarStore.getState();
    if (calendarStore && calendarStore.refreshEvents) {
      const calendarPromise = calendarStore.refreshEvents();
      initPromises.push(calendarPromise);
    }
    if (calendarStore && calendarStore.refreshFeeds) {
      const feedsPromise = calendarStore.refreshFeeds();
      initPromises.push(feedsPromise);
    }
  } catch (error) {
    console.error("Failed to initialize calendar store:", error);
  }

  // Initialize waitlist store if available
  try {
    const { useWaitlistStore } = await import(
      `@/store/waitlist${process.env.NEXT_PUBLIC_ENABLE_SAAS_FEATURES === "true" ? ".saas" : ".open"}`
    );
    const waitlistStore = useWaitlistStore.getState();
    if (waitlistStore && waitlistStore.fetchEntries) {
      const waitlistPromise = waitlistStore.fetchEntries();
      initPromises.push(waitlistPromise);
    }
  } catch (error) {
    console.error("Failed to initialize waitlist store:", error);
  }

  // Wait for all initialization promises to complete
  await Promise.allSettled(initPromises);
}

/**
 * React hook that provides a logout function with store cleanup
 * Use this instead of Next-Auth's signOut for proper cleanup
 *
 * @example
 * const { logoutWithCleanup, isLoggingOut } = useLogout();
 *
 * return (
 *   <Button onClick={logoutWithCleanup} disabled={isLoggingOut}>
 *     {isLoggingOut ? "Logging out..." : "Log out"}
 *   </Button>
 * );
 */
export function useLogout() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const logoutWithCleanup = useCallback(
    async (callbackUrl = "/auth/signin") => {
      setIsLoggingOut(true);

      // Clear user data from stores
      clearStoresOnLogout();

      // Call NextAuth signOut
      await signOut({ callbackUrl });
    },
    []
  );

  return { logoutWithCleanup, isLoggingOut };
}
