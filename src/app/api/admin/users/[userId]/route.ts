import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ userId: string }> };

// Grants/revokes wikiPdfAccess for a given user. The only admin-managed flag today — see
// docs/api.md. isAdmin itself has no route; it stays hand-toggled via `npx prisma studio`.
export async function PATCH(req: Request, { params }: Params) {
  const adminId = await requireAdmin();
  if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId } = await params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body.wikiPdfAccess !== "boolean") {
    return NextResponse.json({ error: "wikiPdfAccess must be a boolean" }, { status: 400 });
  }

  const user = await prisma.user
    .update({
      where: { id: userId },
      data: { wikiPdfAccess: body.wikiPdfAccess },
      select: { id: true, wikiPdfAccess: true },
    })
    .catch(() => null);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json(user);
}
