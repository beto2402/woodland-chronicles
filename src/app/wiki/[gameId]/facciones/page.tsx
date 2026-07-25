import Link from "next/link";
import { notFound } from "next/navigation";
import { isSupportedGame, getFactionGuide, type GameId } from "@/lib/wiki/loaders";
import { FactionPortrait } from "@/components/FactionIcon";
import { FACTIONS } from "@/components/factions-data";
import factionNames from "../../../../../game-content/root/faction-names.json";
import { wikiStyles } from "@/components/wiki/wikiStyles";

const FACTION_NAMES_ES: Record<string, string> = factionNames;

export default async function FactionsPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  if (!isSupportedGame(gameId)) notFound();
  const g: GameId = gameId;

  return (
    <>
      <style>{wikiStyles}</style>
      <div className="wiki-page">
        <div className="wiki-container">
          <Link className="wiki-back" href={`/wiki/${g}`}>
            ← Wiki
          </Link>
          <div className="wiki-title">Facciones</div>
          <div className="wiki-subtitle">Elige una facción para ver su guía de turno.</div>

          <div className="wiki-faction-grid">
            {FACTIONS.map((f) => {
              const guide = getFactionGuide(g, f.id);
              const isReady = guide.status === "complete" || guide.status === "partial";
              return (
                <Link key={f.id} className="wiki-faction-card" href={`/wiki/${g}/facciones/${f.id}`}>
                  <FactionPortrait id={f.id} size={64} />
                  <div className="wiki-faction-name">{FACTION_NAMES_ES[f.id] ?? f.name}</div>
                  <span className={`wiki-faction-badge ${isReady ? "complete" : "stub"}`}>
                    {isReady ? "Guía disponible" : "Próximamente"}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
