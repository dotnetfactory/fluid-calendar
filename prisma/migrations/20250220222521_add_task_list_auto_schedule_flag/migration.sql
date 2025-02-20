-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_OutlookTaskListMapping" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "externalListId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "lastImported" DATETIME NOT NULL,
    "name" TEXT NOT NULL,
    "isAutoScheduled" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "OutlookTaskListMapping_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_OutlookTaskListMapping" ("externalListId", "id", "lastImported", "name", "projectId") SELECT "externalListId", "id", "lastImported", "name", "projectId" FROM "OutlookTaskListMapping";
DROP TABLE "OutlookTaskListMapping";
ALTER TABLE "new_OutlookTaskListMapping" RENAME TO "OutlookTaskListMapping";
CREATE UNIQUE INDEX "OutlookTaskListMapping_externalListId_key" ON "OutlookTaskListMapping"("externalListId");
CREATE INDEX "OutlookTaskListMapping_externalListId_idx" ON "OutlookTaskListMapping"("externalListId");
CREATE INDEX "OutlookTaskListMapping_projectId_idx" ON "OutlookTaskListMapping"("projectId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
