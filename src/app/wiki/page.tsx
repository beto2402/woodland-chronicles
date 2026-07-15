import { WikiEntry } from "@/components/wiki/WikiEntry";

// Only one game exists today (see SUPPORTED_GAMES in src/lib/wiki/loaders.ts). WikiEntry checks
// for a previously-chosen display language and redirects straight to /wiki/root if found,
// otherwise shows a one-time language picker first.
export default function WikiRootPage() {
  return <WikiEntry />;
}
