# Pages & Components

## Pages

### `src/app/page.tsx` — Home page
Client component. Entry point for all users.

**Behavior by auth state:**
- **Loading / not signed in:** Shows Google sign-in button + join-by-code input (no auth needed to enter a group by code)
- **Signed in, fetching groups:** Shows loading screen (avoids flash)
- **Signed in, 1 group:** Auto-redirects to `/g/[joinCode]`
- **Signed in, 2+ groups:** Shows group picker list, then create/join forms below
- **Signed in, 0 groups:** Shows create group form + join-by-code

**Key state:** `groups` (null = loading, [] = none, [...] = fetched)

A "📖 Cómo jugar Root" link to `/wiki` is shown in both the signed-out and signed-in states.

---

### `src/app/g/[joinCode]/page.tsx` — Group page (server component)
Looks up the group by join code. Returns 404 if not found. Renders `<GroupLeaderboard>`.

---

### `src/app/g/[joinCode]/hall-of-fame/page.tsx` — Hall of Fame page (server component)
Looks up the group by join code. Returns 404 if not found. Renders `<HallOfFame>`.

---

### `src/app/quinielas/page.tsx` — not part of this app
Belongs to the separate hidden Quinielas feature — see **`docs/quinielas.md`**, not this file.

---

### `src/app/admin/seasons/page.tsx` + `AdminSeasonPanel.tsx` — Season management (admin)
Server page gated by `requireAdmin()`, same 404-not-redirect pattern as `/admin`. Linked from
`/admin` ("Gestionar temporadas →"); not linked from anywhere else. Renders
`AdminSeasonPanel.tsx` (client component, visual style matches `AdminUserAccess.tsx`), which
fetches its own data from `GET /api/admin/season` rather than receiving server props:

- **Current season card**: name, start date, computed rollover date (`computeDueDate` from
  `src/lib/season-core.ts`), days remaining.
- **Cadence input**: on save, computes the current vs. candidate due date client-side and shows a
  confirmation modal ("Termina actualmente" vs. "Con este cambio") before calling
  `PATCH /api/admin/season` — warns explicitly if the change means the season ends immediately.
- **"Terminar temporada ahora"**: confirm-modal-gated call to `POST /api/admin/season/rollover`.
- **History table**: past seasons (name, date range, cadence), read-only.

See `docs/api.md` (Admin section) for the routes, and `docs/schema.md#season` for the model.

---

### `src/app/g/[joinCode]/hall-of-fame/HallOfFame.tsx` — Hall of Fame (client component)
Fetches `/hall-of-fame`, `/games`, `/roster`, and `/api/me` in one batch on mount; shows a spinner until they resolve (the "+ Record a Moment" button only appears once `me`+`roster` load and confirm membership). Sections, in order:
Fetches `/hall-of-fame`, `/games`, `/roster`, and `/api/me` in one batch on mount; shows a spinner until they resolve (the "+ Record a Moment" button only appears once `me`+`roster` load and confirm membership). Sections, in order:
- **Moments** — cards (kind badge, title, game context, optional screenshot, description); creator can delete. Each moment has a `kind`: 🏅 Glory (smart play) or 🤡 Tard (dumb moment), chosen in the record form and shown as a colored left border + badge.
- **Womp Womp Hall** — per-player count of games lost with exactly 29 points (derived from scores); count shown below the name, sorted high→low.
- **Records** — Blowout (biggest 1st/2nd gap, derived from scores) and Biggest Crackhead (most games played).

Members get a "+ Record a Moment" form: pick a game, title, description, optional image. The image is uploaded via `POST /api/upload` first, then its URL is saved with the moment. Reached via the "🏛 Hall of Fame" link on the group page hero.

---

### `src/app/g/[joinCode]/GroupLeaderboard.tsx` — Main leaderboard (client component)
The core UI. Fetches roster, games, and seasons from API on load.

