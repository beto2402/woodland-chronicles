// One-time script to backfill groupElo and globalElo from existing game history.
// Run after the add-elo-ratings migration: node scripts/backfill-elo.mjs
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const K = 32;
const STARTING_ELO = 1000;

function expected(rA, rB) {
  return 1 / (1 + Math.pow(10, (rB - rA) / 400));
}

function computeDeltas(players, ratings) {
  const n = players.length;
  const kAdj = n > 1 ? K / (n - 1) : K;
  const deltas = Object.fromEntries(players.map((p) => [p.playerId, 0]));

  for (let i = 0; i < players.length; i++) {
    for (let j = i + 1; j < players.length; j++) {
      const p1 = players[i], p2 = players[j];
      if (!p1.isWinner && !p2.isWinner) continue;
      const r1 = ratings[p1.playerId] ?? STARTING_ELO;
      const r2 = ratings[p2.playerId] ?? STARTING_ELO;
      const e1 = expected(r1, r2);
      const s1 = p1.isWinner && p2.isWinner ? 0.5 : p1.isWinner ? 1 : 0;
      deltas[p1.playerId] += kAdj * (s1 - e1);
      deltas[p2.playerId] += kAdj * ((1 - s1) - (1 - e1));
    }
  }
  return deltas;
}

function replayGames(games) {
  const ratings = {};
  for (const game of games) {
    const deltas = computeDeltas(game.players, ratings);
    for (const [id, d] of Object.entries(deltas)) {
      ratings[id] = (ratings[id] ?? STARTING_ELO) + d;
    }
  }
  return ratings;
}

// ── Group ELO ────────────────────────────────────────────────────────────────

const groups = await prisma.group.findMany({ select: { id: true, name: true } });

for (const group of groups) {
  const games = await prisma.game.findMany({
    where: { groupId: group.id },
    include: { players: { select: { playerId: true, isWinner: true } } },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
  });

  const ratings = replayGames(games);
  let updated = 0;

  for (const [playerId, elo] of Object.entries(ratings)) {
    const { count } = await prisma.groupPlayer.updateMany({
      where: { groupId: group.id, playerId },
      data: { groupElo: Math.round(elo) },
    });
    updated += count;
  }

  console.log(`Group "${group.name}": ${games.length} games, ${updated} players updated`);
  for (const [id, elo] of Object.entries(ratings).sort((a, b) => b[1] - a[1])) {
    const p = await prisma.player.findUnique({ where: { id }, select: { name: true } });
    console.log(`  ${String(Math.round(elo)).padStart(4)}  ${p?.name ?? id}`);
  }
}

// ── Global ELO ───────────────────────────────────────────────────────────────

const allGames = await prisma.game.findMany({
  include: { players: { select: { playerId: true, isWinner: true } } },
  orderBy: [{ date: "asc" }, { createdAt: "asc" }],
});

const globalRatings = replayGames(allGames);
let globalUpdated = 0;

for (const [playerId, elo] of Object.entries(globalRatings)) {
  await prisma.player.update({ where: { id: playerId }, data: { globalElo: Math.round(elo) } });
  globalUpdated++;
}

console.log(`\nGlobal ELO: ${allGames.length} total games, ${globalUpdated} players updated`);

await prisma.$disconnect();
