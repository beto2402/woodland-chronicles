import Link from "next/link";
import { getConcept, getCard, type GameId } from "@/lib/wiki/loaders";
import { parseWikiText } from "@/lib/wiki/parseWikiText";

// Renders [[concept:id]] / [[card:key]] markup (see parseWikiText.ts) as real internal links —
// normal page navigation. For a version that stays inline instead of navigating (used inside
// the "jugar" wizard's card lookup), see InGameLookup.tsx.
export function WikiText({ gameId, text }: { gameId: GameId; text: string }) {
  const tokens = parseWikiText(text);
  return (
    <>
      {tokens.map((t, i) => {
        if (t.type === "text") return <span key={i}>{t.value}</span>;
        const isCard = t.kind === "card";
        const href = isCard ? `/wiki/${gameId}/cartas/${t.id}` : `/wiki/${gameId}/conceptos/${t.id}`;
        const fallback = isCard ? getCard(gameId, t.id)?.translations.es?.name : getConcept(gameId, t.id)?.translations.es?.name;
        return (
          <Link key={i} className="wiki-link" href={href}>
            {t.label ?? fallback ?? t.id}
          </Link>
        );
      })}
    </>
  );
}
