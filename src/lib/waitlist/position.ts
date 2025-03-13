import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Get the position of a waitlist entry based on priority score and creation date
 * @param userId The ID of the waitlist entry
 * @returns The position in the waitlist (1-indexed)
 */
export async function getWaitlistPosition(userId: string): Promise<number> {
  const userEntry = await prisma.waitlist.findUnique({
    where: { id: userId },
    select: {
      priorityScore: true,
      createdAt: true,
    },
  });

  if (!userEntry) return 0;

  // Count users with higher priority scores or same priority score but earlier creation date
  const higherPriorityCount = await prisma.waitlist.count({
    where: {
      status: "WAITING",
      OR: [
        // Users with higher priority score
        { priorityScore: { gt: userEntry.priorityScore } },
        // Users with same priority score but who signed up earlier
        {
          AND: [
            { priorityScore: { equals: userEntry.priorityScore } },
            { createdAt: { lt: userEntry.createdAt } },
          ],
        },
      ],
    },
  });

  // Position is 1-indexed
  return higherPriorityCount + 1;
}
