import { logger } from "@/lib/logger";

const LOG_SOURCE = "EmailService";

export interface EmailJobData {
  from?: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: Array<{
    filename: string;
    content: string;
    contentType: string;
  }>;
}

/**
 * Open-source email service stub.
 * Logs email attempts instead of sending.
 * When SaaS submodule is present, this is replaced via symlink
 * with the real Resend-based implementation.
 */
export class EmailService {
  static async sendEmail(emailData: EmailJobData): Promise<{ jobId: string }> {
    logger.info(
      "Email sending not configured (open-source mode)",
      {
        to: emailData.to,
        subject: emailData.subject,
      },
      LOG_SOURCE
    );

    return { jobId: "os-stub-no-send" };
  }

  static formatSender(displayName: string, email?: string): string {
    const fromEmail =
      email || process.env.RESEND_FROM_EMAIL || "noreply@fluidcalendar.com";
    return `${displayName} <${fromEmail}>`;
  }
}
