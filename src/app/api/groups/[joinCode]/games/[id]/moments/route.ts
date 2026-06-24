import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { MomentKind } from "@prisma/client";

type Params = { params: Promise<{ joinCode: string; id: string }> };

// Create a Hall of Fame moment attached to a game. Member-gated.
export async function POST(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { joinCode, id } = await params;
  const body = await req.json();
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const imageUrl =
    typeof body.imageUrl === "string" && body.imageUrl.trim() ? body.imageUrl.trim() : null;
  const kind = body.kind === MomentKind.TARD ? MomentKind.TARD : MomentKind.GLORY;

  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }
  if (!description) {
    return NextResponse.json({ error: "Description is required" }, { status: 400 });
  }

  const group = await prisma.group.findUnique({ where: { joinCode } });
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

  const game = await prisma.game.findUnique({ where: { id } });
  if (!game || game.groupId !== group.id) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  // Require group membership
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { claimedPlayer: true },
  });
  if (!user?.claimedPlayer) {
    return NextResponse.json({ error: "You must claim a player first" }, { status: 403 });
  }
  const membership = await prisma.groupPlayer.findUnique({
    where: { groupId_playerId: { groupId: group.id, playerId: user.claimedPlayer.id } },
  });
  if (!membership) {
    return NextResponse.json({ error: "You are not a member of this group" }, { status: 403 });
  }

  const moment = await prisma.hallOfFameMoment.create({
    data: {
      gameId: game.id,
      title,
      description,
      kind,
      imageUrl,
      createdByUserId: session.user.id,
    },
  });

  return NextResponse.json(moment, { status: 201 });
}
