/*
  Warnings:

  - You are about to drop the `OutlookTaskListMapping` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "OutlookTaskListMapping" DROP CONSTRAINT "OutlookTaskListMapping_projectId_fkey";

-- DropTable
DROP TABLE "OutlookTaskListMapping";
