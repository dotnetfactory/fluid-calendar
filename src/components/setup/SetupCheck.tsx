"use client";

import { useEffect, useState } from "react";

import { usePathname, useRouter } from "next/navigation";

import { checkSetupStatus } from "@/lib/setup-actions";

import { useSetupStore } from "@/store/setup";

// How often to check the setup status (in milliseconds)
// Default: 1 hour
const CHECK_INTERVAL = 60 * 60 * 1000;

export function SetupCheck() {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);

  // Get setup state from Zustand store
  const { hasChecked, needsSetup, lastChecked, setSetupStatus, markAsChecked } =
    useSetupStore();

  useEffect(() => {
    // Skip check if already on setup page
    if (pathname === "/setup") {
      setLoading(false);
      return;
    }

    // Skip check for API routes
    if (pathname.startsWith("/api")) {
      setLoading(false);
      return;
    }

    const shouldCheckSetup = () => {
      // If we've never checked before, we should check
      if (!hasChecked || needsSetup === null) return true;

      // If we know setup is needed, redirect immediately
      if (needsSetup === true) {
        router.push("/setup");
        return false;
      }

      // If we've checked recently, don't check again
      if (lastChecked && Date.now() - lastChecked < CHECK_INTERVAL) {
        return false;
      }

      // Otherwise, check again
      return true;
    };

    const checkSetup = async () => {
      try {
        // If we don't need to check, just mark as loaded
        if (!shouldCheckSetup()) {
          setLoading(false);
          return;
        }

        // Otherwise, check the setup status
        const data = await checkSetupStatus();

        // Update the store with the result
        setSetupStatus(data.needsSetup);

        // If setup is needed, redirect to setup page
        if (data.needsSetup) {
          router.push("/setup");
        }
      } catch (error) {
        console.error("Failed to check setup status:", error);
        // Mark as checked even if there was an error
        markAsChecked();
      } finally {
        setLoading(false);
      }
    };

    checkSetup();
  }, [
    pathname,
    router,
    hasChecked,
    needsSetup,
    lastChecked,
    setSetupStatus,
    markAsChecked,
  ]);

  // Show loading state or render nothing
  return loading ? <div>Loading...</div> : null;
}
