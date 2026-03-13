/* eslint-disable @typescript-eslint/no-unused-vars */
// Username utility — OS stub (SaaS-only feature)
export async function validateUsername(
  username: string
): Promise<{ available: boolean; reason?: string }> {
  return { available: true };
}

export async function generateUsername(email: string): Promise<string> {
  return "user";
}
