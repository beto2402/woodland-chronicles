import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

type Params = { params: Promise<{ joinCode: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { joinCode } = await params;
  const group = await prisma.group.findUnique({ where: { joinCode } });
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

  const members = await prisma.groupPlayer.findMany({
    where: { groupId: group.id },
    include: { player: { include: { claimedBy: { select: { id: true, name: true, image: true } } } } },
    orderBy: { joinedAt: "asc" },
  });

  return NextResponse.json(members);
}

export async function POST(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { joinCode } = await params;
  const { playerName } = await req.json();
  if (!playerName?.trim()) {
    return NextResponse.json({ error: "playerName is required" }, { status: 400 });
  }

  const group = await prisma.group.findUnique({ where: { joinCode } });
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

  // Only group members can edit the roster
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { claimedPlayer: true },
  });
  if (!user?.claimedPlayer) {
    return NextResponse.json({ error: "You must claim a player before editing the roster" }, { status: 403 });
  }
  const membership = await prisma.groupPlayer.findUnique({
    where: { groupId_playerId: { groupId: group.id, playerId: user.claimedPlayer.id } },
  });
  if (!membership) {
    return NextResponse.json({ error: "You are not a member of this group" }, { status: 403 });
  }

  const result = await prisma.$transaction(async (tx) => {
    let player = await tx.player.findFirst({ where: { name: { equals: playerName.trim(), mode: "insensitive" } } });

    if (!player) {
      player = await tx.player.create({ data: { name: playerName.trim() } });
    }

    const existing = await tx.groupPlayer.findUnique({
      where: { groupId_playerId: { groupId: group.id, playerId: player.id } },
    });
    if (existing) throw new Error("ALREADY_MEMBER");

    await tx.groupPlayer.create({ data: { groupId: group.id, playerId: player.id } });
    return player;
  });

  return NextResponse.json(result, { status: 201 });
}
