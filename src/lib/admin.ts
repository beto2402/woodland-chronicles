import { auth } from "./auth";
import { prisma } from "./prisma";

// Global app admin (User.isAdmin) — distinct from the per-group GroupPlayer.role. Returns the
// current session's userId if they're an admin, else null. No self-service signup; isAdmin is
// toggled by hand via `npx prisma studio`.
export async function requireAdmin(): Promise<string | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { isAdmin: true } });
  return user?.isAdmin ? session.user.id : null;
}
