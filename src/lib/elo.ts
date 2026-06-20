import { prisma } from "@/lib/prisma";

export const ELO_STARTING = 1000;
const K = 32;

// Probability that player A beats player B given their ratings.
function expected(rA: number, rB: number): number {
  return 1 / (1 + Math.pow(10, (rB - rA) / 400));
}

// Compute per-player ELO deltas for a single game.
//
// Uses pairwise comparisons: every winner is compared against every loser
// (winner wins), coalition winners are compared against each other (draw),
// and loser-vs-loser pairs are skipped (no information about relative strength).
//
// K is divided by (N-1) so the total expected gain for a winner at equal ratings
// stays roughly K regardless of how many players are in the game — preventing
// rating inflation in larger games.
export function computeEloDeltas(
  players: { playerId: string; isWinner: boolean }[],
  ratings: Record<string, number>,
): Record<string, number> {
  const n = players.length;
  const kAdj = n > 1 ? K / (n - 1) : K;
  const deltas: Record<string, number> = Object.fromEntries(
    players.map((p) => [p.playerId, 0]),
  );

  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const p1 = players[i];
      const p2 = players[j];

      if (!p1.isWinner && !p2.isWinner) continue; // loser-vs-loser: no comparison

      const r1 = ratings[p1.playerId] ?? ELO_STARTING;
      const r2 = ratings[p2.playerId] ?? ELO_STARTING;
      const e1 = expected(r1, r2);
      const e2 = 1 - e1;

      // Coalition: both winners → draw. Otherwise: winner takes 1, loser 0.
      const s1 = p1.isWinner && p2.isWinner ? 0.5 : p1.isWinner ? 1 : 0;
      const s2 = 1 - s1;

      deltas[p1.playerId] += kAdj * (s1 - e1);
      deltas[p2.playerId] += kAdj * (s2 - e2);
    }
  }

  return deltas;
}

type GameRecord = {
  players: { playerId: string; isWinner: boolean }[];
};

// Replay a chronologically-ordered list of games and return the final ratings map.
export function replayGames(games: GameRecord[]): Record<string, number> {
  const ratings: Record<string, number> = {};
  for (const game of games) {
    const deltas = computeEloDeltas(game.players, ratings);
    for (const [playerId, delta] of Object.entries(deltas)) {
      ratings[playerId] = (ratings[playerId] ?? ELO_STARTING) + delta;
    }
  }
  return ratings;
}

// Recalculate groupElo for all GroupPlayer records in a group by replaying
// every game in that group from oldest to newest.
// Called after any game is created or deleted in the group.
export async function recalculateGroupElo(groupId: string): Promise<void> {
  const games = await prisma.game.findMany({
    where: { groupId },
    include: { players: { select: { playerId: true, isWinner: true } } },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });

  const ratings = replayGames(games);

  await prisma.$transaction(
    Object.entries(ratings).map(([playerId, elo]) =>
      prisma.groupPlayer.updateMany({
        where: { groupId, playerId },
        data: { groupElo: Math.round(elo) },
      }),
    ),
  );
}

// Recalculate globalElo for every player by replaying all games across all
// groups in chronological order.
// Called after any game is created or deleted anywhere.
export async function recalculateGlobalElo(): Promise<void> {
  const games = await prisma.game.findMany({
    include: { players: { select: { playerId: true, isWinner: true } } },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });

  const ratings = replayGames(games);

  await prisma.$transaction(
    Object.entries(ratings).map(([playerId, elo]) =>
      prisma.player.update({
        where: { id: playerId },
        data: { globalElo: Math.round(elo) },
      }),
    ),
  );
}
