import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { playerName } = await req.json();
  if (!playerName?.trim()) {
    return NextResponse.json({ error: "playerName is required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { claimedPlayer: true },
  });

  if (user?.claimedPlayer) {
    return NextResponse.json({ error: "You already have a claimed player" }, { status: 409 });
  }

  const player = await prisma.player.findFirst({ where: { name: { equals: playerName.trim(), mode: "insensitive" } } });
  if (!player) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 });
  }
  if (player.claimedById) {
    return NextResponse.json({ error: "Player is already claimed" }, { status: 409 });
  }

  const updated = await prisma.player.update({
    where: { id: player.id },
    data: { claimedById: session.user.id },
  });

  return NextResponse.json(updated);
}
