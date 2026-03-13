/**
 * Open-source stub for Resend email client.
 * When SaaS submodule is present, this is replaced via symlink.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getResend(): Promise<any> {
  throw new Error(
    "Resend email service is not available in open-source mode. Configure the SaaS submodule to enable email sending."
  );
}

export function clearResendInstance() {
  // No-op in open-source version
}
