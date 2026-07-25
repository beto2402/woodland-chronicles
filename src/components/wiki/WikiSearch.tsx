"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { buildSearchIndex, searchIndex } from "@/lib/wiki/search-index";
import type { GameId } from "@/lib/wiki/loaders";

const TYPE_LABEL_ES: Record<string, string> = {
  concept: "Concepto",
  card: "Carta",
  faction: "Facción",
};

// Type-to-filter combobox modeled on FactionSelect.tsx. Matches English or Spanish names
// (and aliases) since search terms come from every populated language, not a hardcoded pair.
export function WikiSearch({ gameId, placeholder }: { gameId: GameId; placeholder?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const index = useMemo(() => buildSearchIndex(gameId), [gameId]);
  const results = searchIndex(index, query).slice(0, 20);

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  function pick(href: string) {
    setOpen(false);
    setQuery("");
    router.push(href);
  }

  return (
    <div className="wiki-combobox" ref={ref}>
      <input
        className="wiki-combobox-input"
        placeholder={placeholder ?? "Buscar en inglés o español…"}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setActive((a) => Math.min(a + 1, results.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            if (results[active]) pick(results[active].href);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {open && query.trim() && (
        <div className="wiki-combobox-list">
          {results.length === 0 ? (
            <div className="wiki-combobox-empty">Sin resultados</div>
          ) : (
            results.map((r, i) => (
              <div
                key={`${r.type}-${r.id}`}
                className={`wiki-combobox-option ${i === active ? "active" : ""}`}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(r.href);
                }}
              >
                <span className="wiki-combobox-type">{TYPE_LABEL_ES[r.type]}</span>
                {r.label}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
