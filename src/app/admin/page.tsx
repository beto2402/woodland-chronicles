import Link from "next/link";
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

  return (
    <>
      <AdminUserAccess users={users} />
      <div style={{ maxWidth: 720, margin: "-40px auto 40px", padding: "0 16px" }}>
        <Link
          href="/admin/seasons"
          style={{
            display: "inline-block",
            fontFamily: "Lato, sans-serif",
            fontSize: "0.85rem",
            color: "#a0b090",
            border: "1px solid #2d3b2d",
            borderRadius: 4,
            padding: "9px 14px",
            textDecoration: "none",
          }}
        >
          Gestionar temporadas →
        </Link>
      </div>
    </>
  );
}
