"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export function SetupCheck() {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);

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

    const checkSetup = async () => {
      try {
        const response = await fetch("/api/setup/check");
        const data = await response.json();

        if (data.needsSetup) {
          router.push("/setup");
        }
      } catch (error) {
        console.error("Failed to check setup status:", error);
      } finally {
        setLoading(false);
      }
    };

    checkSetup();
  }, [pathname, router]);

  // Show loading state or render children
  return loading ? <div>Loading...</div> : null;
}
