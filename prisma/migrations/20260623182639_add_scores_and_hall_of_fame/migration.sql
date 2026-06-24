-- AlterTable
ALTER TABLE "GamePlayer" ADD COLUMN     "score" INTEGER;

-- CreateTable
CREATE TABLE "HallOfFameMoment" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "imageUrl" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HallOfFameMoment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "HallOfFameMoment" ADD CONSTRAINT "HallOfFameMoment_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HallOfFameMoment" ADD CONSTRAINT "HallOfFameMoment_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
