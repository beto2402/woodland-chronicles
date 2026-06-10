import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ joinCode: string }> }
) {
  const { joinCode } = await params;
  const group = await prisma.group.findUnique({
    where: { joinCode },
    include: {
      players: { include: { player: true }, orderBy: { joinedAt: "asc" } },
    },
  });

  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });
  return NextResponse.json(group);
}
