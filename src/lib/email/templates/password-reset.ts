/**
 * Get the HTML template for password reset emails
 * @param name User's name
 * @param resetLink The password reset link
 * @param expirationDate The expiration date of the reset token
 * @returns HTML email template
 */
export function getPasswordResetTemplate(
  name: string,
  resetLink: string,
  expirationDate: Date
): string {
  const formattedExpirationDate = expirationDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  });

  return `
    <h1>Reset Your FluidCalendar Password</h1>
    <p>Hi ${name},</p>
    <p>We received a request to reset your password for your FluidCalendar account. If you didn&apos;t make this request, you can safely ignore this email.</p>
    <p>To reset your password, click the button below:</p>
    <a href="${resetLink}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0;">Reset Password</a>
    <p>This link will expire on ${formattedExpirationDate}.</p>
    <p>If the button above doesn&apos;t work, you can also copy and paste this link into your browser:</p>
    <p style="word-break: break-all; color: #4F46E5;">${resetLink}</p>
    <p>For security reasons, this password reset link can only be used once and will expire after one hour.</p>
    <p>If you need any assistance, please don&apos;t hesitate to contact our support team.</p>
  `;
}
