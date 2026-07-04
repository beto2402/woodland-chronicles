import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { recalculateGroupElo, recalculateGlobalElo } from "@/lib/elo";
import type { Group } from "@prisma/client";

type Params = { params: Promise<{ joinCode: string; id: string }> };

// Allow: the user who logged the game, or a group admin
async function canModifyGame(userId: string, group: Group, game: { loggedByUserId: string | null }) {
  if (game.loggedByUserId === userId) return true;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { claimedPlayer: true },
  });
  if (!user?.claimedPlayer) return false;

  const membership = await prisma.groupPlayer.findUnique({
    where: { groupId_playerId: { groupId: group.id, playerId: user.claimedPlayer.id } },
  });
  return membership?.role === "ADMIN";
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { joinCode, id } = await params;

  const group = await prisma.group.findUnique({ where: { joinCode } });
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

  const game = await prisma.game.findUnique({ where: { id } });
  if (!game || game.groupId !== group.id) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  if (!(await canModifyGame(session.user.id, group, game))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.game.delete({ where: { id } });
  await recalculateGroupElo(group.id);
  await recalculateGlobalElo();
  return new NextResponse(null, { status: 204 });
}

// Edits each player's victory points (score) for an already-recorded game.
// Scores stay all-or-none, same rule as at creation: every player gets a
// non-negative integer, or every player's score is cleared back to null.
export async function PATCH(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { joinCode, id } = await params;

  const group = await prisma.group.findUnique({ where: { joinCode } });
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

  const game = await prisma.game.findUnique({ where: { id }, include: { players: true } });
  if (!game || game.groupId !== group.id) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  if (!(await canModifyGame(session.user.id, group, game))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const players = body.players;
  if (!Array.isArray(players) || players.length !== game.players.length) {
    return NextResponse.json({ error: "Must include a score entry for every player in the game" }, { status: 400 });
  }

  const gamePlayerIds = new Set(game.players.map((p) => p.id));
  const providedIds = new Set(players.map((p: { id: string }) => p.id));
  if (providedIds.size !== players.length || ![...providedIds].every((pid) => gamePlayerIds.has(pid))) {
    return NextResponse.json({ error: "Player entries must match this game's players exactly" }, { status: 400 });
  }

  const scoredCount = players.filter(
    (p: { score?: unknown }) => p.score !== undefined && p.score !== null && p.score !== "",
  ).length;
  if (scoredCount !== 0 && scoredCount !== players.length) {
    return NextResponse.json(
      { error: "Scores must be provided for every player or for none" },
      { status: 400 },
    );
  }
  const scoresProvided = scoredCount === players.length;
  if (scoresProvided) {
    for (const p of players) {
      const n = Number(p.score);
      if (!Number.isInteger(n) || n < 0) {
        return NextResponse.json({ error: `Invalid score: ${p.score}` }, { status: 400 });
      }
    }
  }

  await prisma.$transaction(
    players.map((p: { id: string; score?: unknown }) =>
      prisma.gamePlayer.update({
        where: { id: p.id },
        data: { score: scoresProvided ? Number(p.score) : null },
      }),
    ),
  );

  const updated = await prisma.game.findUnique({
    where: { id },
    include: {
      players: { include: { player: true } },
      loggedBy: { select: { id: true, name: true } },
      moments: { orderBy: { createdAt: "desc" } },
    },
  });

  return NextResponse.json(updated);
}
