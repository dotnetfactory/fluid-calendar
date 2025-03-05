import { getServerSession } from "next-auth";
import { getAuthOptions } from "@/lib/auth/auth-options";
import { logger } from "@/lib/logger";

const LOG_SOURCE = "AdminCheck";

/**
 * Checks if the current user is an admin
 * @returns {Promise<boolean>} Whether the current user is an admin
 */
export async function isAdmin(): Promise<boolean> {
  try {
    const authOptions = await getAuthOptions();
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      logger.info(
        "No session found when checking admin status",
        {},
        LOG_SOURCE
      );
      return false;
    }

    const isUserAdmin = session.user.role === "admin";
    logger.info(
      "Checked if user is admin",
      { isAdmin: isUserAdmin },
      LOG_SOURCE
    );

    return isUserAdmin;
  } catch (error) {
    logger.error(
      "Error checking if user is admin",
      { error: error instanceof Error ? error.message : "Unknown error" },
      LOG_SOURCE
    );
    return false;
  }
}

/**
 * Client-side hook to check if the current user is an admin
 * This should be used in client components
 * @param session The session object from useSession()
 * @returns {boolean} Whether the current user is an admin
 */
export function isAdminFromSession(session: any): boolean {
  return session?.user?.role === "admin";
}
