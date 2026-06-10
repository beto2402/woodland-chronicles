# Root Leaderboard — Handoff to Claude Code

## App requirements

### Core purpose
A leaderboard and game history tracker for the board game **Root** by Leder Games, meant to be shared among a friend group. Multiple groups should be supported so one person can belong to different groups (e.g. "Work friends", "Family") each with their own leaderboard and game history.

### Functional requirements
- **Groups** — a user can create a group and invite others. Each group has its own independent roster, game log, and leaderboard. A player (by name/account) can be a member of multiple groups.
- **Roster** — each group maintains a list of its members. Members are selected from the roster when logging a game.
- **Log a battle** — record a completed game with: date, victory type (Score/Domination/Coalition), format (virtual/in-person), which players participated, which faction each played, and who won. Coalition supports 2 co-winners.
- **Leaderboard** — per group, ranked by wins. Shows win %, games played, and all factions a player has used.
- **Battle log** — full game history per group, newest first, with delete.
- **Summary stats** — total games, total players, top winning faction.

### Non-functional requirements
- Accessible by URL — shareable link per group
- Data persists across sessions (real database, not localStorage)
- Works on mobile and desktop
- No login required initially is fine, but group access should be linkable (e.g. via a group ID in the URL or a simple join code)

### Future features (not in v1)
- Per-player stats: favorite faction, faction win rates, longest win streak
- Most-played map tracking
- Stats dashboard / charts

---

## What was built

A themed leaderboard app for the board game **Root** by Leder Games, called **"The Woodland Chronicles"**. Built as a React component with a dark forest aesthetic (Cinzel + Lato fonts, deep greens, gold accents).

---

## Current state

The app works as a standalone React artifact using `window.storage` (Claude's sandbox storage API) for persistence. **This needs to be replaced with a real database + API before deployment.**

The component file is `root-leaderboard.jsx` (in this same folder).

---

## Features implemented

### Leaderboard (Standings)
- Ranked by wins, then games played as tiebreaker
- Shows each player's win %, total games, and all factions they've ever played
- Top player row highlighted in gold

### Summary stats
- Total games played, total denizens (players), top winning faction

### Battle Log
- Full history of games, newest first
- Shows winner(s), faction, victory type, virtual/in-person badge
- Delete button per game

### Log a Battle form
- **Date** — defaults to today
- **Victory Type** — Score (30pts) [default], Domination, Coalition
  - Coalition shows checkboxes to pick exactly 2 winners instead of a single winner dropdown
- **Format** — Virtual (default) or In Person toggle
- **Players** — if roster has players, shows dropdowns (already-selected players hidden from other rows); falls back to free text if roster is empty
- **Winner** — dropdown from the players in the current game; switches to checkboxes for Coalition
- Duplicate player validation

### Roster
- Persisted list of player names (your friend group)
- "Manage" toggle to show/hide the roster panel
- Add by name + Enter or button click; remove with ✕
- Drives the player dropdowns in the battle form

---

## Data shapes

### Game entry
```json
{
  "id": 1234567890,
  "date": "2026-06-09",
  "victoryType": "Score (30pts)",
  "isVirtual": true,
  "winners": [{ "name": "David", "faction": "marquise" }],
  "winner": { "name": "David", "faction": "marquise" },
  "players": [
    { "name": "David", "faction": "marquise" },
    { "name": "Ana", "faction": "eyrie" }
  ]
}
```
Note: `winner` (singular) is kept for backward compatibility. Always use `winners` array (supports Coalition dual-winner). Victory type "Coalition" always has 2 entries in `winners`.

### Roster
```json
["David", "Ana", "Carlos", "Sofía"]
```

### Factions (16 total)
marquise, eyrie, alliance, vagabond, vagabond2, riverfolk, lizard, duchy, corvid, lord, keepers, knaves, marauder, warlord, bandits, exile

---

## What Claude Code needs to do

### 1. Scaffold a Next.js project
```
npx create-next-app@latest root-leaderboard --typescript --tailwind --app
```
(Tailwind optional — the component uses inline styles and a CSS-in-JS string, so it's self-contained.)

### 2. Set up Supabase (recommended) or any Postgres
Create a free project at supabase.com, then create these tables:

```sql
-- Groups
create table groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  join_code text not null unique default substring(md5(random()::text), 1, 8),
  created_at timestamptz default now()
);

-- Players (global, not per-group — one account can join many groups)
create table players (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz default now()
);

-- Group membership (many-to-many: players <-> groups)
create table group_members (
  group_id uuid references groups(id) on delete cascade,
  player_id uuid references players(id) on delete cascade,
  joined_at timestamptz default now(),
  primary key (group_id, player_id)
);

-- Games (scoped to a group)
create table games (
  id bigint primary key,  -- use Date.now() as ID
  group_id uuid references groups(id) on delete cascade,
  date date not null,
  victory_type text not null,
  is_virtual boolean not null default true,
  created_at timestamptz default now()
);

-- Participants per game (player name + faction)
create table game_players (
  id uuid primary key default gen_random_uuid(),
  game_id bigint references games(id) on delete cascade,
  player_name text not null,
  faction text not null
);

-- Winners per game (supports coalition = 2 rows per game)
create table game_winners (
  id uuid primary key default gen_random_uuid(),
  game_id bigint references games(id) on delete cascade,
  player_name text not null,
  faction text not null
);
```

### 3. Create API routes (Next.js App Router)

Needed endpoints:

**Groups**
- `POST /api/groups` — create a group, returns group with join_code
- `GET  /api/groups/[joinCode]` — fetch group by join code (used to enter a group via URL)

**Roster (scoped to a group)**
- `GET  /api/groups/[joinCode]/roster` — list members of the group
- `POST /api/groups/[joinCode]/roster` — add a player to the group (create player if new, then add to group_members)
- `DELETE /api/groups/[joinCode]/roster/[playerName]` — remove a player from the group

**Games (scoped to a group)**
- `GET  /api/groups/[joinCode]/games` — return all games for the group with players and winners joined
- `POST /api/groups/[joinCode]/games` — insert a game + players + winners for the group
- `DELETE /api/groups/[joinCode]/games/[id]` — delete a game and cascade

**URL routing in the app**
- `/` — home, create or join a group
- `/g/[joinCode]` — the leaderboard for a specific group
- Join code should be short and shareable (8 chars, e.g. `a3f9bc12`), shown prominently so members can share it

### 4. Swap `window.storage` calls in the component

Replace all `window.storage.get/set` with `fetch()` calls to the API routes above. The component uses:
- Load: `loadAll()` — fetches games + roster on mount
- Save game: `saveGames(updated)` — POST new game
- Delete game: `deleteGame(id)` — DELETE by id
- Save roster: `saveRoster(updated)` / `addToRoster()` / `removeFromRoster()` — POST/DELETE roster

### 5. Deploy
```
vercel deploy
```
Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as environment variables in Vercel dashboard.

---

## Future features discussed
- Per-player stats: favorite faction, faction win rates across the group
- Longest win streak
- Most-played map
- Stats dashboard section

---

## Design tokens
- Background: `#0f1a0f`
- Surface: `#1a2e1a`
- Border: `#2d3b2d`
- Gold/accent: `#c9922a`
- Red/CTA: `#8b3a1a`
- Text primary: `#f2e8d0`
- Text muted: `#5a6a4a`
- Fonts: Cinzel (display), Lato (body) — loaded from Google Fonts
