import Link from "next/link";
import { notFound } from "next/navigation";
import { isSupportedGame, getFactionGuide, type GameId } from "@/lib/wiki/loaders";
import { FactionPortrait } from "@/components/FactionIcon";
import { FACTIONS } from "@/components/factions-data";
import factionNames from "../../../../game-content/root/faction-names.json";
import { WikiSearch } from "@/components/wiki/WikiSearch";
import { wikiStyles } from "@/components/wiki/wikiStyles";

const FACTION_NAMES_ES: Record<string, string> = factionNames;

export default async function WikiHomePage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  if (!isSupportedGame(gameId)) notFound();
  const g: GameId = gameId;

  const readyFactions = FACTIONS.map((f) => ({ ...f, guide: getFactionGuide(g, f.id) })).filter(
    (f) => f.guide.status === "complete" || f.guide.status === "partial"
  );

  return (
    <>
      <style>{wikiStyles}</style>
      <div className="wiki-page">
        <div className="wiki-container">
          <Link className="wiki-back" href="/">
            ← Volver
          </Link>
          <div className="wiki-title">Cómo jugar Root</div>
          <div className="wiki-subtitle">Busca un concepto o carta en inglés o español.</div>

          <WikiSearch gameId={g} />

          {readyFactions.length > 0 && (
            <>
              <div className="wiki-section-heading">▶ Empezar a jugar</div>
              <div className="wiki-faction-grid">
                {readyFactions.map((f) => (
                  <Link key={f.id} className="wiki-faction-card" href={`/wiki/${g}/facciones/${f.id}/jugar`}>
                    <FactionPortrait id={f.id} size={64} />
                    <div className="wiki-faction-name">{FACTION_NAMES_ES[f.id] ?? f.name}</div>
                  </Link>
                ))}
              </div>
              <Link className="wiki-see-all-link" href={`/wiki/${g}/facciones`}>
                Ver todas las facciones →
              </Link>
            </>
          )}

          <div className="wiki-section-heading">Explorar</div>
          <div className="wiki-section-links">
            <Link className="wiki-section-link" href={`/wiki/${g}/conceptos`}>
              📖 Conceptos
            </Link>
            <Link className="wiki-section-link" href={`/wiki/${g}/cartas`}>
              🃏 Cartas
            </Link>
            <Link className="wiki-section-link" href={`/wiki/${g}/facciones`}>
              🐾 Facciones
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
