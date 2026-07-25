// Shared parser for the [[concept:id]] / [[concept:id|label]] / [[card:key]] hyperlink markup
// embedded in translated body text. Used by both WikiText.tsx (renders real <Link>s, for normal
// page navigation) and InGameLookup.tsx (renders clickable buttons that swap an inline panel
// instead of navigating, so a card lookup mid-walkthrough never leaves the wizard).
const TOKEN_RE = /\[\[(concept|card):([a-z0-9-]+)(?:\|([^\]]+))?\]\]/gi;

export type WikiTextToken =
  | { type: "text"; value: string }
  | { type: "link"; kind: "concept" | "card"; id: string; label?: string };

export function parseWikiText(text: string): WikiTextToken[] {
  const tokens: WikiTextToken[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  TOKEN_RE.lastIndex = 0;
  while ((match = TOKEN_RE.exec(text))) {
    const [full, kind, id, label] = match;
    if (match.index > lastIndex) tokens.push({ type: "text", value: text.slice(lastIndex, match.index) });
    tokens.push({ type: "link", kind: kind.toLowerCase() as "concept" | "card", id, label });
    lastIndex = match.index + full.length;
  }
  if (lastIndex < text.length) tokens.push({ type: "text", value: text.slice(lastIndex) });
  return tokens;
}
