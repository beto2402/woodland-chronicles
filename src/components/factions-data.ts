// Plain faction data + helpers, deliberately NOT marked "use client" (unlike FactionIcon.tsx)
// so server components can import FACTIONS/FACTION_MAP directly without pulling in a client
// boundary. FactionIcon.tsx re-exports everything here for backwards compatibility with
// existing client-side imports — this file is the actual source of truth.
//
// Each faction carries two usable shades for charts/diagrams: a hand-tuned
// primary `color`, plus an `altColor` sampled from its portrait background in
// public/art/icons/<id>-portrait.jpg (the official factions-chart art).
// Vagabond's sampled white is nudged to a usable grey; knaves and vagabond2
// are absent from the chart, so their altColor is a derived lighter shade.
export const FACTIONS = [
  { id: "marquise",  name: "Marquise de Cat",         symbol: "🐱", color: "#e8a020", altColor: "#ce7133" },
  { id: "eyrie",     name: "Eyrie Dynasties",          symbol: "🦅", color: "#4a90d9", altColor: "#4572ae" },
  { id: "alliance",  name: "Woodland Alliance",        symbol: "🌿", color: "#5a8a3a", altColor: "#67ae56" },
  { id: "vagabond",  name: "Vagabond",                 symbol: "🎒", color: "#888888", altColor: "#c2c2c2" },
  { id: "vagabond2", name: "Vagabond (2nd)",           symbol: "🎒", color: "#aaaaaa", altColor: "#cfcfcf" },
  { id: "riverfolk", name: "Riverfolk Company",        symbol: "🦦", color: "#3a9aaa", altColor: "#59b2ad" },
  { id: "lizard",    name: "Lizard Cult",              symbol: "🦎", color: "#c8a830", altColor: "#e1d936" },
  { id: "duchy",     name: "Underground Duchy",        symbol: "🪨", color: "#9b7040", altColor: "#dab89c" },
  { id: "corvid",    name: "Corvid Conspiracy",        symbol: "🐦‍⬛", color: "#5a3a7a", altColor: "#51286e" },
  { id: "lord",      name: "Lord of the Hundreds",     symbol: "🐀", color: "#b03030", altColor: "#ea441b" },
  { id: "keepers",   name: "Keepers in Iron",          symbol: "⚔️", color: "#708090", altColor: "#a7a7aa" },
  { id: "knaves",    name: "Knaves of the Deepwood",   symbol: "🦨", color: "#4a6040", altColor: "#6a8a5a" },
  { id: "lilypad",   name: "Lilypad Diaspora",         symbol: "🐸", color: "#3fa98c", altColor: "#a89204" },
  { id: "twilight",  name: "Twilight Council",         symbol: "🦇", color: "#6a5acd", altColor: "#8f4b32" },
];

export const FACTION_MAP = Object.fromEntries(FACTIONS.map((f) => [f.id, f]));

export function getFactionStyle(factionId: string) {
  const f = FACTION_MAP[factionId];
  if (!f) return {};
  return { color: "#d8e0c8", borderColor: f.color + "88" };
}

// Factions with a cartoon portrait in public/art/icons/<id>-portrait.jpg
// (the 12 from factions-chart.jpeg; knaves and vagabond2 are not in that chart).
export const FACTIONS_WITH_PORTRAIT = new Set([
  "marquise", "eyrie", "alliance", "vagabond", "lizard", "riverfolk",
  "duchy", "corvid", "lord", "keepers", "twilight", "lilypad",
]);
