-- CreateTable
CREATE TABLE "DayBlock" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "blockFrom" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DayBlock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DayBlock_userId_date_idx" ON "DayBlock"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DayBlock_userId_date_key" ON "DayBlock"("userId", "date");

-- AddForeignKey
ALTER TABLE "DayBlock" ADD CONSTRAINT "DayBlock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