**Season selector** (top of page, above the Chronicle stats): a dropdown of "All time" + every
`Season` (newest first, current one marked). Selecting a season computes `scopedGames` — `games`
filtered to that season's half-open `[startDate, endDate)` window on `game.date` — and every
downstream computation on the page (Chronicle stats, Standings, faction rankings, Battle Log +
its pagination) is derived from `scopedGames` instead of `games`. "All time" (`selectedSeasonId
=== "all"`) is `scopedGames === games` — behavior is unchanged from before seasons existed. ELO
for a specific season is **not** the persisted `groupElo`: it's recomputed on the fly via
`replayGames` (imported from `src/lib/elo-core.ts`, safe for client use since it has no
server-only dependencies) over just `scopedGames`, restarted fresh from 1000 — bridged from
`playerId`-keyed ratings back to the name-keyed `leaderboard`/`playerStats` via a small
`playerIdByLowerName` lookup built from the roster. `provisional` status is naturally
season-scoped too, since it's derived from `playerStats.games`, itself built from `scopedGames`.

The hero section has both a "🏛 Hall of Fame" link and a "📖 Cómo jugar Root" link (to `/wiki`).

**Auth bar (hero section):**
- Signed out → Sign in button
- Signed in, not member → Sign out button + Join banner
- Signed in, member → Player name badge + Sign out button

