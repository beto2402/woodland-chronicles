import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { nanoid } from "@/lib/nanoid";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, playerName } = await req.json();
  if (!name?.trim() || !playerName?.trim()) {
    return NextResponse.json({ error: "name and playerName are required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { claimedPlayer: true },
  });

  if (user?.claimedPlayer && user.claimedPlayer.name.toLowerCase() !== playerName.trim().toLowerCase()) {
    return NextResponse.json(
      { error: "You already have a claimed player. Use your existing player name." },
      { status: 409 }
    );
  }

  const joinCode = nanoid(8);

  const result = await prisma.$transaction(async (tx) => {
    const group = await tx.group.create({ data: { name: name.trim(), joinCode } });

    let player = await tx.player.findFirst({ where: { name: { equals: playerName.trim(), mode: "insensitive" } } });

    if (!player) {
      player = await tx.player.create({
        data: { name: playerName.trim(), claimedById: session.user.id },
      });
    } else if (!player.claimedById) {
      player = await tx.player.update({
        where: { id: player.id },
        data: { claimedById: session.user.id },
      });
    } else if (player.claimedById !== session.user.id) {
      throw new Error("PLAYER_CLAIMED");
    }

    await tx.groupPlayer.create({
      data: { groupId: group.id, playerId: player.id, role: "ADMIN" },
    });

    return { group, player };
  });

  return NextResponse.json(result, { status: 201 });
}
