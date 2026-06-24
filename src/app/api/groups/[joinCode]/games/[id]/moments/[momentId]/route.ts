import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

type Params = { params: Promise<{ joinCode: string; id: string; momentId: string }> };

// Delete a moment. Allowed: its creator, or a group admin.
export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { joinCode, id, momentId } = await params;

  const group = await prisma.group.findUnique({ where: { joinCode } });
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

  const moment = await prisma.hallOfFameMoment.findUnique({
    where: { id: momentId },
    include: { game: true },
  });
  if (!moment || moment.gameId !== id || moment.game.groupId !== group.id) {
    return NextResponse.json({ error: "Moment not found" }, { status: 404 });
  }

  const isCreator = moment.createdByUserId === session.user.id;
  let isAdmin = false;
  if (!isCreator) {
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

  if (!isCreator && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.hallOfFameMoment.delete({ where: { id: momentId } });
  return new NextResponse(null, { status: 204 });
}
