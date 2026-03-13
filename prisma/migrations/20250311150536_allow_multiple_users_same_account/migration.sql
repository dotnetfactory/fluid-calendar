/*
  Warnings:

  - A unique constraint covering the columns `[userId,provider,email]` on the table `ConnectedAccount` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "ConnectedAccount_provider_email_key";

-- CreateIndex
CREATE UNIQUE INDEX "ConnectedAccount_userId_provider_email_key" ON "ConnectedAccount"("userId", "provider", "email");
