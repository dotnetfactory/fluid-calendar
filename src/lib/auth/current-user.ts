import { prisma } from "@/lib/prisma";

/**
 * Temporary function to get the current user ID until proper authentication is implemented
 * This will be replaced with proper authentication in the multi-user implementation
 */
export async function getCurrentUserId() {
  // Get the first user or create a placeholder one
  const user = await prisma.user.findFirst();
  if (user) return user.id;

  // Create a placeholder user if none exists
  const newUser = await prisma.user.create({
    data: {
      name: "Default User",
      email: "user@example.com",
    },
  });
  return newUser.id;
}
