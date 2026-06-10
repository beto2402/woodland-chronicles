import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function POST(_req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { claimedPlayer: true },
  });

  if (!user?.claimedPlayer) {
    return NextResponse.json({ error: "No claimed player to unlink" }, { status: 409 });
  }

  await prisma.player.update({
    where: { id: user.claimedPlayer.id },
    data: { claimedById: null },
  });

  return new NextResponse(null, { status: 204 });
}
