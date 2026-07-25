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

---

### `src/app/g/[joinCode]/page.tsx` — Group page (server component)
Looks up the group by join code. Returns 404 if not found. Renders `<GroupLeaderboard>`.

---

### `src/app/g/[joinCode]/hall-of-fame/page.tsx` — Hall of Fame page (server component)
Looks up the group by join code. Returns 404 if not found. Renders `<HallOfFame>`.

### `src/app/g/[joinCode]/hall-of-fame/HallOfFame.tsx` — Hall of Fame (client component)
Fetches `/hall-of-fame`, `/games`, `/roster`, and `/api/me` in one batch on mount; shows a spinner until they resolve (the "+ Record a Moment" button only appears once `me`+`roster` load and confirm membership). Sections, in order:
- **Moments** — cards (kind badge, title, game context, optional screenshot, description); creator can delete. Each moment has a `kind`: 🏅 Glory (smart play) or 🤡 Tard (dumb moment), chosen in the record form and shown as a colored left border + badge.
- **Womp Womp Hall** — per-player count of games lost with exactly 29 points (derived from scores); count shown below the name, sorted high→low.
- **Records** — Blowout (biggest 1st/2nd gap, derived from scores) and Biggest Crackhead (most games played).

Members get a "+ Record a Moment" form: pick a game, title, description, optional image. The image is uploaded via `POST /api/upload` first, then its URL is saved with the moment. Reached via the "🏛 Hall of Fame" link on the group page hero.

---

### `src/app/g/[joinCode]/GroupLeaderboard.tsx` — Main leaderboard (client component)
The core UI. Fetches roster and games from API on load.

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
- Delete button visible to: the user who logged it OR group ADMINs. Clicking it swaps the trash icon for an inline "Delete? Yes / No" confirmation (tracked by `confirmDeleteId`) — deletion only happens on "Yes", guarding against accidental clicks
- Log Game form (members only):
  - Date, Virtual/In-Person toggle, Hirelings toggle
  - Victory type: Score / Domination / Coalition
  - Player rows: name (from roster), faction, optional score (VP) input, winner checkbox
  - Scores are all-or-none: client blocks submit if some rows have a score and others don't (server enforces the same). Scores show in the battle log next to each player (`name · score`).
  - Leaderboard has an **Avg** column = mean score across that player's scored games (`–` if they have none).
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
  - **delete** control (trash icon) vertically centered on the far right (`align-self: center`).
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
| `src/lib/elo.ts` | Pure ELO math + DB recalculation. Exports: `computeEloDeltas`, `replayGames`, `recalculateGroupElo`, `recalculateGlobalElo`. No React dependency. |
| `src/lib/screenshot-scan.ts` | OCR pipeline for Root end-game screenshots. Exports `analyzeScreenshot(file)` → `{ names, factions }` and `levenshtein(a, b)`. Uses Tesseract.js v7 (lazy-loaded). No React dependency. |

## Types

### `src/types/next-auth.d.ts`
Extends the NextAuth `Session` type to include `session.user.id` (populated by the session callback in `auth.ts`).
