import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isSupportedGame, getFactionGuide, type GameId } from "@/lib/wiki/loaders";
import { FACTION_MAP } from "@/components/factions-data";
import factionNames from "../../../../../../../game-content/root/faction-names.json";
import { PlayGuideWizard } from "@/components/wiki/PlayGuideWizard";
import { wikiStyles } from "@/components/wiki/wikiStyles";

const FACTION_NAMES_ES: Record<string, string> = factionNames;

export default async function FactionPlayPage({
  params,
}: {
  params: Promise<{ gameId: string; factionId: string }>;
}) {
  const { gameId, factionId } = await params;
  if (!isSupportedGame(gameId)) notFound();
  const g: GameId = gameId;
  const faction = FACTION_MAP[factionId];
  if (!faction) notFound();
  const guide = getFactionGuide(g, factionId);
  if (guide.status === "stub") notFound();

  const tips = await prisma.tip.findMany({
    where: { gameId: g, targets: { some: { factionId } } },
    include: { targets: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <>
      <style>{wikiStyles}</style>
      <div className="wiki-page">
        <div className="wiki-container">
          <Link className="wiki-back" href={`/wiki/${g}/facciones/${factionId}`}>
            ← {FACTION_NAMES_ES[factionId] ?? faction.name}
          </Link>
          <div className="wiki-title">{FACTION_NAMES_ES[factionId] ?? faction.name}</div>
          <div className="wiki-subtitle">Guía de turno paso a paso</div>

          <PlayGuideWizard gameId={g} guide={guide} tips={tips} />
        </div>
      </div>
    </>
  );
}
