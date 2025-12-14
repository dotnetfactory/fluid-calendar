/*
  Warnings:

  - You are about to drop the column `logDestination` on the `SystemSettings` table. All the data in the column will be lost.
  - You are about to drop the column `logLevel` on the `SystemSettings` table. All the data in the column will be lost.
  - You are about to drop the column `logRetention` on the `SystemSettings` table. All the data in the column will be lost.
  - You are about to drop the `Log` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "SystemSettings" DROP COLUMN "logDestination",
DROP COLUMN "logLevel",
DROP COLUMN "logRetention";

-- DropTable
DROP TABLE "Log";
