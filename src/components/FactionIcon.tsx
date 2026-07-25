"use client";

// Plain faction data/helpers live in factions-data.ts (no "use client") so server components
// can import them directly without pulling in this file's client boundary. Re-exported here
// for backwards compatibility with existing imports of FACTIONS/FACTION_MAP/etc. from this file.
export { FACTIONS, FACTION_MAP, getFactionStyle, FACTIONS_WITH_PORTRAIT } from "./factions-data";
import { FACTION_MAP, FACTIONS_WITH_PORTRAIT } from "./factions-data";

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
