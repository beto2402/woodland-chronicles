import Link from "next/link";
import { notFound } from "next/navigation";
import { isSupportedGame, getAllCards, type GameId } from "@/lib/wiki/loaders";
import { wikiStyles } from "@/components/wiki/wikiStyles";

export default async function CardsPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  if (!isSupportedGame(gameId)) notFound();
  const g: GameId = gameId;
  const cards = getAllCards(g)
    .filter((c) => c.translations.es)
    .sort((a, b) => (a.translations.es?.name ?? "").localeCompare(b.translations.es?.name ?? "", "es"));

  return (
    <>
      <style>{wikiStyles}</style>
      <div className="wiki-page">
        <div className="wiki-container">
          <Link className="wiki-back" href={`/wiki/${g}`}>
            ← Wiki
          </Link>
          <div className="wiki-title">Cartas</div>
          <div className="wiki-subtitle">{cards.length} cartas del mazo base.</div>

          <div className="wiki-list">
            {cards.map((c) => (
              <Link key={c.id} className="wiki-list-item" href={`/wiki/${g}/cartas/${c.id}`}>
                {c.translations.es?.name}
                <span className="wiki-list-item-sub">{c.nameEn}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
