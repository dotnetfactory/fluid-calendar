"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export function SetupCheck() {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Skip check if already on setup page
    if (pathname === "/setup") {
      setIsChecking(false);
      return;
    }

    // Skip check for API routes
    if (pathname.startsWith("/api")) {
      setIsChecking(false);
      return;
    }

    const checkSetup = async () => {
      try {
        const response = await fetch("/api/setup/check");

        if (response.ok) {
          const data = await response.json();

          if (data.needsSetup) {
            // Redirect to setup page
            router.push("/setup");
          }
        }
      } catch (error) {
        console.error("Failed to check if setup is needed:", error);
      } finally {
        setIsChecking(false);
      }
    };

    checkSetup();
  }, [pathname, router]);

  // This component doesn't render anything
  return null;
}
