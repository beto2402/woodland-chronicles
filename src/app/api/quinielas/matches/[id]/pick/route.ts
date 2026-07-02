import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { DecidedBy, MatchStage } from "@prisma/client";
import { validateResult } from "@/lib/quinielas";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const match = await prisma.match.findUnique({ where: { id } });
  if (!match) return NextResponse.json({ error: "Match not found" }, { status: 404 });

  if (match.kickoffAt <= new Date()) {
    return NextResponse.json({ error: "Picks lock at kickoff" }, { status: 403 });
  }

  const body = await req.json();
  const homeScore = Number(body.homeScore);
  const awayScore = Number(body.awayScore);
  const decidedBy: DecidedBy = body.decidedBy ?? DecidedBy.REGULATION;
  const penaltyHomeScore = body.penaltyHomeScore != null ? Number(body.penaltyHomeScore) : null;
  const penaltyAwayScore = body.penaltyAwayScore != null ? Number(body.penaltyAwayScore) : null;

  const stageForValidation = match.stage === MatchStage.GROUP ? MatchStage.GROUP : match.stage;
  const error = validateResult(stageForValidation, {
    homeScore,
    awayScore,
    decidedBy,
    penaltyHomeScore,
    penaltyAwayScore,
  });
  if (error) return NextResponse.json({ error }, { status: 400 });

  const pick = await prisma.quinielaPick.upsert({
    where: { matchId_userId: { matchId: id, userId: session.user.id } },
    create: {
      matchId: id,
      userId: session.user.id,
      homeScore,
      awayScore,
      decidedBy: match.stage === MatchStage.GROUP ? DecidedBy.REGULATION : decidedBy,
      penaltyHomeScore: decidedBy === DecidedBy.PENALTIES ? penaltyHomeScore : null,
      penaltyAwayScore: decidedBy === DecidedBy.PENALTIES ? penaltyAwayScore : null,
    },
    update: {
      homeScore,
      awayScore,
      decidedBy: match.stage === MatchStage.GROUP ? DecidedBy.REGULATION : decidedBy,
      penaltyHomeScore: decidedBy === DecidedBy.PENALTIES ? penaltyHomeScore : null,
      penaltyAwayScore: decidedBy === DecidedBy.PENALTIES ? penaltyAwayScore : null,
    },
  });

  return NextResponse.json(pick);
}
