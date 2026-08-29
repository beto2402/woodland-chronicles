import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin";
import { AdminSeasonPanel } from "./AdminSeasonPanel";

// Same gating as /admin — 404, not a redirect, for non-admins.
export default async function AdminSeasonsPage() {
  const adminId = await requireAdmin();
  if (!adminId) notFound();

  return <AdminSeasonPanel />;
}
