import { NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSupportedGame, getFactionGuidePdfBlobPath, type GameId } from "@/lib/wiki/loaders";

type Params = { params: Promise<{ gameId: string; factionId: string }> };

// Streams a privately-stored faction guide PDF (third-party BGG content — see loaders.ts) back
// to the browser. Unlike the rest of the wiki, this is gated behind auth + a manually-granted
// User.wikiPdfAccess flag (toggled by hand via `npx prisma studio`, no self-service UI), since
// we don't have rights to redistribute this document publicly.
export async function GET(_req: Request, { params }: Params) {
  const { gameId, factionId } = await params;
  if (!isSupportedGame(gameId)) return new NextResponse("Not found", { status: 404 });
  const g: GameId = gameId;

  const pathname = getFactionGuidePdfBlobPath(g, factionId);
  if (!pathname) return new NextResponse("Not found", { status: 404 });

  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { wikiPdfAccess: true },
  });
  if (!user?.wikiPdfAccess) return new NextResponse("Forbidden", { status: 403 });

  try {
    const result = await get(pathname, { access: "private" });
    if (!result || result.statusCode !== 200) return new NextResponse("Not found", { status: 404 });
    return new Response(result.stream, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${factionId}.pdf"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    console.error("Wiki guide PDF fetch failed:", err);
    return new NextResponse("Not found", { status: 404 });
  }
}
