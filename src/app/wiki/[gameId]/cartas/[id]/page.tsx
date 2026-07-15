import Link from "next/link";
import { notFound } from "next/navigation";
import { isSupportedGame, getCard, type GameId } from "@/lib/wiki/loaders";
import { getAllFactionCraftingInfo } from "@/lib/wiki/faction-crafting";
import { WikiText } from "@/components/wiki/WikiText";
import { CraftingExplanation } from "@/components/wiki/CraftingExplanation";
import { wikiStyles } from "@/components/wiki/wikiStyles";

const SUIT_LABEL_ES: Record<string, string> = {
  fox: "Zorro",
  rabbit: "Conejo",
  mouse: "Ratón",
  any: "cualquier palo",
};

export default async function CardDetailPage({
  params,
}: {
  params: Promise<{ gameId: string; id: string }>;
}) {
  const { gameId, id } = await params;
  if (!isSupportedGame(gameId)) notFound();
  const g: GameId = gameId;
  const card = getCard(g, id);
  if (!card) notFound();
  const es = card.translations.es;
  if (!es) notFound();

  const costLabel = card.craftingRequirements
    ? Object.entries(card.craftingRequirements)
        .map(([suit, count]) => `${count} ${SUIT_LABEL_ES[suit] ?? suit}`)
        .join(" + ")
    : "No se fabrica — se juega directamente desde la mano";

  return (
    <>
      <style>{wikiStyles}</style>
      <div className="wiki-page">
        <div className="wiki-container">
          <Link className="wiki-back" href={`/wiki/${g}/cartas`}>
            ← Cartas
          </Link>
          <div className="wiki-title">{es.name}</div>
          <div className="wiki-subtitle">
            {card.nameEn}
            {card.nameEnUnverified && " (nombre en inglés sin confirmar)"}
          </div>

          <div className="wiki-detail-card">
            <div className="wiki-detail-body">
              <WikiText gameId={g} text={es.text} />
            </div>
            <div className="wiki-craft-cost">Coste de fabricación: {costLabel}</div>
            <CraftingExplanation
              craftingRequirements={card.craftingRequirements}
              factionCraftingInfo={getAllFactionCraftingInfo(g)}
            />
          </div>
        </div>
      </div>
    </>
  );
}
