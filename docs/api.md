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

**Auth:** required, must be a group member  
**Body:** `{ playerName: string }`

### `DELETE /api/groups/[joinCode]/roster/[playerName]`
Removes a player from the roster.

**Auth:** required, must be a group member  
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
**Response:** `Game[]` with nested `players` (including Player) and `loggedBy`

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
    { "name": "PlayerName", "faction": "marquise", "isWinner": false }
  ]
}
```
**Validation:**
- 2–6 players (Root's official range, including all expansions)
- Exactly 1 winner (SCORE/DOMINATION) or exactly 2 winners (COALITION)
- COALITION requires a Vagabond faction in the game and Vagabond must be a winner
- Valid factions: `marquise`, `eyrie`, `alliance`, `vagabond`, `vagabond2`, `riverfolk`, `lizard`, `duchy`, `corvid`, `lord`, `keepers`, `knaves`, `marauder`, `warlord`, `bandits`, `exile`

### `DELETE /api/groups/[joinCode]/games/[id]`
Deletes a game.

**Auth:** required  
**Rules:** Must be the user who logged the game OR a group ADMIN
