import Link from "next/link";
import { notFound } from "next/navigation";
import { isSupportedGame, getConcept, type GameId } from "@/lib/wiki/loaders";
import { WikiText } from "@/components/wiki/WikiText";
import { wikiStyles } from "@/components/wiki/wikiStyles";

export default async function ConceptDetailPage({
  params,
}: {
  params: Promise<{ gameId: string; id: string }>;
}) {
  const { gameId, id } = await params;
  if (!isSupportedGame(gameId)) notFound();
  const g: GameId = gameId;
  const concept = getConcept(g, id);
  if (!concept) notFound();
  const es = concept.translations.es;
  const en = concept.translations.en;
  if (!es?.text) notFound();

  return (
    <>
      <style>{wikiStyles}</style>
      <div className="wiki-page">
        <div className="wiki-container">
          <Link className="wiki-back" href={`/wiki/${g}/conceptos`}>
            ← Conceptos
          </Link>
          <div className="wiki-title">{es.name}</div>
          {en?.name && <div className="wiki-subtitle">{en.name}</div>}

          <div className="wiki-detail-card">
            <div className="wiki-detail-body">
              <WikiText gameId={g} text={es.text} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
