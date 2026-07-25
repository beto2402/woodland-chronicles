-- CreateTable
CREATE TABLE "Tip" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TipTarget" (
    "id" TEXT NOT NULL,
    "tipId" TEXT NOT NULL,
    "factionId" TEXT NOT NULL,
    "actionId" TEXT,

    CONSTRAINT "TipTarget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tip_gameId_key_key" ON "Tip"("gameId", "key");

-- CreateIndex
CREATE INDEX "TipTarget_factionId_actionId_idx" ON "TipTarget"("factionId", "actionId");

-- AddForeignKey
ALTER TABLE "TipTarget" ADD CONSTRAINT "TipTarget_tipId_fkey" FOREIGN KEY ("tipId") REFERENCES "Tip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
