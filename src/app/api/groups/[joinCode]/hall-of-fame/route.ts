import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ joinCode: string }> };

// Public read: Hall of Fame data for a group.
//  - moments: all recorded moments, newest first, with their game context
//  - lossesAt29: per-player count of games lost with exactly 29 points
export async function GET(_req: Request, { params }: Params) {
  const { joinCode } = await params;
  const group = await prisma.group.findUnique({ where: { joinCode } });
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

  const moments = await prisma.hallOfFameMoment.findMany({
    where: { game: { groupId: group.id } },
    orderBy: { createdAt: "desc" },
    include: {
      game: {
        select: {
          id: true,
          date: true,
          victoryType: true,
          players: { select: { faction: true, isWinner: true, player: { select: { name: true } } } },
        },
      },
    },
  });

  // Games lost (isWinner=false) with exactly 29 points, grouped by player ("Womp Womp Hall").
  const wompWompRows = await prisma.gamePlayer.findMany({
    where: { score: 29, isWinner: false, game: { groupId: group.id } },
    select: { player: { select: { id: true, name: true } } },
  });
  const counts = new Map<string, { id: string; name: string; count: number }>();
  for (const gp of wompWompRows) {
    const entry = counts.get(gp.player.id) ?? { id: gp.player.id, name: gp.player.name, count: 0 };
    entry.count += 1;
    counts.set(gp.player.id, entry);
  }
  const lossesAt29 = [...counts.values()].sort((a, b) => b.count - a.count);

  // Per-game records: gap between 1st and 2nd place. Only games where every player is scored.
  const scoredGames = await prisma.game.findMany({
    where: { groupId: group.id, players: { every: { score: { not: null } } } },
    select: {
      id: true,
      date: true,
      players: { select: { score: true, player: { select: { name: true } } } },
    },
  });
  type GapRecord = {
    gameId: string;
    date: Date;
    gap: number;
    first: { name: string; score: number };
    second: { name: string; score: number };
  };
  let blowout: GapRecord | null = null; // biggest gap
  let nailbiter: GapRecord | null = null; // smallest gap
  for (const g of scoredGames) {
    if (g.players.length < 2) continue;
    const ranked = [...g.players].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    const first = ranked[0];
    const second = ranked[1];
    const gap = (first.score ?? 0) - (second.score ?? 0);
    const rec: GapRecord = {
      gameId: g.id,
      date: g.date,
      gap,
      first: { name: first.player.name, score: first.score ?? 0 },
      second: { name: second.player.name, score: second.score ?? 0 },
    };
    if (!blowout || gap > blowout.gap) blowout = rec;
    if (!nailbiter || gap < nailbiter.gap) nailbiter = rec;
  }

  return NextResponse.json({ moments, lossesAt29, records: { blowout, nailbiter } });
}
