import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

type Params = { params: Promise<{ joinCode: string }> };

export async function POST(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { joinCode } = await params;
  const body = await req.json().catch(() => ({}));
  const { playerName } = body;

  const group = await prisma.group.findUnique({ where: { joinCode } });
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: session.user.id },
      include: { claimedPlayer: true },
    });

    let player = user?.claimedPlayer ?? null;

    if (!player) {
      // User has no claimed player — playerName is required
      if (!playerName?.trim()) {
        throw new Error("PLAYER_NAME_REQUIRED");
      }

      const existing = await tx.player.findFirst({
        where: { name: { equals: playerName.trim(), mode: "insensitive" } },
      });

      if (existing) {
        if (existing.claimedById && existing.claimedById !== session.user.id) {
          throw new Error("PLAYER_CLAIMED");
        }
        // Unclaimed — claim it
        player = await tx.player.update({
          where: { id: existing.id },
          data: { claimedById: session.user.id },
        });
      } else {
        // New player — create and claim
        player = await tx.player.create({
          data: { name: playerName.trim(), claimedById: session.user.id },
        });
      }
    }

    // Check if already in group
    const existing = await tx.groupPlayer.findUnique({
      where: { groupId_playerId: { groupId: group.id, playerId: player.id } },
    });
    if (existing) throw new Error("ALREADY_MEMBER");

    const membership = await tx.groupPlayer.create({
      data: { groupId: group.id, playerId: player.id },
      include: { player: { include: { claimedBy: { select: { id: true, name: true, image: true } } } } },
    });

    return membership;
  });

  return NextResponse.json(result, { status: 201 });
}
