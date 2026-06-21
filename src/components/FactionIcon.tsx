"use client";

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

// Larger cartoon portrait. Falls back to the webp icon for factions without one.
// When `className` is given, sizing is left to CSS (so it can be responsive);
// otherwise the `size` prop sets inline width/height.
export function FactionPortrait({
  id, size = 40, radius = 6, className,
}: { id: string; size?: number; radius?: number; className?: string }) {
  const f = FACTION_MAP[id];
  if (!f) return null;
  if (!FACTIONS_WITH_PORTRAIT.has(id)) return <FactionIcon id={id} size={size} />;
  const sized = className ? {} : { width: size, height: size };
  return (
    <img
      className={className}
      src={`/art/icons/${id}-portrait.jpg`}
      alt={f.name}
      loading="lazy"
      style={{
        ...sized,
        objectFit: "cover",
        borderRadius: radius,
        verticalAlign: "middle",
        display: "inline-block",
        flexShrink: 0,
      }}
    />
  );
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
