import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

type Params = { params: Promise<{ joinCode: string; playerName: string }> };

export async function DELETE(_req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { joinCode, playerName } = await params;
  const decodedName = decodeURIComponent(playerName);

  const group = await prisma.group.findUnique({ where: { joinCode } });
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

  const player = await prisma.player.findFirst({ where: { name: { equals: decodedName, mode: "insensitive" } } });
  if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });

  if (player.claimedById) {
    return NextResponse.json(
      { error: "Cannot remove a claimed player. They must unlink their account first." },
      { status: 409 }
    );
  }

  await prisma.groupPlayer.delete({
    where: { groupId_playerId: { groupId: group.id, playerId: player.id } },
  });

  return new NextResponse(null, { status: 204 });
}