**Roster panel** (members only — the "Roster" heading and "manage" toggle render only when `isMember` is true; non-members and signed-out visitors don't see it):
- Shows all players in the group
- "you" badge on claimed player matching the signed-in user
- Claim button on unclaimed players (only if user has no claimed player yet)
- Unlink button on your own claimed player
- "claimed" badge on players claimed by others
- Add/remove roster controls (membership is also enforced server-side on the roster POST/DELETE routes)

**Game log panel:**
- Lists all games newest first
- Delete and Edit VPs buttons render for every game regardless of viewer — permission (must be the user who logged it OR a group ADMIN) is enforced server-side (403), not hidden client-side. Clicking delete swaps the trash icon for an inline "Delete? Yes / No" confirmation (tracked by `confirmDeleteId`) — deletion only happens on "Yes", guarding against accidental clicks
- **Edit VPs** (pencil icon, `editScoresId` state): opens an inline panel (`.edit-scores-panel`, spans the full card width) with one VP input per player, prefilled from their current `score` (blank if `null`). Save calls `PATCH /api/groups/[joinCode]/games/[id]` with `{ players: [{ id, score }] }`; same all-or-none client-side check as the log form. On success the returned game replaces the matching entry in `games` state — since the Avg column (below) is derived live from `games` on every render, no separate recalculation step is needed. Used both to fix a wrong VP and to backfill VPs on older games that predate the scoring feature (those have `score: null` on every player, not `0` — left unbackfilled rather than defaulted, so they correctly don't count toward anyone's average until edited in).
- Log Game form (members only):
  - Date, Virtual/In-Person toggle, Hirelings toggle
  - Victory type: Score / Domination / Coalition
  - Player rows: name (from roster), faction, optional score (VP) input, winner checkbox
  - Scores are all-or-none: client blocks submit if some rows have a score and others don't (server enforces the same). Scores show in the battle log next to each player (`name · score`).
  - Leaderboard has an **Avg** column = mean score across that player's scored games (`–` if they have none) — games with `score: null` are excluded from both the sum and the count, not treated as a 0.
  - Faction field is a type-to-filter combobox (`FactionSelect`): focus shows the full list, typing filters by name/id, arrow keys + Enter to select, click-outside/Escape to close
  - **Screenshot scan** ("📷 Scan screenshot to prefill" button): uses Tesseract.js (lazy-loaded ~15 MB, cached after first use) to OCR the image. Clusters all detected text by Y centroid (±20 px tolerance) and picks the cluster in the bottom 40% of the image that spans the widest horizontal range — that's the player names row, since all names appear side-by-side in the Root end-game screen. Names are sorted left-to-right. For each name, the banner color is sampled just below the text bounding box and matched to the nearest `FACTION_REF_COLORS` entry (Euclidean RGB distance, deduplicating across players). Pre-fills player rows with: roster match if name found case-insensitively, otherwise raw OCR text; plus matched faction. `scanning` state disables the button and shows "⏳ Scanning…" while OCR runs.

**Faction icons:** every place a faction is shown (combobox + selected value, leaderboard faction tags, top-faction stat card, battle-log winner/player chips) renders the `FactionIcon` component — character art from `public/art/icons/<factionId>.webp` (64×64 trimmed/centered icons derived from the full-size `public/art/character-<factionId>.png`). These replaced the old emoji symbols. The `symbol` field still exists on each `FACTIONS` entry but is no longer rendered.
  - Coalition validation: enforces Vagabond in game + Vagabond is winner

**Leaderboard panel:**
- Aggregates wins, games, faction set, and per-faction detail (games + wins per faction) from all game records
- Sorted by `groupElo` descending (highest ELO first)
- Displays: rank, player name (clickable — opens the Player Profile Modal) + faction count with detail button, ELO (gold), wins, games + win%

**Faction Detail Modal** (`factionModal` state — player name or null):
- Opened by clicking "see details" under a player's name in the leaderboard
- Closed by clicking backdrop, the ✕ button, or pressing Escape
- Full-screen fixed backdrop + centered card (`width: min(480px, 100%)`, scrollable up to `calc(100vh - 64px)`)
- Lists each faction the player has played, sorted by games played descending: icon + full name + "XW / YG" + win rate %
- All data is pre-computed from in-memory game state; opens instantly with no fetch

**Player Profile Modal** (`profileName` state — player name or null):
- Opened by clicking a player's name in the leaderboard standings; closed via backdrop, ✕, or Escape (shares the Escape handler with the Faction Detail Modal). Reuses the `faction-modal` backdrop/card styles.
- **Mobile scroll handling** (shared by both modals): while open, `document.body` overflow is locked (in the same effect as the Escape handler) so the page can't scroll behind it; the card uses `max-height: 100dvh` (dynamic viewport, with a `100vh` fallback) and `overscroll-behavior: contain`, and the ✕ button is `position: sticky` so it stays reachable while the card's own content scrolls.
- **Group-scoped**: all stats come from this group's games + `groupElo` — no fetch, computed from the in-memory `leaderboard` entry (and `roster` for the avatar).
- **Header**: avatar + name + sub-line. Avatar priority: claimed user's Google image (`player.claimedBy.image`, `referrerPolicy="no-referrer"`) → the player's **most-played faction portrait** (`FactionPortrait`) → a generic SVG silhouette placeholder (future custom avatars slot in here). Sub-line shows the Google display name, or "Unclaimed denizen".
- **Stat grid** (6 cells): Games Played, Win Rate (+ win count), ELO (gold, with `~`/"prov." when `games < PROVISIONAL_THRESHOLD`), Most Played faction, Most Dominant faction, Most Noob faction. The three faction cells render `FactionPortrait` thumbnails.
- **Desktop scaling** (`@media (min-width: 760px)`): the card widens (~660px) and the whole profile scales up — larger avatar/name, the stat grid goes from 2 to 3 columns, bigger portraits/fonts, and a larger donut.
  - "Most Dominant" / "Most Noob" = highest / lowest **win rate among factions played 2+ times** (avoids 1-game flukes). Dominant needs ≥1 eligible faction, Noob needs ≥2; otherwise a "Need 2+ games…" / "Not enough variety yet" hint shows.
- **Faction Distribution donut**: hand-rolled SVG donut (no chart library) — one `<circle>` arc per faction via `stroke-dasharray`/`stroke-dashoffset`, colored by `FACTION_MAP[id].color`, segments sized by games played and sorted descending. Center shows total games. Accompanied by a legend (color dot + name + "games · %").

**Battle Log (paginated):**
- Games listed newest-first
- Each card (`.game-card`) is a CSS **size container** (`container-type: inline-size`); its `.game-body` grid adapts to the card's own width (which differs between the full-width mobile column and the half-width desktop column). Grid areas: `winner | losers | delete`, plus `footer`.
  - **Wide cards**: two-row grid where the footer (`footer` area) tucks under the winner in the left column while losers + delete span both rows; the `1fr` top row absorbs the slack so the footer sits at the bottom, filling the space the taller losers column creates.
  - **Narrow cards** (`@container (max-width: 480px)`): the footer drops to its own full-width row beneath everything, so its tags never overflow the cramped winner column.
  - **winner** (`.game-winner`, a flex column): a large 72px `FactionIcon` beside a text column stacking the "Victor"/"Coalition" label, player name, and faction name. Tops align with the "Losers" label.
  - **other players**: a single vertical column of borderless rows under a "Losers" label (`.game-players` → `.player-chip`: a small 26px `FactionPortrait` + name, no box/border).
  - **delete** grid area (`.game-actions`, a small flex column) holds the edit-VPs pencil button above the trash/confirm-delete control, vertically centered on the far right.
  - When `editScoresId` matches the card, `.edit-scores-panel` renders below the footer, spanning the full grid width (`grid-column: 1 / -1`) regardless of the wide/narrow layout.
  - Footer contents (one line, `.footer-date` + `.footer-tag` variants): date, format tag (🖥️ Virtual / 🎲 In Person), victory type, and a Hirelings tag when applicable — each tag carries an emoji so they share height.
- Paginated: 5 / 10 / 15 per page, configurable via page-size selector (page resets to 0 on change)
- Shows page X of Y, element range (e.g. "1–5 of 18 battles"), Prev/Next buttons
- `safePage = Math.min(gamesPage, totalPages - 1)` guards against out-of-range when page size changes

**Page layout order (top to bottom):**
1. Stats cards (Games Played, Denizens, Top Faction) — only shown when games exist; the Top Faction card gets the full flashy treatment (`.shimmer-card`: animated gold border, glint, pulsing glow — same as the loser banner). The card shows the faction(s) with the best **win rate** — matching the rankings modal's #1. On a tie it displays **all tied factions, separated by a long "/"** (`topFactionIds` = every faction whose rate equals the top rate, compared via cross-multiplication to dodge float-equality issues like 1/2 === 3/6), and the label becomes "Top Factions". The Top Faction card is a button (`showFactionRanking` state) that opens the **Faction Rankings modal** — all played factions ranked by win rate (`factionRanking`: per-faction `{games, wins, rate}`, sorted by rate desc with games as tiebreak), each row showing position, `FactionIcon`, name, win %, and `W/G`. Note the card itself still highlights the faction with the most *wins* (`topFactionId`), while the modal ranks by *rate*. Shares the `.faction-modal` styles, Escape handler, and body-scroll lock. Followed by two award banners (each only with 2+ players): the **"Least Retarded" award** (`.champ-award`, understated calm-gold styling) for the highest-`groupElo` **qualified** player (`topPlayer` = first `qualified` entry), then the **"Stupid Ass Nigga Award" award** (`.loser-award`, very flashy animated golden banner) for the lowest-`groupElo` **qualified** player (`biggestLoser` = last `qualified` entry). Both need 2+ qualified players. All animations respect `prefers-reduced-motion`.
2. Join banner — only when signed in but not a member
3. Roster management — only when `isMember`; collapsed behind "manage" toggle by default
4. "Log a Battle" toggle button — only when `isMember`
5. Log Battle form (when open)
6. Standings (ELO leaderboard)
7. Battle Log + pagination

Standings and Battle Log are wrapped in a `.main-grid`: a single stacked column on mobile, switching to a two-column side-by-side layout at `min-width: 900px` (container also widens to 1180px) so more is visible without scrolling.

**Key derived state:**
- `isMember`: `!!me && roster.some(r => r.player.claimedBy?.id === me.id)`
- `rosterElo`: map from lowercased player name → `GroupPlayer.groupElo`
- `playerStats`: per-player `{ wins, games, factions: Set<string>, factionDetail: Record<factionId, {games, wins}> }`
- `leaderboard`: `playerStats` values with ELO + `provisional` (`games < PROVISIONAL_THRESHOLD`, currently 5) attached. **Sort: qualified players (≥ threshold) always rank above provisional ones; within each tier, by `groupElo` desc.** So a low-sample player (e.g. 2/2 = 100%) can't hold a top spot.
- `qualified`: leaderboard entries with `provisional === false`. The "Least Retarded"/"Stupid Ass Nigga" highlights and the `top-player` row styling are drawn from `qualified` (need 2+), so provisional players are never crowned or shamed.

**CSS approach:** All styles live in a single `styles` string constant rendered via `<style>{styles}</style>`. No CSS modules. `html { font-size: 114% }` bumps the entire type scale up ~14%.

---

## Wiki (`src/app/wiki/`)

In-app "how to play" guide. Displayed in Spanish, searchable in English or Spanish. Scoped by
`gameId` in both routes and data from day one (`SUPPORTED_GAMES = ["root"]` today) so a second
game later is additive, not a rearchitecture — see `game-content/root/` below. Almost no API
routes; everything is read directly via `src/lib/wiki/loaders.ts` (static content) or Prisma
(tips) — the one exception is the gated guide-PDF route, see `FactionGuidePdfLink.tsx` below and
`docs/api.md`.

**Routes** (all under `src/app/wiki/[gameId]/`, server components, 404 if `gameId` isn't in
`SUPPORTED_GAMES`):
- `src/app/wiki/page.tsx` — renders `WikiEntry`, which redirects straight to `/wiki/root` if a
  wiki language was already chosen (`localStorage["wiki:root:language"]`), otherwise shows a
  one-time language picker first (only Spanish exists today, so it's a single-button picker —
  sets up the pattern for a second language rather than hardcoding straight through)
- `[gameId]/page.tsx` — search + links to the three sections below
- `[gameId]/conceptos/page.tsx` + `[id]/page.tsx` — glossary list + detail
- `[gameId]/cartas/page.tsx` + `[id]/page.tsx` — card list + detail, with a beginner-mode
  "how to craft this, per faction" section
- `[gameId]/facciones/page.tsx` + `[factionId]/page.tsx` — faction grid + overview (reuses
  `FactionPortrait`/`FactionIcon` from `FactionIcon.tsx`); 404 if `factionId` isn't a real faction
- `[gameId]/facciones/[factionId]/jugar/page.tsx` — fetches the faction's static turn-guide plus
  its DB `Tip`s, renders `PlayGuideWizard`

**Components** (`src/components/wiki/`):
- `WikiText.tsx` — renders `[[concept:id]]` / `[[card:key]]` (optionally `|custom label`) markup
  embedded in translated body text as internal links. ~25-line regex parser, no markdown library.
- `WikiSearch.tsx` — type-to-filter combobox modeled on `FactionSelect.tsx`; matches every
  populated language's name/aliases (not a hardcoded English/Spanish pair), merging concepts +
  cards + the 14 `FACTIONS` + individual guide actions (see `search-index.ts` below).
- `PlayGuideWizard.tsx` (client) — two-tier navigation over a faction's `GuideBlock`s (see
  below): "Fase ◀◀/▶▶" jumps straight to the next/previous phase's first block, "Acción ←/→"
  steps within the current phase. Position (`phaseIdx`/`actionIdx` per faction) and beginner mode
  persist to `localStorage` (`wiki:${gameId}:${factionId}:progress`, `wiki:beginnerMode`) so a
  visitor resumes where they left off. A `DrivenActionBlock` screen shows its explanatory text
  plus a collapsible "¿Qué pasa si no puedes completarla?" panel listing `onFailureBlocks` inline.
  If the guide has `variants` (e.g. Vagabond's character, Eyrie's leader), a one-time picker
  (defaults to the first variant) appears above the phase pills, persisted to
  `wiki:${gameId}:${factionId}:variant`; the chosen variant's `actionOverrides` are merged over
  `guide.actions` before rendering. Matching `Tip`s show inline per screen when beginner mode is on.
  On mount, a `?action=<actionId>` query param (set by a `WikiSearch` action result) jumps
  straight to that action's block, overriding whatever `localStorage` progress would otherwise
  restore; an action nested in a `DrivenActionBlock`'s `onFailureBlocks` lands on the parent
  driven screen instead, since failure steps aren't independently navigable. Its internal
  `ActionCard` helper also shows an action's `en` title next to the `es` one when present (e.g.
  Lord of the Hundreds' Moods), so the searchable English name is visible where the action is
  actually shown, not just in search metadata.
