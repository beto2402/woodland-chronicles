import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

type Params = { params: Promise<{ joinCode: string; id: string }> };

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

  // Allow: the user who logged it, or a group admin
  const isLogger = game.loggedByUserId === session.user.id;

  let isAdmin = false;
  if (!isLogger) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { claimedPlayer: true },
    });
    if (user?.claimedPlayer) {
      const membership = await prisma.groupPlayer.findUnique({
        where: { groupId_playerId: { groupId: group.id, playerId: user.claimedPlayer.id } },
      });
      isAdmin = membership?.role === "ADMIN";
    }
  }

  if (!isLogger && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.game.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
