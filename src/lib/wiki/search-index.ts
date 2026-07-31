import { getAllConcepts, getAllCards, getFactionGuide, type GameId } from "./loaders";
import factionNames from "../../../game-content/root/faction-names.json";
import { FACTIONS } from "@/components/factions-data";

export interface SearchEntry {
  id: string;
  type: "concept" | "card" | "faction" | "action";
  label: string; // primary display label, e.g. "Claro · Clearing"
  href: string;
  searchTerms: string[]; // every populated language's name/aliases, lowercased
}

const FACTION_NAMES_ES: Record<string, string> = factionNames;

export function buildSearchIndex(gameId: GameId): SearchEntry[] {
  const concepts: SearchEntry[] = getAllConcepts(gameId).map((c) => {
    const terms = new Set<string>();
    for (const t of Object.values(c.translations)) {
      if (!t) continue;
      terms.add(t.name.toLowerCase());
      for (const alias of t.aliases ?? []) terms.add(alias.toLowerCase());
    }
    const es = c.translations.es?.name;
    const en = c.translations.en?.name;
    return {
      id: c.id,
      type: "concept",
      label: es && en ? `${es} · ${en}` : es ?? en ?? c.id,
      href: `/wiki/${gameId}/conceptos/${c.id}`,
      searchTerms: [...terms],
    };
  });

  const cards: SearchEntry[] = getAllCards(gameId).map((c) => {
    const terms = new Set<string>([c.nameEn.toLowerCase()]);
    const es = c.translations.es?.name;
    if (es) terms.add(es.toLowerCase());
    return {
      id: c.id,
      type: "card",
      label: es ? `${es} · ${c.nameEn}` : c.nameEn,
      href: `/wiki/${gameId}/cartas/${c.id}`,
      searchTerms: [...terms],
    };
  });

  const factions: SearchEntry[] =
    gameId === "root"
      ? FACTIONS.map((f) => {
          const es = FACTION_NAMES_ES[f.id];
          return {
            id: f.id,
            type: "faction" as const,
            label: es ? `${es} · ${f.name}` : f.name,
            href: `/wiki/${gameId}/facciones/${f.id}`,
            searchTerms: [f.name.toLowerCase(), es?.toLowerCase()].filter(Boolean) as string[],
          };
        })
      : [];

  // Guide actions (e.g. Lord of the Hundreds' Moods) are only searchable once they carry an
  // "en" title — most actions are Spanish-only prose and would just be noise here. Adding an
  // "en" title to an action's translations is what opts it into search; nothing else changes.
  const actions: SearchEntry[] =
    gameId === "root"
      ? FACTIONS.flatMap((f) => {
          const guide = getFactionGuide(gameId, f.id);
          const factionEs = FACTION_NAMES_ES[f.id];
          return Object.entries(guide.actions)
            .filter(([, action]) => action.translations.en)
            .map(([actionId, action]) => {
              const es = action.translations.es?.title;
              const en = action.translations.en!.title;
              const base = es ? `${es} · ${en}` : en;
              return {
                id: `${f.id}:${actionId}`,
                type: "action" as const,
                label: factionEs ? `${base} (${factionEs})` : base,
                href: `/wiki/${gameId}/facciones/${f.id}/jugar?action=${actionId}`,
                searchTerms: [en.toLowerCase(), ...(es ? [es.toLowerCase()] : [])],
              };
            });
        })
      : [];

  return [...concepts, ...cards, ...factions, ...actions];
}

export function searchIndex(entries: SearchEntry[], query: string): SearchEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return entries.filter((e) => e.searchTerms.some((term) => term.includes(q)));
}