- `CraftingExplanation.tsx` (client) — beginner-mode-only block on a card's detail page; reads
  the same `localStorage` flag `PlayGuideWizard` writes, and phrases the card's
  `crafting_requirements` in each known faction's own terms (see `faction-crafting.ts`).
- `InGameLookup.tsx` (client) — embedded card search rendered at the top of the "jugar" wizard,
  so looking up a card mid-walkthrough never navigates away. Filters `getAllCards(gameId)` by
  English/Spanish name; picking a result shows it inline (name, `crafting_requirements`, body).
  Cross-references inside that body (`[[card:x]]`/`[[concept:x]]`) are rendered as buttons (not
  `<Link>`s) that swap the inline panel to the new target instead of navigating, so chained
  lookups also stay inside the wizard. Shares its markup parser (`parseWikiText.ts`) with
  `WikiText.tsx` rather than duplicating the regex.
- `wikiStyles.ts` — one shared `styles` template-literal string (same "no CSS modules, no
  Tailwind" convention as the rest of the app) imported by every wiki page, instead of
  duplicating the ruleset per page.
- `FactionGuidePdfLink.tsx` (client) — renders a download link to a faction's third-party (BGG)
  guide PDF, but only when both hold: the visitor's stored wiki language is Spanish (checked
  client-side, since it's `localStorage`), and the server-resolved `hasAccess` prop is `true`
  (checked server-side in `[factionId]/page.tsx` via `auth()` + `User.wikiPdfAccess`, since that's
  an auth-gated DB flag, not something to trust from the client). See `docs/api.md` for the route
  it links to and why this content is gated at all (redistribution rights). Access is granted per
  user from `/admin` (`src/app/admin/`, see `docs/api.md`) — a single unlinked page, gated by
  `requireAdmin()` (`src/lib/admin.ts`, checks `User.isAdmin`), not part of the wiki itself.

**Lib** (`src/lib/wiki/`):
- `types.ts` — `LanguageCode` (plain string, not a fixed union), `Concept`, `CardEntry`,
  `Action`, `ActionBlock`, `DrivenActionBlock`, `GuideBlock`, `FactionVariant`, `FactionTurnGuide`,
  `FactionCraftingInfo`. Every translatable field is a `Partial<Record<LanguageCode, ...>>` map,
  not fixed `nameEn`/`nameEs`-style fields, so adding a language is new content, not a type change.
- `parseWikiText.ts` — the `[[concept:id]]`/`[[card:key]]` regex parser shared by `WikiText.tsx`
  (real navigation) and `InGameLookup.tsx` (inline panel swap), so both stay in sync.
- `loaders.ts` — `gameId`-scoped getters (`getAllConcepts`, `getConcept`, `getAllCards`,
  `getCard`, `getFactionGuide`, `findBlockForAction`, `getFactionGuidePdfBlobPath`) reading the
  JSON under `game-content/<gameId>/`. `getFactionGuidePdfBlobPath` returns the Vercel Blob
  pathname for a faction's third-party guide PDF, or `null` if that faction isn't covered by it
  (only factions through the Marauder expansion have one) — used by both the gated API route and
  the overview page to decide whether to even check access.
  Card data (`translations/base-deck.json`) is keyed by base-language (English) card name and
  normalized here: `"esp"` → `"es"`, and any `"(EN unverified)"` planning-time flag in a key is
  stripped into a clean `nameEn` + `nameEnUnverified` boolean + a URL-safe `id` slug, so it never
  leaks into routes or search. `findBlockForAction` also searches each `DrivenActionBlock`'s
  `onFailureBlocks`, so a tip can target a Turmoil-style consequence step too.
- `search-index.ts` — `buildSearchIndex(gameId)` / `searchIndex(entries, query)`: merges
  concepts + cards + factions + guide actions into one flat array, substring-matched against
  every populated language's name/aliases. An `Action` only becomes searchable once its
  `translations` includes an `"en"` title (most actions are Spanish-only prose and would just be
  noise) — e.g. Lord of the Hundreds' 8 Moods carry `en` titles ("Mood: Bitter", etc.) purely so
  they're findable by their English card name; that title is never displayed, since
  `DISPLAY_LANGUAGES` is `["es"]`. An action's search result links to
  `.../jugar?action=<actionId>`, which `PlayGuideWizard` reads to jump straight to it.
- `faction-crafting.ts` — `FactionCraftingInfo` per faction (which piece it activates to craft,
  how it's obtained) for the beginner-mode card explanation. Covers all 14 factions, every one
  with a complete turn-guide today: Marquise (Workshop), Alliance (Sympathy token), Eyrie (Roost),
  Vagabond/Vagabond 2nd (bespoke — exhausts Hammer items directly, no board piece, no once/turn
  cap), Riverfolk (bespoke — no piece at all, commits funds instead), Lizard Cult (Gardens
  matching the *current* Outcast suit), Underground Duchy (Citadel/Market), Keepers in Iron
  (Waystation), Twilight Council (Assembly), Knaves of the Deepwood (bespoke — Acting Captain or
  acclaim, no fixed piece), Lilypad Diaspora (Enclave), Lord of the Hundreds (Stronghold), Corvid
  Conspiracy (plot token).

**Turn-guide data model** — a `FactionTurnGuide.blocks` is a sequence of `GuideBlock`s (a
discriminated union on `kind`), rendered in array order (no separate ordering field):
- `ActionBlock { kind: "action", id, phase, actionIds, repeat }` — `actionIds.length === 1` is a
  mandatory step; `actionIds.length > 1` is a menu the player chooses from. `repeat` is `"once"` |
  `"unlimited"` | `{ max?, maxEs?, bonusEs? }` — `max` for a fixed numeric cap (e.g. Marquise's 3
  actions), `maxEs` free text for a cap that depends on game state (e.g. Alliance's "your number
  of Officers"), `bonusEs` free text for bonus-granting rules (e.g. "+1 per Bird card spent")
  rather than a structured numeric bonus model.
- `DrivenActionBlock { kind: "driven", id, phase, translations, actionIds, onFailureBlocks? }` —
  for a *forced*, not player-chosen, resolution over a dynamic set (so far only the Eyrie's
  Decree: which action fires is dictated by external state, the count isn't a track number, and
  failing triggers a mandatory branching consequence). `actionIds` lists the actions that could
  be forced (for tip-targeting/hyperlinks); the prose in `translations` explains how the forcing
  actually works rather than encoding it as rigid data — modeling it fully would make this a
  rules engine, not a teaching aid. `onFailureBlocks` is a nested `GuideBlock[]` consequence
  chain, rendered as a collapsible panel, not separately-navigable screens.
- A guide's optional `variants: FactionVariant[]` covers a faction-level choice made once per
  playthrough (Vagabond's character card, Eyrie's leader card) — see `PlayGuideWizard.tsx` above.
- A guide's optional `modifiers: ActionModifier[]` is a catalog of toggleable partial tweaks to
  one (or a few) specific actions — `{ id, targetActionId: string | string[], translations: {
  [lang]: { name, appendBody } } }`. Unlike a `FactionVariant`, any number can be active
  simultaneously: each just appends `appendBody` text under its target action(s) rather than
  replacing them. A modifier becomes active either by direct player toggle — a picker renders
  automatically when the guide sets `modifiersMaxActive` (e.g. Knaves draft exactly 3 of 12
  Captain modifiers, each patching a different Item Action) — or by being bundled into a selected
  `FactionVariant` via `variant.modifierIds` (e.g. Eyrie's Charismatic leader auto-applies its
  Recruit-tweak modifier; use `actionOverrides` instead when a variant provides a wholly
  different action, `modifierIds` when it just tweaks an existing one).
- A guide's optional `notes: Partial<Record<LanguageCode, string[]>>` holds cross-faction or
  passive-system callouts that aren't turn actions at all (e.g. Riverfolk's Buying Services
  happens on *another* faction's Birdsong) — rendered on the faction overview page, not the wizard.

Most factions' seemingly-dynamic mechanics (Duchy's Parliament, Keepers' Retinue, Twilight's
Convene Woodfolk) turned out to fit a plain `ActionBlock` once the schema is read as *teaching*
the rule rather than *enforcing* it: e.g. Duchy's Parliament is just `actionIds` listing all 9
possible minister actions with `repeat: { maxEs: "once per sworn minister — you won't usually
have all of them" }`; which ministers are actually sworn is real board state the player already
tracks, not something the wiki needs to simulate. `DrivenActionBlock` stays reserved for the
rarer case of a genuinely *forced* (not player-chosen) action — so far only the Eyrie's Decree.

**Content location**: `game-content/<gameId>/` (sibling to `src/`, `prisma/`, `docs/`) —
`concepts.json`, `translations/base-deck.json`, `faction-guides/*.json`, `faction-names.json`,
`config.ts` (`BASE_LANGUAGE`/`DISPLAY_LANGUAGES`), and `rules-reference/` (my own written notes;
any source rulebook PDF stays local, gitignored, never committed). **Not** documented in
`docs/schema.md`/`api.md` beyond this section — those cover the codebase, not raw game content.

---

## Supporting files

### `src/app/Providers.tsx`
Client component. Wraps the app in `<SessionProvider>` (required for `useSession` to work anywhere in the tree).

### `src/app/layout.tsx`
Root layout. Wraps children in `<Providers>`. Loads global CSS.

---

## Components

### `src/components/FactionIcon.tsx`
Exports:
- `FACTIONS` — array of 14 faction objects `{ id, name, symbol, color, altColor }`. `color` is a
  hand-tuned primary; `altColor` is a second usable shade sampled from each faction's portrait
  background (`public/art/icons/<id>-portrait.jpg`), giving a two-shade range for charts/diagrams.
  (Vagabond's sampled white is nudged to a usable grey; `knaves`/`vagabond2` are absent from the
  source chart, so their `altColor` is a derived lighter shade.)
- `FACTION_MAP` — `Record<id, faction>` for O(1) lookup
- `getFactionStyle(id)` — inline style `{ background, color, borderColor }` for faction-colored chips
- `FactionIcon({ id, size })` — renders `<img src="/art/icons/<id>.webp" />` at given size (default 20px)
- `FactionPortrait({ id, size?, radius?, className? })` — renders the larger cartoon portrait
  `<img src="/art/icons/<id>-portrait.jpg" />` (object-fit cover, rounded). Falls back to `FactionIcon`
  for factions without a portrait. With `className` set, sizing is left to CSS (responsive); otherwise
  `size` sets inline width/height.
- `FACTIONS_WITH_PORTRAIT` — `Set<id>` of the 12 factions that have a portrait (all but knaves, vagabond2)
- Portrait art (`public/art/icons/<id>-portrait.jpg`, 12 of the 14 factions) — cartoon faction
  portraits cropped from `public/art/factions-chart.jpeg`; source of the `altColor` values above

### `src/components/FactionSelect.tsx`
Combobox faction picker. Props: `{ value: string, onChange: (id: string) => void }`.
- Focus opens dropdown with all 14 factions; typing filters by name or id
- Arrow keys + Enter to navigate/select; Escape or click-outside to close
- Renders faction icon + name in both the input display and each dropdown option

---

## Lib

| File | Purpose |
|---|---|
| `src/lib/auth.ts` | NextAuth config: Google provider, PrismaAdapter, session callback that adds `user.id` |
| `src/lib/prisma.ts` | Singleton PrismaClient (prevents multiple instances during hot reload) |
| `src/lib/nanoid.ts` | 8-char alphanumeric join code generator using `crypto.getRandomValues` |
| `src/lib/elo-core.ts` | Pure ELO math: `computeEloDeltas`, `replayGames`, `ELO_STARTING`. No imports at all — safe to import from client components (used by `GroupLeaderboard.tsx` for season-scoped ELO). |
| `src/lib/elo.ts` | Re-exports `elo-core.ts`, plus the Prisma-backed `recalculateGroupElo`/`recalculateGlobalElo`. Server-only (imports `@/lib/prisma`) — don't import from client components. |
| `src/lib/season-core.ts` | Pure season date math: `computeDueDate(startDate, cadenceMonths)`. No imports — used by both `src/lib/seasons.ts` (server) and `AdminSeasonPanel.tsx` (client, for the cadence-change confirmation modal). |
| `src/lib/seasons.ts` | Season rollover logic: `rolloverIfDue()` (used by the cron route and the cadence-edit route) and `forceRolloverNow()` (manual admin override). Server-only (uses `@/lib/prisma`). |
| `src/lib/screenshot-scan.ts` | OCR pipeline for Root end-game screenshots. Exports `analyzeScreenshot(file)` → `{ names, factions }` and `levenshtein(a, b)`. Uses Tesseract.js v7 (lazy-loaded). No React dependency. |

`src/lib/quinielas.ts` is **not part of this app** — see `docs/quinielas.md`.

## Types

### `src/types/next-auth.d.ts`
Extends the NextAuth `Session` type to include `session.user.id` (populated by the session callback in `auth.ts`).
