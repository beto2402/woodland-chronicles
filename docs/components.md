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

**Faction icons:** every place a faction is shown (combobox + selected value, leaderboard faction tags, top-faction stat card, battle-log winner/player chips) renders the `FactionIcon` component — character art from `public/art/icons/<factionId>.webp` (64×64 trimmed/centered icons derived from the full-size `public/art/character-<factionId>.png`). These replaced the old emoji symbols. The `symbol` field still exists on each `FACTIONS` entry but is no longer rendered.
  - Coalition validation: enforces Vagabond in game + Vagabond is winner

**Leaderboard panel:**
- Aggregates wins/games per player
- Sorted by win rate (wins ÷ games played)

**Key derived state:**
- `isMember`: `!!me && roster.some(r => r.player.claimedBy?.id === me.id)`
- `myPlayer`: the roster entry whose `claimedBy.id` matches the current user

---

## Supporting files

### `src/app/Providers.tsx`
Client component. Wraps the app in `<SessionProvider>` (required for `useSession` to work anywhere in the tree).

### `src/app/layout.tsx`
Root layout. Wraps children in `<Providers>`. Loads global CSS.

---

## Lib

| File | Purpose |
|---|---|
| `src/lib/auth.ts` | NextAuth config: Google provider, PrismaAdapter, session callback that adds `user.id` |
| `src/lib/prisma.ts` | Singleton PrismaClient (prevents multiple instances during hot reload) |
| `src/lib/nanoid.ts` | 8-char alphanumeric join code generator using `crypto.getRandomValues` |

## Types

### `src/types/next-auth.d.ts`
Extends the NextAuth `Session` type to include `session.user.id` (populated by the session callback in `auth.ts`).
