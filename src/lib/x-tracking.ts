import { logger } from "@/lib/logger";

const LOG_SOURCE = "XTracking";

// X conversion event ID from the provided tracking code
const X_CONVERSION_EVENT_ID = "tw-qefry-qefrz";

// Key for tracking signup events to prevent duplicates
const SIGNUP_TRACKED_KEY = "x_signup_tracked";

declare global {
  interface Window {
    twq?: (
      command: string,
      eventId: string,
      params?: { email_address?: string | null }
    ) => void;
  }
}

/**
 * Tracks a user signup conversion event with X (Twitter) ads
 * @param email - User's email address
 * @param context - Additional context for logging (e.g., "regular", "waitlist", "subscription")
 */
export function trackUserSignup(
  email: string,
  context: string = "signup"
): void {
  try {
    // Check if X pixel is loaded
    if (typeof window === "undefined" || !window.twq) {
      logger.warn(
        "X pixel not loaded, skipping conversion tracking",
        { email, context },
        LOG_SOURCE
      );
      return;
    }

    // Check if we've already tracked a signup for this user in this session
    const trackingKey = `${SIGNUP_TRACKED_KEY}_${email}`;
    if (sessionStorage.getItem(trackingKey)) {
      logger.info(
        "Signup already tracked for this user in current session",
        { email, context },
        LOG_SOURCE
      );
      return;
    }

    // Fire the X conversion event
    window.twq("event", X_CONVERSION_EVENT_ID, {
      email_address: email,
    });

    // Mark as tracked to prevent duplicates
    sessionStorage.setItem(trackingKey, "true");

    logger.info(
      "X conversion event fired successfully",
      { email, context, eventId: X_CONVERSION_EVENT_ID },
      LOG_SOURCE
    );
  } catch (error) {
    // Log error but don't throw - tracking failures shouldn't break user experience
    logger.error(
      "Failed to track X conversion event",
      {
        email,
        context,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      LOG_SOURCE
    );
  }
}

/**
 * Utility to check if X pixel is loaded and ready
 * @returns boolean indicating if X pixel is available
 */
export function isXPixelLoaded(): boolean {
  return typeof window !== "undefined" && typeof window.twq === "function";
}
