import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Properly handle connection lifecycle
function createPrismaClient() {
  const client = new PrismaClient({
    log: ["error"],
  });

  // Ensure connection is properly closed before process exits
  process.on("beforeExit", async () => {
    await client.$disconnect();
    console.log("[PrismaClient] Disconnected Prisma client before exit");
  });

  return client;
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
