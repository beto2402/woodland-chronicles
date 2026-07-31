import type { Concept, CardEntry, FactionTurnGuide, GuideBlock, CardSuit } from "./types";

import rootConcepts from "../../../game-content/root/concepts.json";
import rootBaseDeck from "../../../game-content/root/translations/base-deck.json";
import rootMarquiseGuide from "../../../game-content/root/faction-guides/marquise.json";
import rootAllianceGuide from "../../../game-content/root/faction-guides/alliance.json";
import rootEyrieGuide from "../../../game-content/root/faction-guides/eyrie.json";
import rootVagabondGuide from "../../../game-content/root/faction-guides/vagabond.json";
import rootRiverfolkGuide from "../../../game-content/root/faction-guides/riverfolk.json";
import rootLizardGuide from "../../../game-content/root/faction-guides/lizard.json";
import rootDuchyGuide from "../../../game-content/root/faction-guides/underground-duchy.json";
import rootKeepersGuide from "../../../game-content/root/faction-guides/keepers.json";
import rootTwilightGuide from "../../../game-content/root/faction-guides/twilight.json";
import rootKnavesGuide from "../../../game-content/root/faction-guides/knaves.json";
import rootLilypadGuide from "../../../game-content/root/faction-guides/lilypad.json";
import rootLordGuide from "../../../game-content/root/faction-guides/lord-of-the-hundreds.json";
import rootCorvidGuide from "../../../game-content/root/faction-guides/corvid.json";

export const SUPPORTED_GAMES = ["root"] as const;
export type GameId = (typeof SUPPORTED_GAMES)[number];

export function isSupportedGame(gameId: string): gameId is GameId {
  return (SUPPORTED_GAMES as readonly string[]).includes(gameId);
}

const CONCEPTS_BY_GAME: Record<GameId, Concept[]> = {
  root: rootConcepts as Concept[],
};

// Card data files (translations/base-deck.json) are keyed by base-language card name and use
// "esp" as their Spanish translation key (the shape the user originally authored). Normalized
// here to the same { name, text } shape and "es" language code used by concepts/actions, so
// downstream code (search, WikiText, display) never needs to know about the "esp" quirk.
type RawCardFile = Record<
  string,
  {
    crafting_requirements: Partial<Record<CardSuit, number>> | null;
    translations: { esp?: { name: string; translation: string } };
  }
>;

const UNVERIFIED_FLAG = /\s*\(EN unverified\)\s*/i;

