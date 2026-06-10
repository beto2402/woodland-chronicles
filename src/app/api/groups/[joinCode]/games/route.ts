import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { VictoryType } from "@prisma/client";

const VALID_FACTIONS = new Set([
  "marquise", "eyrie", "alliance", "vagabond", "vagabond2", "riverfolk",
  "lizard", "duchy", "corvid", "lord", "keepers", "knaves", "marauder",
  "warlord", "bandits", "exile",
]);

const VAGABOND_FACTIONS = new Set(["vagabond", "vagabond2"]);

type Params = { params: Promise<{ joinCode: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { joinCode } = await params;
  const group = await prisma.group.findUnique({ where: { joinCode } });
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

  const games = await prisma.game.findMany({
    where: { groupId: group.id },
    include: {
      players: { include: { player: true } },
      loggedBy: { select: { id: true, name: true } },
    },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(games);
}

export async function POST(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { joinCode } = await params;
  const body = await req.json();
  const { date, victoryType, isVirtual, hasHirelings, players } = body;

  // Validate victory type
  const victoryTypeMap: Record<string, VictoryType> = {
    "Score (30pts)": VictoryType.SCORE,
    SCORE: VictoryType.SCORE,
    DOMINATION: VictoryType.DOMINATION,
    COALITION: VictoryType.COALITION,
  };
  const mappedVictoryType = victoryTypeMap[victoryType];
  if (!mappedVictoryType) {
    return NextResponse.json({ error: "Invalid victoryType" }, { status: 400 });
  }

  if (!Array.isArray(players) || players.length < 2) {
    return NextResponse.json({ error: "At least 2 players required" }, { status: 400 });
  }

  const winners = players.filter((p: { isWinner: boolean }) => p.isWinner);
  if (mappedVictoryType === VictoryType.COALITION && winners.length !== 2) {
    return NextResponse.json({ error: "Coalition requires exactly 2 winners" }, { status: 400 });
  }
  if (mappedVictoryType !== VictoryType.COALITION && winners.length !== 1) {
    return NextResponse.json({ error: "Exactly 1 winner required" }, { status: 400 });
  }

  if (mappedVictoryType === VictoryType.COALITION) {
    const hasVagabond = players.some((p: { faction: string }) => VAGABOND_FACTIONS.has(p.faction));
    if (!hasVagabond) {
      return NextResponse.json({ error: "Coalition requires a Vagabond in the game" }, { status: 400 });
    }
    const vagabondWins = winners.some((p: { faction: string }) => VAGABOND_FACTIONS.has(p.faction));
    if (!vagabondWins) {
      return NextResponse.json({ error: "The Vagabond must be one of the coalition winners" }, { status: 400 });
    }
  }

  for (const p of players) {
    if (!VALID_FACTIONS.has(p.faction)) {
      return NextResponse.json({ error: `Invalid faction: ${p.faction}` }, { status: 400 });
    }
  }

  const group = await prisma.group.findUnique({ where: { joinCode } });
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

  // Verify the logged-in user is a group member
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { claimedPlayer: true },
  });
  if (!user?.claimedPlayer) {
    return NextResponse.json({ error: "You must claim a player before logging games" }, { status: 403 });
  }
  const membership = await prisma.groupPlayer.findUnique({
    where: { groupId_playerId: { groupId: group.id, playerId: user.claimedPlayer.id } },
  });
  if (!membership) {
    return NextResponse.json({ error: "You are not a member of this group" }, { status: 403 });
  }

  // Resolve player names to IDs
  const playerNames: string[] = players.map((p: { name: string }) => p.name);
  const dbPlayers = await prisma.player.findMany({ where: { name: { in: playerNames } } });
  const playerMap = new Map(dbPlayers.map((p) => [p.name, p.id]));

  const missingPlayers = playerNames.filter((n) => !playerMap.has(n));
  if (missingPlayers.length > 0) {
    return NextResponse.json({ error: `Unknown players: ${missingPlayers.join(", ")}` }, { status: 400 });
  }

  const game = await prisma.game.create({
    data: {
      groupId: group.id,
      date: new Date(date),
      victoryType: mappedVictoryType,
      isVirtual: isVirtual ?? true,
      hasHirelings: hasHirelings ?? false,
      loggedByUserId: session.user.id,
      players: {
        create: players.map((p: { name: string; faction: string; isWinner: boolean }) => ({
          playerId: playerMap.get(p.name)!,
          faction: p.faction,
          isWinner: p.isWinner ?? false,
        })),
      },
    },
    include: { players: { include: { player: true } } },
  });

  return NextResponse.json(game, { status: 201 });
}
