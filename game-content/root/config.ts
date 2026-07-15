// Language configuration for the Root wiki. BASE_LANGUAGE is the language the source
// material (official cards, rules) is written in — content is keyed by base-language
// names/ids. DISPLAY_LANGUAGES lists which languages the wiki UI actually renders; adding
// a language later means adding to this array plus content, not touching types or search.
export const BASE_LANGUAGE = "en";
export const DISPLAY_LANGUAGES = ["es"];

// Display names for the language picker shown once on first entry to the wiki (see
// src/components/wiki/WikiEntry.tsx) — keyed by the same codes as DISPLAY_LANGUAGES.
export const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  es: "Español",
};
