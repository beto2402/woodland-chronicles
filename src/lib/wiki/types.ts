// Types for the in-app wiki. LanguageCode is a plain string (not a fixed union) so a new
// language is just new content, never a type change. Every game's content is namespaced by
// gameId (see game-content/<gameId>/) so a second game later doesn't need a rearchitecture.

export type LanguageCode = string;

export interface ConceptTranslation {
  name: string;
  aliases?: string[];
  text?: string; // hyperlinked body; may contain [[concept:id]] / [[card:key]] markup
}

export interface Concept {
  id: string;
  translations: Partial<Record<LanguageCode, ConceptTranslation>>;
}

export type CardSuit = "fox" | "rabbit" | "mouse" | "any";

export interface CardTranslation {
  name: string;
  text: string; // may contain [[concept:id]] / [[card:key]] markup
}

export interface CardEntry {
  id: string; // URL-safe slug derived from the base-language key, e.g. "gently-used-knapsack"
  nameEn: string; // cleaned base-language name (the raw JSON key, minus any "(EN unverified)" flag)
  nameEnUnverified: boolean; // true if the English name was a best-effort guess, not confirmed
  craftingRequirements: Partial<Record<CardSuit, number>> | null; // null = never crafted, played from hand
  translations: Partial<Record<LanguageCode, CardTranslation>>;
}

export type TurnPhase = "birdsong" | "daylight" | "evening"; // displayed label for "evening" is "Noche"

export interface Action {
  translations: Partial<Record<LanguageCode, { title: string; body: string }>>;
}

// repeat describes how many total picks are allowed from actionIds:
// - "once": a single mandatory pass (actionIds.length === 1 for a simple step)
// - "unlimited": repeat freely, any number of times
// - { max: N }: up to N total picks across the pool
// - { maxEs: "..." }: a dynamic/free-text cap that can't be a fixed number (e.g. "your number
//   of Officers") — used instead of `max` when the limit depends on game state
// bonusEs is free text for bonus-granting rules (e.g. "+1 per Bird card spent") rather than a
// structured numeric model, since bonus mechanics vary too much across factions to force into
// one shape.
export type ActionRepeat =
  | "once"
  | "unlimited"
  | { max?: number; maxEs?: string; bonusEs?: string };

export interface ActionBlock {
  kind: "action";
  id: string;
  phase: TurnPhase;
  actionIds: string[]; // length 1 = mandatory step; length > 1 = a menu to choose from
  repeat: ActionRepeat;
}

// A forced (not player-chosen) resolution over a dynamic, state-driven set — e.g. the Eyrie's
// Decree, where each card forces a *specific* action determined by which column it sits in, the
// count is however many cards are on the Decree (not a track number), and failing to complete
// one triggers a mandatory branching consequence. actionIds lists the actions that COULD be
// forced (kept for tip-targeting/hyperlinking); translations.body explains how the forcing and
// ordering actually work in prose, rather than encoding the column mechanism as rigid data —
// modeling that fully would make this a rules engine, not a teaching aid. onFailureBlocks is the
// nested consequence sequence (e.g. Turmoil's 4 forced steps), rendered inline as a collapsible
// panel rather than as separately-navigable screens, since it's conditional, not guaranteed.
export interface DrivenActionBlock {
  kind: "driven";
  id: string;
  phase: TurnPhase;
  translations: Partial<Record<LanguageCode, { title: string; body: string }>>;
  actionIds: string[];
  onFailureBlocks?: GuideBlock[];
}

export type GuideBlock = ActionBlock | DrivenActionBlock;

// A toggleable partial tweak to one specific action — e.g. a drafted Knave Captain patching one
// Item Action, or an Eyrie leader's passive patching Recruit/Battle. Unlike FactionVariant
// (exactly one active at a time, can replace a whole action's text), any number of modifiers can
// be active at once: each just appends explanatory text to its targetActionId's body rather than
// replacing the action, since several can apply to different actions simultaneously (Knaves draft
// 3 Captains at once, each tweaking a different Item Action). A modifier becomes "active" either
// by being directly toggled by the player (see FactionTurnGuide.modifiersMaxActive) or by being
// bundled into a selected FactionVariant (see FactionVariant.modifierIds) — same catalog entry,
// two ways to activate it.
export interface ActionModifier {
  id: string;
  targetActionId: string | string[]; // a few modifiers apply to more than one action (e.g. a
    // Knave Captain whose ability triggers off any of several actions that place acclaim)
  translations: Partial<Record<LanguageCode, { name: string; appendBody: string }>>;
}

// A faction-level selectable variant (Vagabond's character card; Eyrie's leader card), chosen
// once and persisted like beginner mode. actionOverrides lets a variant supply/replace specific
// Action entries wholesale (e.g. Vagabond's "special-action" id resolves differently per
// character); modifierIds instead references ActionModifier entries in the guide's `modifiers`
// catalog that become active automatically when this variant is selected (e.g. Eyrie's
// Charismatic leader auto-applies its Recruit-tweak modifier) — use actionOverrides when the
// variant provides a wholly different action, modifierIds when it just tweaks an existing one.
export interface FactionVariant {
  id: string;
  translations: Partial<Record<LanguageCode, { name: string; description: string }>>;
  actionOverrides?: Record<string, Action>;
  modifierIds?: string[];
}

export interface FactionTurnGuide {
  factionId: string;
  status: "complete" | "partial" | "stub";
  translations: Partial<Record<LanguageCode, { intro: string }>>;
  actions: Record<string, Action>;
  blocks: GuideBlock[];
  variants?: FactionVariant[];
  // Catalog of possible action modifiers (see ActionModifier). Some are only ever
  // variant-bundled (Eyrie's leader passives); others are directly toggleable by the player, up
  // to `modifiersMaxActive` at once (Knaves' drafted Captains) — labeled with `modifiersLabelEs`.
  modifiers?: ActionModifier[];
  modifiersMaxActive?: number;
  modifiersLabelEs?: string;
  // Cross-faction/passive-system callouts that aren't turn actions at all (e.g. Riverfolk's
  // Buying Services happens on ANOTHER faction's Birdsong; Vagabond's Relationships track).
  // Shown on the faction overview page, not the turn wizard.
  notes?: Partial<Record<LanguageCode, string[]>>;
}

export interface FactionCraftingInfo {
  factionId: string;
  translations: Partial<Record<LanguageCode, { pieceName: string; obtain: string }>>;
}
