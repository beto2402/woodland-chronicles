"use client";

import { useState, useEffect } from "react";
import type { FactionCraftingInfo } from "@/lib/wiki/types";

const BEGINNER_MODE_KEY = "wiki:beginnerMode";

const SUIT_LABEL_ES: Record<string, string> = {
  fox: "Zorro",
  rabbit: "Conejo",
  mouse: "Ratón",
  any: "cualquier palo",
};

// Beginner-mode-only section on a card's detail page: for each faction with known crafting
// mechanics (see faction-crafting.ts), phrases the card's own cost in that faction's terms
// (e.g. "activa 1 Taller de Zorro" vs "activa 1 ficha de simpatía"). Reads the same
// localStorage flag PlayGuideWizard writes, so the toggle is consistent app-wide.
export function CraftingExplanation({
  craftingRequirements,
  factionCraftingInfo,
}: {
  craftingRequirements: Partial<Record<string, number>> | null;
  factionCraftingInfo: FactionCraftingInfo[];
}) {
  const [beginnerMode, setBeginnerMode] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(BEGINNER_MODE_KEY);
    if (stored !== null) setBeginnerMode(stored === "1");
  }, []);

  if (!beginnerMode || !craftingRequirements) return null;

  return (
    <div className="wiki-craft-cost">
      <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, cursor: "pointer" }}>
        <input
          type="checkbox"
          checked={beginnerMode}
          onChange={(e) => {
            setBeginnerMode(e.target.checked);
            localStorage.setItem(BEGINNER_MODE_KEY, e.target.checked ? "1" : "0");
          }}
        />
        Modo principiante
      </label>
      <div>🔨 Cómo fabricarla, según facción:</div>
      {factionCraftingInfo.map((info) => {
        const t = info.translations.es;
        if (!t) return null;
        const costText = Object.entries(craftingRequirements)
          .map(([suit, count]) => `${count} ${SUIT_LABEL_ES[suit] ?? suit}`)
          .join(" + ");
        return (
          <div key={info.factionId} className="wiki-craft-cost-line">
            <strong>{t.pieceName}:</strong> activa {costText} de {t.pieceName.toLowerCase()}. {t.obtain}
          </div>
        );
      })}
    </div>
  );
}
