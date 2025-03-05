"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

/**
 * Hook to check if the current user is an admin
 * @returns {boolean} Whether the current user is an admin
 */
export function useAdmin(): { isAdmin: boolean; isLoading: boolean } {
  const { data: session, status } = useSession();
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    if (status === "loading") {
      return;
    }

    if (status === "unauthenticated") {
      setIsAdmin(false);
      setIsLoading(false);
      return;
    }

    // Check client-side based on session data
    // This avoids importing server-side code that uses bcrypt
    const clientSideIsAdmin = session?.user?.role === "admin";
    setIsAdmin(clientSideIsAdmin);

    // Then verify with the server
    const verifyAdmin = async () => {
      try {
        const response = await fetch("/api/auth/check-admin");
        if (response.ok) {
          const data = await response.json();
          setIsAdmin(data.isAdmin);
        }
      } catch (error) {
        console.error("Failed to verify admin status:", error);
      } finally {
        setIsLoading(false);
      }
    };

    verifyAdmin();
  }, [session, status]);

  return { isAdmin, isLoading };
}
