import { redirect } from "next/navigation";

// Only one game exists today (see SUPPORTED_GAMES in src/lib/wiki/loaders.ts), so the wiki
// root just goes straight to it rather than showing a real game-picker UI.
export default function WikiRootPage() {
  redirect("/wiki/root");
}
