-- AlterTable
ALTER TABLE "Draw" ADD COLUMN "eatenAt" DATETIME;

-- CreateIndex
CREATE INDEX "Draw_eatenAt_idx" ON "Draw"("eatenAt");
