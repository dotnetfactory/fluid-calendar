import { isSaasEnabled } from "@/lib/config";
import { logger } from "@/lib/logger";

import { getPasswordResetTemplate } from "./templates/password-reset";

const LOG_SOURCE = "PasswordResetEmail";

interface SendPasswordResetEmailProps {
  email: string;
  name: string;
  resetToken: string;
  expirationDate: Date;
}

/**
 * Sends a password reset email to a user
 */
export async function sendPasswordResetEmail({
  email,
  name,
  resetToken,
  expirationDate,
}: SendPasswordResetEmailProps) {
  try {
    // Generate the reset link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const resetLink = `${baseUrl}/auth/reset-password?token=${resetToken}`;

    // Get the email template
    const html = getPasswordResetTemplate(name, resetLink, expirationDate);

    // Dynamically import the correct email service based on SAAS flag
    const { EmailService } = await import(
      `./email-service${isSaasEnabled ? ".saas" : ".open"}`
    );

    // Send the email using the appropriate service
    const { jobId } = await EmailService.sendEmail({
      from: EmailService.formatSender("FluidCalendar"),
      to: email,
      subject: "Reset Your FluidCalendar Password",
      html,
    });

    logger.info("Password reset email sent", { email, jobId }, LOG_SOURCE);

    return { success: true, jobId };
  } catch (error) {
    logger.error(
      "Failed to send password reset email",
      {
        error: error instanceof Error ? error.message : "Unknown error",
        email,
      },
      LOG_SOURCE
    );

    throw error;
  }
}
