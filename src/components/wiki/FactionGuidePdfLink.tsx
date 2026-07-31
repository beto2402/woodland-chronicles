"use client";

import { useEffect, useState } from "react";

const LANGUAGE_KEY = "wiki:root:language";

// Renders a download link for the third-party (BGG) faction guide PDF, but only when both are
// true: the visitor's stored wiki language is Spanish (the PDF is Spanish-only), and the server
// already confirmed `hasAccess` — a manually-granted, auth-gated flag (see
// api/wiki/[gameId]/facciones/[factionId]/guide-pdf), since we don't have rights to broadcast
// this document to every visitor.
export function FactionGuidePdfLink({
  gameId,
  factionId,
  hasAccess,
}: {
  gameId: string;
  factionId: string;
  hasAccess: boolean;
}) {
  const [showForLanguage, setShowForLanguage] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(LANGUAGE_KEY);
    setShowForLanguage(stored === "es" || stored === null); // "es" is the only language today
  }, []);

  if (!hasAccess || !showForLanguage) return null;

  return (
    <a
      className="wiki-pdf-link"
      href={`/api/wiki/${gameId}/facciones/${factionId}/guide-pdf`}
      target="_blank"
      rel="noopener noreferrer"
    >
      📄 Guía completa (PDF)
    </a>
  );
}
