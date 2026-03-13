/* eslint-disable @typescript-eslint/no-unused-vars */
import { logger } from "@/lib/logger";

const LOG_SOURCE = "WaitlistEmail";

export async function sendWaitlistConfirmationEmail(
  props: Record<string, unknown>
) {
  logger.info("Waitlist emails not available in OS mode", {}, LOG_SOURCE);
  return { success: true, jobId: "os-stub" };
}

export async function sendInvitationEmail(props: Record<string, unknown>) {
  logger.info("Invitation emails not available in OS mode", {}, LOG_SOURCE);
  return { success: true, jobId: "os-stub" };
}

export async function sendReferralMilestoneEmail(
  props: Record<string, unknown>
) {
  logger.info("Referral emails not available in OS mode", {}, LOG_SOURCE);
  return { success: true, jobId: "os-stub" };
}

export async function sendReminderEmail(props: Record<string, unknown>) {
  logger.info("Reminder emails not available in OS mode", {}, LOG_SOURCE);
  return { success: true, jobId: "os-stub" };
}

export async function sendVerificationEmail(props: Record<string, unknown>) {
  logger.info("Verification emails not available in OS mode", {}, LOG_SOURCE);
  return { success: true, jobId: "os-stub" };
}

export async function addToAudienceAndsendWaitlistConfirmationEmail(
  props: Record<string, unknown>
) {
  logger.info(
    "Audience management not available in OS mode",
    {},
    LOG_SOURCE
  );
  return { success: true };
}
