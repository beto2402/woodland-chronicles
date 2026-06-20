"use client";

export const FACTIONS = [
  { id: "marquise",  name: "Marquise de Cat",         symbol: "🐱", color: "#e8a020" },
  { id: "eyrie",     name: "Eyrie Dynasties",          symbol: "🦅", color: "#4a90d9" },
  { id: "alliance",  name: "Woodland Alliance",        symbol: "🌿", color: "#5a8a3a" },
  { id: "vagabond",  name: "Vagabond",                 symbol: "🎒", color: "#888888" },
  { id: "vagabond2", name: "Vagabond (2nd)",           symbol: "🎒", color: "#aaaaaa" },
  { id: "riverfolk", name: "Riverfolk Company",        symbol: "🦦", color: "#3a9aaa" },
  { id: "lizard",    name: "Lizard Cult",              symbol: "🦎", color: "#c8a830" },
  { id: "duchy",     name: "Underground Duchy",        symbol: "🪨", color: "#9b7040" },
  { id: "corvid",    name: "Corvid Conspiracy",        symbol: "🐦‍⬛", color: "#5a3a7a" },
  { id: "lord",      name: "Lord of the Hundreds",     symbol: "🐀", color: "#b03030" },
  { id: "keepers",   name: "Keepers in Iron",          symbol: "⚔️", color: "#708090" },
  { id: "knaves",    name: "Knaves of the Deepwood",   symbol: "🦨", color: "#4a6040" },
  { id: "lilypad",   name: "Lilypad Diaspora",         symbol: "🐸", color: "#3fa98c" },
  { id: "twilight",  name: "Twilight Council",         symbol: "🦇", color: "#6a5acd" },
];

export const FACTION_MAP = Object.fromEntries(FACTIONS.map((f) => [f.id, f]));

export function getFactionStyle(factionId: string) {
  const f = FACTION_MAP[factionId];
  if (!f) return {};
  return { color: "#d8e0c8", borderColor: f.color + "88" };
}

export function FactionIcon({ id, size = 20 }: { id: string; size?: number }) {
  const f = FACTION_MAP[id];
  if (!f) return null;
  return (
    <img
      src={`/art/icons/${id}.webp`}
      alt={f.name}
      width={size}
      height={size}
      loading="lazy"
      style={{
        width: size,
        height: size,
        objectFit: "contain",
        verticalAlign: "middle",
        display: "inline-block",
        flexShrink: 0,
      }}
    />
  );
}
