import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ userId: string }> };

// Grants/revokes wikiPdfAccess and/or isAdmin for a given user — the two admin-managed flags,
// see docs/api.md. Either field may be sent alone or together.
export async function PATCH(req: Request, { params }: Params) {
  const adminId = await requireAdmin();
  if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId } = await params;
  const body = await req.json().catch(() => null);
  const data: { wikiPdfAccess?: boolean; isAdmin?: boolean } = {};
  if (body && typeof body.wikiPdfAccess === "boolean") data.wikiPdfAccess = body.wikiPdfAccess;
  if (body && typeof body.isAdmin === "boolean") data.isAdmin = body.isAdmin;
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "wikiPdfAccess and/or isAdmin must be a boolean" }, { status: 400 });
  }

  // Demoting the last remaining admin would lock everyone out of /admin (isAdmin itself has no
  // self-service grant path — see requireAdmin), so block it rather than let it happen silently.
  if (data.isAdmin === false) {
    const target = await prisma.user.findUnique({ where: { id: userId }, select: { isAdmin: true } });
    if (target?.isAdmin) {
      const adminCount = await prisma.user.count({ where: { isAdmin: true } });
      if (adminCount <= 1) {
        return NextResponse.json({ error: "No puedes quitar al último admin" }, { status: 400 });
      }
    }
  }

  const user = await prisma.user
    .update({
      where: { id: userId },
      data,
      select: { id: true, wikiPdfAccess: true, isAdmin: true },
    })
    .catch(() => null);
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json(user);
}
