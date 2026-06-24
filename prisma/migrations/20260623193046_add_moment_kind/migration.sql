-- CreateEnum
CREATE TYPE "MomentKind" AS ENUM ('GLORY', 'TARD');

-- AlterTable
ALTER TABLE "HallOfFameMoment" ADD COLUMN     "kind" "MomentKind" NOT NULL DEFAULT 'GLORY';
