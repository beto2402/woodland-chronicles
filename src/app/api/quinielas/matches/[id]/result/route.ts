import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { applyMatchResult } from "@/lib/quinielas";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: Params) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  try {
    await applyMatchResult(id, {
      homeScore: Number(body.homeScore),
      awayScore: Number(body.awayScore),
      decidedBy: body.decidedBy,
      penaltyHomeScore: body.penaltyHomeScore != null ? Number(body.penaltyHomeScore) : null,
      penaltyAwayScore: body.penaltyAwayScore != null ? Number(body.penaltyAwayScore) : null,
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Failed to save result" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
