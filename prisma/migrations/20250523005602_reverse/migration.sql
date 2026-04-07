/*
  Warnings:

  - You are about to drop the column `setupCompleted` on the `SystemSettings` table. All the data in the column will be lost.
  - You are about to drop the column `setupCompletedAt` on the `SystemSettings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "SystemSettings" DROP COLUMN "setupCompleted",
DROP COLUMN "setupCompletedAt";
