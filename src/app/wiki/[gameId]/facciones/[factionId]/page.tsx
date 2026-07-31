import Link from "next/link";
import { notFound } from "next/navigation";
import { isSupportedGame, getFactionGuide, getFactionGuidePdfBlobPath, type GameId } from "@/lib/wiki/loaders";
import { FactionPortrait } from "@/components/FactionIcon";
import { FACTION_MAP } from "@/components/factions-data";
import { FactionGuidePdfLink } from "@/components/wiki/FactionGuidePdfLink";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import factionNames from "../../../../../../game-content/root/faction-names.json";
import { wikiStyles } from "@/components/wiki/wikiStyles";

const FACTION_NAMES_ES: Record<string, string> = factionNames;

export default async function FactionOverviewPage({
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
  const isReady = guide.status === "complete" || guide.status === "partial";

  const hasGuidePdf = getFactionGuidePdfBlobPath(g, factionId) !== null;
  let hasPdfAccess = false;
  if (hasGuidePdf) {
    const session = await auth();
    if (session?.user?.id) {
      const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { wikiPdfAccess: true } });
      hasPdfAccess = user?.wikiPdfAccess ?? false;
    }
  }

  return (
    <>
      <style>{wikiStyles}</style>
      <div className="wiki-page">
        <div className="wiki-container">
          <Link className="wiki-back" href={`/wiki/${g}/facciones`}>
            ← Facciones
          </Link>
          <div className="wiki-title">{FACTION_NAMES_ES[factionId] ?? faction.name}</div>
          <div className="wiki-subtitle">{faction.name}</div>

          <div className="wiki-detail-card">
            <FactionPortrait id={factionId} size={96} />
            {isReady ? (
              <>
                <p className="wiki-detail-body" style={{ marginTop: 16 }}>
                  {guide.translations.es?.intro}
                </p>
                <Link className="wiki-play-button" href={`/wiki/${g}/facciones/${factionId}/jugar`}>
                  ▶ Jugar
                </Link>
                {hasGuidePdf && <FactionGuidePdfLink gameId={g} factionId={factionId} hasAccess={hasPdfAccess} />}
                {guide.notes?.es && guide.notes.es.length > 0 && (
                  <div className="wiki-faction-notes">
                    <div className="wiki-section-heading">Cosas importantes a saber</div>
                    <ul>
                      {guide.notes.es.map((note, i) => (
                        <li key={i}>{note}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              <p className="wiki-detail-body" style={{ marginTop: 16, fontStyle: "italic", color: "#8a9a7a" }}>
                Guía aún no disponible — próximamente.
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
