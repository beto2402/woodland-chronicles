# API Routes

All routes live under `src/app/api/`. Auth is handled by `src/lib/auth.ts` (NextAuth v5).

## Auth

### `GET/POST /api/auth/[...nextauth]`
NextAuth catch-all handler. Provides Google OAuth sign-in/sign-out, session management, and callback handling.

---

## Current User

### `GET /api/me`
Returns the signed-in user with their claimed player.

**Auth:** required  
**Response:** `{ id, name, email, image, claimedPlayer: { id, name } | null }`

---

## Players

### `POST /api/players/claim`
Links the signed-in user's account to a player name.

**Auth:** required  
**Body:** `{ playerName: string }`  
**Rules:**
- User must not already have a claimed player
- Player must exist and be unclaimed

### `POST /api/players/unlink`
Removes the claim between the signed-in user and their player.

**Auth:** required  
**Rules:** User must have a claimed player

---

## Groups

### `GET /api/groups`
Returns all groups the signed-in user's claimed player belongs to.

**Auth:** required  
**Response:** `Group[]`  
**Used by:** home page to auto-redirect (1 group) or show group picker (2+ groups)

### `POST /api/groups`
Creates a new group and adds the creator as ADMIN.

**Auth:** required  
**Body:** `{ name: string, playerName: string }`  
**Rules:**
- If user already has a claimed player, `playerName` must match it (case-insensitive)
- Creates player if not found; claims it for the user
- Generates an 8-char alphanumeric join code

### `GET /api/groups/[joinCode]`
Returns group details including roster with claim info.

**Auth:** none required (public)  
**Response:** `Group & { players: GroupPlayer & { player: Player & { claimedBy } }[] }`

---

## Roster

### `POST /api/groups/[joinCode]/roster`
Adds a player to the group roster (without joining as the current user).

**Auth:** required, must be a group member (caller has a claimed player on this group's roster — 403 otherwise)  
**Body:** `{ playerName: string }`

### `DELETE /api/groups/[joinCode]/roster/[playerName]`
Removes a player from the roster.

**Auth:** required, must be a group member (403 otherwise)  
**Rules:** Cannot remove a claimed player

---

## Join

### `POST /api/groups/[joinCode]/join`
Joins a group as the current user.

**Auth:** required  
**Body:** `{ playerName?: string }`  
**Rules (atomic transaction):**
- If user has a claimed player → just adds them to the roster
- If user has no claimed player → `playerName` required; creates/claims player and adds to roster
- Returns 409 if player name is already claimed by someone else

---

## Games

### `GET /api/groups/[joinCode]/games`
Returns all games for the group, newest first.

**Auth:** none required (public)  
**Response:** `Game[]` with nested `players` (including Player, each with optional `score`), `loggedBy`, and `moments`

### `POST /api/groups/[joinCode]/games`
Logs a new game.

**Auth:** required, must be a group member (claimed player on roster)  
**Body:**
```json
{
  "date": "ISO date string",
  "victoryType": "SCORE | DOMINATION | COALITION",
  "isVirtual": true,
  "hasHirelings": false,
  "players": [
    { "name": "PlayerName", "faction": "marquise", "isWinner": false, "score": 22 }
  ]
}
```
**Validation:**
- 2–6 players (Root's official range, including all expansions)
- Exactly 1 winner (SCORE/DOMINATION) or exactly 2 winners (COALITION)
- COALITION requires a Vagabond faction in the game and Vagabond must be a winner
- Valid factions (the official Root factions, incl. the latest expansion's Knaves of the Deepwood, Lilypad Diaspora, and Twilight Council): `marquise`, `eyrie`, `alliance`, `vagabond`, `vagabond2`, `riverfolk`, `lizard`, `duchy`, `corvid`, `lord`, `keepers`, `knaves`, `lilypad`, `twilight`
- `score` is **optional and all-or-none**: either every player has a non-negative integer score, or none do (mixed is a 400)

**Side effect:** After saving, calls `recalculateGroupElo(groupId)` and `recalculateGlobalElo()` — replays all games to update every player's ELO.

### `DELETE /api/groups/[joinCode]/games/[id]`
Deletes a game.

**Auth:** required  
**Rules:** Must be the user who logged the game OR a group ADMIN

**Side effect:** After deletion, calls `recalculateGroupElo(groupId)` and `recalculateGlobalElo()` to replay all remaining games and update every affected player's ELO.

---

## Hall of Fame

### `POST /api/upload`
Uploads a single image to Vercel Blob and returns its public URL.

**Auth:** required (any signed-in user; moment-creation enforces group membership)  
**Body:** `multipart/form-data` with a `file` field  
**Validation:** type ∈ {jpeg, png, webp, gif}, size ≤ 5MB  
**Response:** `{ "url": "https://…blob.vercel-storage.com/…" }`  
**Env:** requires `BLOB_READ_WRITE_TOKEN` (provisioned by Vercel Blob)

### `GET /api/groups/[joinCode]/hall-of-fame`
Aggregated Hall of Fame data for a group.

**Auth:** none required (public)  
**Response:**
```json
{
  "moments": [ /* HallOfFameMoment[] with nested game (date, victoryType, players) */ ],
  "lossesAt29": [ { "id": "playerId", "name": "PlayerName", "count": 3 } ],
  "records": {
    "blowout":   { "gameId", "date", "gap", "first": {"name","score"}, "second": {"name","score"} },
    "nailbiter": { "gameId", "date", "gap", "first": {"name","score"}, "second": {"name","score"} }
  }
}
```
- `lossesAt29` ("Womp Womp Hall"): games where a player had `score = 29` and `isWinner = false`, grouped by player, descending by count.
- `records.blowout` / `records.nailbiter`: largest / smallest point gap between 1st and 2nd place, computed only over games where **every** player has a score. Both `null` until such a game exists.

### `POST /api/groups/[joinCode]/games/[id]/moments`
Creates a Hall of Fame moment attached to a game.

**Auth:** required, must be a group member  
**Body:** `{ "title": string, "description": string, "kind": "GLORY" | "TARD", "imageUrl": string | null }` (title and description required; `kind` defaults to `GLORY` if omitted/invalid)  
**Rules:** the game must belong to the group  
**Response:** the created `HallOfFameMoment`

### `DELETE /api/groups/[joinCode]/games/[id]/moments/[momentId]`
Deletes a moment.

**Auth:** required  
**Rules:** must be the moment's creator OR a group ADMIN

---

## ELO Ratings

ELO is maintained automatically on `POST /games` and `DELETE /games/:id`. Both routes call:
- `recalculateGroupElo(groupId)` — replays all games in the group chronologically, updates `GroupPlayer.groupElo`
- `recalculateGlobalElo()` — replays all games across all groups, updates `Player.globalElo`

**Algorithm (`src/lib/elo.ts`):**
- Pairwise comparisons: every winner beats every loser (score 1–0); coalition co-winners draw (0.5–0.5); loser-vs-loser pairs are skipped
- K-factor: `K=32` divided by `(N-1)` to prevent inflation in larger games
- Starting ELO: 1000
- Recalculates from scratch on every change (correct even after deletions)
- `scripts/backfill-elo.mjs` — one-time backfill script for pre-existing game history
