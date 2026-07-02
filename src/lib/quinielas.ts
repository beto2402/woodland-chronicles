import { prisma } from "@/lib/prisma";
import { DecidedBy, MatchStage } from "@prisma/client";

export type ResultInput = {
  homeScore: number;
  awayScore: number;
  decidedBy?: DecidedBy;
  penaltyHomeScore?: number | null;
  penaltyAwayScore?: number | null;
};

export function validateResult(stage: MatchStage, input: ResultInput): string | null {
  const { homeScore, awayScore, decidedBy, penaltyHomeScore, penaltyAwayScore } = input;

  if (!Number.isInteger(homeScore) || homeScore < 0 || !Number.isInteger(awayScore) || awayScore < 0) {
    return "Scores must be non-negative integers";
  }

  if (stage === MatchStage.GROUP) {
    return null; // draws allowed, no penalties possible
  }

  if (homeScore !== awayScore) {
    return null; // decisive in regulation or extra time
  }

  // Tied after regulation/extra time — a knockout match must go to penalties
  if (decidedBy !== DecidedBy.PENALTIES) {
    return "Knockout matches can't end level — set decidedBy to PENALTIES with a shootout score";
  }
  if (
    penaltyHomeScore == null ||
    penaltyAwayScore == null ||
    !Number.isInteger(penaltyHomeScore) ||
    !Number.isInteger(penaltyAwayScore) ||
    penaltyHomeScore === penaltyAwayScore
  ) {
    return "Penalty shootout score must be two different non-negative integers";
  }
  return null;
}

export function computeWinner(
  stage: MatchStage,
  homeTeam: string,
  awayTeam: string,
  input: ResultInput
): string | null {
  const { homeScore, awayScore, penaltyHomeScore, penaltyAwayScore } = input;
  if (homeScore > awayScore) return homeTeam;
  if (awayScore > homeScore) return awayTeam;
  if (stage === MatchStage.GROUP) return null; // draw
  return (penaltyHomeScore ?? 0) > (penaltyAwayScore ?? 0) ? homeTeam : awayTeam;
}

// Writes the actual result for a match and, for knockout matches, advances the
// winner (and semifinal losers) into the next match's team slots.
export async function applyMatchResult(matchId: string, input: ResultInput) {
  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) throw new Error("Match not found");
  if (!match.homeTeam || !match.awayTeam) {
    throw new Error("Both teams must be determined before a result can be entered");
  }

  const error = validateResult(match.stage, input);
  if (error) throw new Error(error);

  const decidedBy =
    match.stage === MatchStage.GROUP
      ? DecidedBy.REGULATION
      : input.homeScore !== input.awayScore
        ? (input.decidedBy ?? DecidedBy.REGULATION)
        : DecidedBy.PENALTIES;

  const winnerTeam = computeWinner(match.stage, match.homeTeam, match.awayTeam, input);

  await prisma.match.update({
    where: { id: matchId },
    data: {
      homeScore: input.homeScore,
      awayScore: input.awayScore,
      decidedBy,
      penaltyHomeScore: decidedBy === DecidedBy.PENALTIES ? input.penaltyHomeScore : null,
      penaltyAwayScore: decidedBy === DecidedBy.PENALTIES ? input.penaltyAwayScore : null,
      winnerTeam,
    },
  });

  if (winnerTeam && match.nextMatchId && match.nextMatchSlot) {
    await prisma.match.update({
      where: { id: match.nextMatchId },
      data:
        match.nextMatchSlot === "HOME"
          ? { homeTeam: winnerTeam, homeTeamPlaceholder: null }
          : { awayTeam: winnerTeam, awayTeamPlaceholder: null },
    });
  }

  if (winnerTeam && match.stage === MatchStage.SEMIFINAL && match.loserNextMatchId && match.loserNextMatchSlot) {
    const loserTeam = winnerTeam === match.homeTeam ? match.awayTeam : match.homeTeam;
    await prisma.match.update({
      where: { id: match.loserNextMatchId },
      data:
        match.loserNextMatchSlot === "HOME"
          ? { homeTeam: loserTeam, homeTeamPlaceholder: null }
          : { awayTeam: loserTeam, awayTeamPlaceholder: null },
    });
  }
}
