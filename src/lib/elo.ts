import { prisma } from "@/lib/prisma";
import { replayGames } from "@/lib/elo-core";

export { ELO_STARTING, computeEloDeltas, replayGames } from "@/lib/elo-core";

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
