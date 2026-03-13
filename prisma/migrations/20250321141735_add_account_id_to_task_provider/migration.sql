-- AlterTable
ALTER TABLE "TaskProvider" ADD COLUMN     "accountId" TEXT;

-- AddForeignKey
ALTER TABLE "TaskProvider" ADD CONSTRAINT "TaskProvider_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "ConnectedAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
