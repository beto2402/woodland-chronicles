import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import GroupLeaderboard from "./GroupLeaderboard";

export default async function GroupPage({
  params,
}: {
  params: Promise<{ joinCode: string }>;
}) {
  const { joinCode } = await params;
  const group = await prisma.group.findUnique({ where: { joinCode } });
  if (!group) notFound();

  return <GroupLeaderboard joinCode={joinCode} groupName={group.name} />;
}
