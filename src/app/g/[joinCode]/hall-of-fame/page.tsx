import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import HallOfFame from "./HallOfFame";

export default async function HallOfFamePage({
  params,
}: {
  params: Promise<{ joinCode: string }>;
}) {
  const { joinCode } = await params;
  const group = await prisma.group.findUnique({ where: { joinCode } });
  if (!group) notFound();

  return <HallOfFame joinCode={joinCode} groupName={group.name} />;
}
