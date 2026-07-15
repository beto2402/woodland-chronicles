"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { DISPLAY_LANGUAGES, LANGUAGE_NAMES } from "../../../game-content/root/config";
import { wikiStyles } from "./wikiStyles";

const LANGUAGE_KEY = "wiki:root:language";

// Entry point for /wiki: the first time a visitor arrives (no stored language choice), shows a
// picker before continuing — real today only in the sense that it lists whatever's in
// DISPLAY_LANGUAGES (just Spanish for now), but sets up the pattern for when a second language
// exists rather than hardcoding straight through to /wiki/root. Once a language is chosen (or a
// prior choice is found), it's remembered and this screen is skipped on future visits.
export function WikiEntry() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(LANGUAGE_KEY);
    if (stored && DISPLAY_LANGUAGES.includes(stored)) {
      router.replace("/wiki/root");
    } else {
      setChecking(false);
    }
  }, [router]);

  function choose(lang: string) {
    localStorage.setItem(LANGUAGE_KEY, lang);
    router.push("/wiki/root");
  }

  if (checking) return null;

  return (
    <>
      <style>{wikiStyles}</style>
      <div className="wiki-page">
        <div className="wiki-container">
          <div className="wiki-title">How to play Root</div>
          <div className="wiki-subtitle">Choose a language / Elige un idioma</div>
          <div className="wiki-language-picker">
            {DISPLAY_LANGUAGES.map((lang) => (
              <button key={lang} type="button" className="wiki-language-option" onClick={() => choose(lang)}>
                {LANGUAGE_NAMES[lang] ?? lang}
              </button>
            ))}
          </div>
          <p className="wiki-language-note">More languages coming soon — más idiomas próximamente.</p>
        </div>
      </div>
    </>
  );
}
