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
- Delete button visible to: the user who logged it OR group ADMINs. Clicking it swaps the ✕ for an inline "Delete? Yes / No" confirmation (tracked by `confirmDeleteId`) — deletion only happens on "Yes", guarding against accidental clicks
- Log Game form (members only):
  - Date, Virtual/In-Person toggle, Hirelings toggle
  - Victory type: Score / Domination / Coalition
  - Player rows: name (from roster), faction, winner checkbox
  - Faction field is a type-to-filter combobox (`FactionSelect`): focus shows the full list, typing filters by name/id, arrow keys + Enter to select, click-outside/Escape to close
  - **Screenshot scan** ("📷 Scan screenshot to prefill" button): uses Tesseract.js (lazy-loaded ~15 MB, cached after first use) to OCR the image. Clusters all detected text by Y centroid (±20 px tolerance) and picks the cluster in the bottom 40% of the image that spans the widest horizontal range — that's the player names row, since all names appear side-by-side in the Root end-game screen. Names are sorted left-to-right. For each name, the banner color is sampled just below the text bounding box and matched to the nearest `FACTION_REF_COLORS` entry (Euclidean RGB distance, deduplicating across players). Pre-fills player rows with: roster match if name found case-insensitively, otherwise raw OCR text; plus matched faction. `scanning` state disables the button and shows "⏳ Scanning…" while OCR runs.

**Faction icons:** every place a faction is shown (combobox + selected value, leaderboard faction tags, top-faction stat card, battle-log winner/player chips) renders the `FactionIcon` component — character art from `public/art/icons/<factionId>.webp` (64×64 trimmed/centered icons derived from the full-size `public/art/character-<factionId>.png`). These replaced the old emoji symbols. The `symbol` field still exists on each `FACTIONS` entry but is no longer rendered.
  - Coalition validation: enforces Vagabond in game + Vagabond is winner

**Leaderboard panel:**
- Aggregates wins, games, faction set, and per-faction detail (games + wins per faction) from all game records
- Sorted by `groupElo` descending (highest ELO first)
- Displays: rank, player name + faction count with detail button, ELO (gold), wins, games + win%

**Faction Detail Modal** (`factionModal` state — player name or null):
- Opened by clicking "see details" under a player's name in the leaderboard
- Closed by clicking backdrop, the ✕ button, or pressing Escape
- Full-screen fixed backdrop + centered card (`width: min(480px, 100%)`, scrollable up to `calc(100vh - 64px)`)
- Lists each faction the player has played, sorted by games played descending: icon + full name + "XW / YG" + win rate %
- All data is pre-computed from in-memory game state; opens instantly with no fetch

**Battle Log (paginated):**
- Games listed newest-first
- Paginated: 5 / 10 / 15 per page, configurable via page-size selector (page resets to 0 on change)
- Shows page X of Y, element range (e.g. "1–5 of 18 battles"), Prev/Next buttons
- `safePage = Math.min(gamesPage, totalPages - 1)` guards against out-of-range when page size changes

**Page layout order (top to bottom):**
1. Stats cards (Games Played, Denizens, Top Faction) — only shown when games exist
2. Join banner — only when signed in but not a member
3. Roster management — only when `isMember`; collapsed behind "manage" toggle by default
4. "Log a Battle" toggle button — only when `isMember`
5. Log Battle form (when open)
6. Standings (ELO leaderboard)
7. Battle Log + pagination

**Key derived state:**
- `isMember`: `!!me && roster.some(r => r.player.claimedBy?.id === me.id)`
- `rosterElo`: map from lowercased player name → `GroupPlayer.groupElo`
- `playerStats`: per-player `{ wins, games, factions: Set<string>, factionDetail: Record<factionId, {games, wins}> }`
- `leaderboard`: `playerStats` values with ELO attached, sorted by `groupElo` desc

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
- `FACTIONS` — array of 14 faction objects `{ id, name, color, textColor, symbol }`
- `FACTION_MAP` — `Record<id, faction>` for O(1) lookup
- `getFactionStyle(id)` — inline style `{ background, color, borderColor }` for faction-colored chips
- `FactionIcon({ id, size })` — renders `<img src="/art/icons/<id>.webp" />` at given size (default 20px)

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
