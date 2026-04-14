-- CreateTable
CREATE TABLE "TaskDependency" (
    "id" TEXT NOT NULL,
    "dependentTaskId" TEXT NOT NULL,
    "prerequisiteId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'finish_to_start',
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskDependency_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TaskDependency_dependentTaskId_idx" ON "TaskDependency"("dependentTaskId");

-- CreateIndex
CREATE INDEX "TaskDependency_prerequisiteId_idx" ON "TaskDependency"("prerequisiteId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskDependency_dependentTaskId_prerequisiteId_key" ON "TaskDependency"("dependentTaskId", "prerequisiteId");

-- AddForeignKey
ALTER TABLE "TaskDependency" ADD CONSTRAINT "TaskDependency_dependentTaskId_fkey" FOREIGN KEY ("dependentTaskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskDependency" ADD CONSTRAINT "TaskDependency_prerequisiteId_fkey" FOREIGN KEY ("prerequisiteId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
