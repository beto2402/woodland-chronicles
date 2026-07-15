import Link from "next/link";
import { notFound } from "next/navigation";
import { isSupportedGame, getAllConcepts, type GameId } from "@/lib/wiki/loaders";
import { wikiStyles } from "@/components/wiki/wikiStyles";

export default async function ConceptsPage({ params }: { params: Promise<{ gameId: string }> }) {
  const { gameId } = await params;
  if (!isSupportedGame(gameId)) notFound();
  const g: GameId = gameId;
  const concepts = getAllConcepts(g);

  return (
    <>
      <style>{wikiStyles}</style>
      <div className="wiki-page">
        <div className="wiki-container">
          <Link className="wiki-back" href={`/wiki/${g}`}>
            ← Wiki
          </Link>
          <div className="wiki-title">Conceptos</div>
          <div className="wiki-subtitle">Glosario de mecánicas básicas.</div>

          <div className="wiki-list">
            {concepts.map((c) => {
              const es = c.translations.es;
              const en = c.translations.en;
              return (
                <Link key={c.id} className="wiki-list-item" href={`/wiki/${g}/conceptos/${c.id}`}>
                  {es?.name ?? c.id}
                  {en?.name && <span className="wiki-list-item-sub">{en.name}</span>}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
