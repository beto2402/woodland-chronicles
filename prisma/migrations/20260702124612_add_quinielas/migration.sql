-- CreateEnum
CREATE TYPE "MatchStage" AS ENUM ('GROUP', 'ROUND_OF_32', 'ROUND_OF_16', 'QUARTERFINAL', 'SEMIFINAL', 'THIRD_PLACE', 'FINAL');

-- CreateEnum
CREATE TYPE "DecidedBy" AS ENUM ('REGULATION', 'EXTRA_TIME', 'PENALTIES');

-- CreateEnum
CREATE TYPE "MatchSlot" AS ENUM ('HOME', 'AWAY');

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "matchNumber" INTEGER NOT NULL,
    "stage" "MatchStage" NOT NULL,
    "groupName" TEXT,
    "homeTeam" TEXT,
    "homeTeamPlaceholder" TEXT,
    "awayTeam" TEXT,
    "awayTeamPlaceholder" TEXT,
    "kickoffAt" TIMESTAMP(3) NOT NULL,
    "venue" TEXT,
    "homeScore" INTEGER,
    "awayScore" INTEGER,
    "decidedBy" "DecidedBy",
    "penaltyHomeScore" INTEGER,
    "penaltyAwayScore" INTEGER,
    "winnerTeam" TEXT,
    "nextMatchId" TEXT,
    "nextMatchSlot" "MatchSlot",
    "loserNextMatchId" TEXT,
    "loserNextMatchSlot" "MatchSlot",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuinielaPick" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "homeScore" INTEGER NOT NULL,
    "awayScore" INTEGER NOT NULL,
    "decidedBy" "DecidedBy" NOT NULL DEFAULT 'REGULATION',
    "penaltyHomeScore" INTEGER,
    "penaltyAwayScore" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuinielaPick_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Match_matchNumber_key" ON "Match"("matchNumber");

-- CreateIndex
CREATE UNIQUE INDEX "QuinielaPick_matchId_userId_key" ON "QuinielaPick"("matchId", "userId");

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_nextMatchId_fkey" FOREIGN KEY ("nextMatchId") REFERENCES "Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_loserNextMatchId_fkey" FOREIGN KEY ("loserNextMatchId") REFERENCES "Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuinielaPick" ADD CONSTRAINT "QuinielaPick_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuinielaPick" ADD CONSTRAINT "QuinielaPick_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