// Raw JSON keys are the base-language (English) card name, but several carry a planning-time
// "(EN unverified)" flag (the guess wasn't independently confirmed) that must never leak into
// URLs or search — stripped here into a clean nameEn + a slug + a nameEnUnverified flag.
function parseCardKey(rawKey: string): { nameEn: string; slug: string; nameEnUnverified: boolean } {
  const nameEnUnverified = UNVERIFIED_FLAG.test(rawKey);
  const cleaned = rawKey.replace(UNVERIFIED_FLAG, "").trim();
  const nameEn = cleaned.replace(/\b\w/g, (c) => c.toUpperCase());
  const slug = cleaned
    .toLowerCase()
    .replace(/[!]/g, "")
    .replace(/[()]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return { nameEn, slug, nameEnUnverified };
}

function normalizeCards(raw: RawCardFile): CardEntry[] {
  return Object.entries(raw).map(([rawKey, entry]) => {
    const { nameEn, slug, nameEnUnverified } = parseCardKey(rawKey);
    return {
      id: slug,
      nameEn,
      nameEnUnverified,
      craftingRequirements: entry.crafting_requirements,
      translations: entry.translations.esp
        ? { es: { name: entry.translations.esp.name, text: entry.translations.esp.translation } }
        : {},
    };
  });
}

const CARDS_BY_GAME: Record<GameId, CardEntry[]> = {
  root: normalizeCards(rootBaseDeck as RawCardFile),
};

const GUIDES_BY_GAME: Record<GameId, Record<string, FactionTurnGuide>> = {
  root: {
    marquise: rootMarquiseGuide as FactionTurnGuide,
    alliance: rootAllianceGuide as FactionTurnGuide,
    eyrie: rootEyrieGuide as FactionTurnGuide,
    vagabond: rootVagabondGuide as FactionTurnGuide,
    vagabond2: rootVagabondGuide as FactionTurnGuide, // second Vagabond player, same rules
    riverfolk: rootRiverfolkGuide as FactionTurnGuide,
    lizard: rootLizardGuide as FactionTurnGuide,
    duchy: rootDuchyGuide as FactionTurnGuide,
    keepers: rootKeepersGuide as FactionTurnGuide,
    twilight: rootTwilightGuide as FactionTurnGuide,
    knaves: rootKnavesGuide as FactionTurnGuide,
    lilypad: rootLilypadGuide as FactionTurnGuide,
    lord: rootLordGuide as FactionTurnGuide,
    corvid: rootCorvidGuide as FactionTurnGuide,
  },
};

// Factions covered by the third-party (BoardGameGeek) turn-guide PDF, split per-faction and
// stored privately in Vercel Blob — see prisma/upload-wiki-pdfs.mjs. It's someone else's work
// (not ours to redistribute openly), so it's served only through the auth+access-gated
// /api/wiki/[gameId]/facciones/[factionId]/guide-pdf route, never linked directly. Only covers
// factions up through the Marauder expansion; vagabond2 shares vagabond's PDF, same as its guide.
const PDF_GUIDE_BLOB_PATH: Record<GameId, Record<string, string>> = {
  root: {
    marquise: "wiki-guides/root/marquise.pdf",
    alliance: "wiki-guides/root/alliance.pdf",
    eyrie: "wiki-guides/root/eyrie.pdf",
    vagabond: "wiki-guides/root/vagabond.pdf",
    vagabond2: "wiki-guides/root/vagabond.pdf",
    riverfolk: "wiki-guides/root/riverfolk.pdf",
    lizard: "wiki-guides/root/lizard.pdf",
    duchy: "wiki-guides/root/duchy.pdf",
    keepers: "wiki-guides/root/keepers.pdf",
    lord: "wiki-guides/root/lord.pdf",
    corvid: "wiki-guides/root/corvid.pdf",
  },
};

export function getFactionGuidePdfBlobPath(gameId: GameId, factionId: string): string | null {
  return PDF_GUIDE_BLOB_PATH[gameId]?.[factionId] ?? null;
}

export function getAllConcepts(gameId: GameId): Concept[] {
  return CONCEPTS_BY_GAME[gameId] ?? [];
}

export function getConcept(gameId: GameId, id: string): Concept | undefined {
  return getAllConcepts(gameId).find((c) => c.id === id);
}

export function getAllCards(gameId: GameId): CardEntry[] {
  return CARDS_BY_GAME[gameId] ?? [];
}

export function getCard(gameId: GameId, id: string): CardEntry | undefined {
  return getAllCards(gameId).find((c) => c.id === id);
}

export function getFactionGuide(gameId: GameId, factionId: string): FactionTurnGuide {
  return (
    GUIDES_BY_GAME[gameId]?.[factionId] ?? {
      factionId,
      status: "stub",
      translations: {},
      actions: {},
      blocks: [],
    }
  );
}

// Looks up which block (and therefore which phase) an action belongs to, so a Tip targeting
// that action can be shown on the right wizard screen without duplicating the phase in the DB.
// Searches top-level blocks first, then each DrivenActionBlock's onFailureBlocks.
export function findBlockForAction(guide: FactionTurnGuide, actionId: string): GuideBlock | undefined {
  for (const b of guide.blocks) {
    if (b.actionIds.includes(actionId)) return b;
    if (b.kind === "driven" && b.onFailureBlocks) {
      const nested = b.onFailureBlocks.find((fb) => fb.actionIds.includes(actionId));
      if (nested) return nested;
    }
  }
  return undefined;
}
