"use client";

import { useState, useRef, useEffect } from "react";
import { getAllCards, getCard, getConcept, type GameId } from "@/lib/wiki/loaders";
import { parseWikiText } from "@/lib/wiki/parseWikiText";

const SUIT_LABEL_ES: Record<string, string> = {
  fox: "Zorro",
  rabbit: "Conejo",
  mouse: "Ratón",
  any: "cualquier palo",
};

type Viewing = { kind: "card" | "concept"; id: string } | null;

// Renders body text with [[card:x]]/[[concept:x]] links as buttons that swap the inline panel
// instead of navigating — so following a cross-reference from one looked-up card to another
// never leaves the wizard either.
function InlineText({ gameId, text, onNavigate }: { gameId: GameId; text: string; onNavigate: (v: Viewing) => void }) {
  const tokens = parseWikiText(text);
  return (
    <>
      {tokens.map((t, i) => {
        if (t.type === "text") return <span key={i}>{t.value}</span>;
        const fallback =
          t.kind === "card" ? getCard(gameId, t.id)?.translations.es?.name : getConcept(gameId, t.id)?.translations.es?.name;
        return (
          <button key={i} type="button" className="wiki-link wiki-link-inline" onClick={() => onNavigate({ kind: t.kind, id: t.id })}>
            {t.label ?? fallback ?? t.id}
          </button>
        );
      })}
    </>
  );
}

// Embedded card search for the "jugar" wizard: look up a card by English or Spanish name
// mid-walkthrough without stepping out to a full page. Selecting a result (or following a
// cross-reference inside its text) shows the card/concept inline; nothing here ever navigates.
export function InGameLookup({ gameId }: { gameId: GameId }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [viewing, setViewing] = useState<Viewing>(null);
  const ref = useRef<HTMLDivElement>(null);

  const cards = getAllCards(gameId);
  const q = query.trim().toLowerCase();
  const results = q
    ? cards.filter((c) => c.nameEn.toLowerCase().includes(q) || c.translations.es?.name.toLowerCase().includes(q)).slice(0, 8)
    : [];

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  return (
    <div className="lookup" ref={ref}>
      <input
        className="lookup-input"
        placeholder="🔍 Buscar una carta (inglés o español)…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      {open && q && (
        <div className="lookup-results">
          {results.length === 0 ? (
            <div className="lookup-empty">Sin resultados</div>
          ) : (
            results.map((c) => (
              <div
                key={c.id}
                className="lookup-result"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setViewing({ kind: "card", id: c.id });
                  setOpen(false);
                  setQuery("");
                }}
              >
                {c.translations.es?.name ?? c.nameEn}
                <span className="wiki-list-item-sub">{c.nameEn}</span>
              </div>
            ))
          )}
        </div>
      )}

      {viewing &&
        (() => {
          if (viewing.kind === "card") {
            const card = getCard(gameId, viewing.id);
            const es = card?.translations.es;
            if (!card || !es) return null;
            const costLabel = card.craftingRequirements
              ? Object.entries(card.craftingRequirements)
                  .map(([suit, count]) => `${count} ${SUIT_LABEL_ES[suit] ?? suit}`)
                  .join(" + ")
              : "No se fabrica — se juega directamente desde la mano";
            return (
              <div className="lookup-panel">
                <div className="lookup-panel-header">
                  <strong>{es.name}</strong>
                  <button type="button" onClick={() => setViewing(null)}>
                    ✕
                  </button>
                </div>
                <div className="lookup-panel-cost">Coste de fabricación: {costLabel}</div>
                <div className="lookup-panel-body">
                  <InlineText gameId={gameId} text={es.text} onNavigate={setViewing} />
                </div>
              </div>
            );
          }
          const concept = getConcept(gameId, viewing.id);
          const es = concept?.translations.es;
          if (!concept || !es?.text) return null;
          return (
            <div className="lookup-panel">
              <div className="lookup-panel-header">
                <strong>{es.name}</strong>
                <button type="button" onClick={() => setViewing(null)}>
                  ✕
                </button>
              </div>
              <div className="lookup-panel-body">
                <InlineText gameId={gameId} text={es.text} onNavigate={setViewing} />
              </div>
            </div>
          );
        })()}
    </div>
  );
}
