import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { AdminUserAccess } from "./AdminUserAccess";

// No nav link anywhere on purpose — reachable only by direct URL, and gated by requireAdmin()
// (404, not a redirect, so its existence isn't hinted at to non-admins).
export default async function AdminPage() {
  const adminId = await requireAdmin();
  if (!adminId) notFound();

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      isAdmin: true,
      wikiPdfAccess: true,
      claimedPlayer: { select: { name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return <AdminUserAccess users={users} />;
}
