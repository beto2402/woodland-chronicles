# Quinielas (not part of Woodland Chronicles)

A hidden World Cup 2026 prediction pool. It lives in this repo and shares this Postgres database
purely for hosting convenience — it is **not** part of the Woodland Chronicles / Root leaderboard
app, has no relation to Players/Groups/Games, and isn't documented in `docs/schema.md`,
`docs/api.md`, or `docs/components.md`. This file is the single source of truth for it.

Global (not per-group), hidden behind `/quinielas` — **not linked from anywhere in the app nav**,
reachable only by knowing the URL. Requires Google sign-in (reuses the app's NextAuth setup) but
has no group-membership or admin concept: any signed-in user can pick and can enter match results.

## Database

Two models in `prisma/schema.prisma`, clearly delimited there under a `─── Quinielas ───` divider
comment, plus three enums (`MatchStage`, `DecidedBy`, `MatchSlot`).

### Match
Global World Cup 2026 fixture. Seeded from `prisma/data/worldcup2026-schedule.json` via
`node prisma/seed-quinielas.mjs`.

| Field | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| matchNumber | Int | unique; FIFA official number for knockout matches (73-104), our own chronological numbering for group stage (1-72) |
| stage | MatchStage enum | GROUP \| ROUND_OF_32 \| ROUND_OF_16 \| QUARTERFINAL \| SEMIFINAL \| THIRD_PLACE \| FINAL |
| groupName | String? | "A".."L", group stage only |
| homeTeam / awayTeam | String? | concrete team name, once known |
| homeTeamPlaceholder / awayTeamPlaceholder | String? | e.g. "Winner Match 73" — exactly one of team/placeholder set per side until resolved |
| kickoffAt | DateTime | stored UTC; UI displays it in America/Mexico_City ("hora CDMX") |
| venue | String? | |
| homeScore / awayScore | Int? | actual final score (after extra time if played); null until the match ends |
| decidedBy | DecidedBy enum? | REGULATION \| EXTRA_TIME \| PENALTIES |
| penaltyHomeScore / penaltyAwayScore | Int? | shootout score, only set when decidedBy = PENALTIES |
| winnerTeam | String? | derived on result entry; stays null for group-stage draws |
| nextMatchId / nextMatchSlot | String? / MatchSlot? | self-relation ("MatchAdvancement"): which match/slot the winner advances to (knockout only) |
| loserNextMatchId / loserNextMatchSlot | String? / MatchSlot? | self-relation ("MatchLoserAdvancement"); semifinals only — loser goes to the third-place match |
| picks | QuinielaPick[] | |

### QuinielaPick
One user's prediction for one match.

| Field | Type | Notes |
|---|---|---|
| id | String (cuid) | PK |
| matchId | String | FK → Match (Cascade) |
| userId | String | FK → User (Cascade) — the app's real `User` table; this is the only link between the two features |
| homeScore / awayScore | Int | required |
| decidedBy | DecidedBy enum | default REGULATION |
| penaltyHomeScore / penaltyAwayScore | Int? | only when decidedBy = PENALTIES |
| updatedAt | DateTime | |

Unique on `(matchId, userId)` — one pick per user per match; re-picking upserts. Picks lock once
the match has a recorded result (`homeScore != null`) — **not** at kickoff time, so a match that's
started but hasn't been marked finished stays pickable.

### Enums
- `MatchStage`: `GROUP`, `ROUND_OF_32`, `ROUND_OF_16`, `QUARTERFINAL`, `SEMIFINAL`, `THIRD_PLACE`, `FINAL`
- `DecidedBy`: `REGULATION`, `EXTRA_TIME`, `PENALTIES`
- `MatchSlot`: `HOME`, `AWAY`

### Seed data
- `prisma/data/worldcup2026-schedule.json` — the full 104-match fixture list (group rosters, kickoff dates/times, venues, and for knockout matches the bracket advancement chart), researched from Wikipedia.
- `prisma/seed-quinielas.mjs` — one-off, idempotent (upserts by `matchNumber`) script that loads that JSON into `Match`. Run with `node prisma/seed-quinielas.mjs` (needs `DATABASE_URL`/`DIRECT_URL` in the environment).
- Migration: `prisma/migrations/20260702124612_add_quinielas/`.

## API routes

All under `src/app/api/quinielas/`. All require auth (`src/lib/auth.ts`, shared with the main app); none require group membership.

### `GET /api/quinielas/matches`
Returns all 104 matches, ordered by `matchNumber`.

**Response:** `Match[]`, each with:
- Schedule/team fields (`homeTeam`/`homeTeamPlaceholder`, `awayTeam`/`awayTeamPlaceholder`, `kickoffAt`, `venue`, `stage`, `groupName`)
- Actual result fields (`homeScore`, `awayScore`, `decidedBy`, `penaltyHomeScore`, `penaltyAwayScore`, `winnerTeam`) — null until entered
- `ended`: `true` once a result has been recorded (`homeScore != null`) — **not** based on `kickoffAt`, so a match that's kicked off but has no result yet (e.g. still being played, or the result just hasn't been entered) stays pickable
- `myPick`: the caller's own prediction for that match, or `null`
- `allPicks`: every user's prediction — **empty until `ended` is `true`**, so picks stay hidden from other players until the match is over

### `POST /api/quinielas/matches/[id]/pick`
Upserts the caller's prediction for a match.

**Body:** `{ homeScore, awayScore, decidedBy?: "REGULATION" | "EXTRA_TIME" | "PENALTIES", penaltyHomeScore?, penaltyAwayScore? }`
**Rules:**
- 403 once the match has a recorded result (`homeScore != null`) — picks lock on result entry, not at kickoff
- Group-stage matches may end level (draws allowed)
- Knockout matches (anything but `GROUP`) can't be picked as level unless `decidedBy: "PENALTIES"` with a decisive (non-equal) penalty score; conversely `decidedBy: "PENALTIES"` is rejected if the score isn't level
- One pick per user per match (`@@unique([matchId, userId])`); re-posting updates it

### `POST /api/quinielas/matches/[id]/result`
Records the actual result of a match and advances the bracket.

**Auth:** any signed-in user — this is a small trusted-friend-group feature, not gated further
**Body:** same shape as the pick body
**Rules:**
- Both `homeTeam` and `awayTeam` must already be concrete (not placeholders)
- Same draw/penalty rules as picks
**Side effect:** if the match feeds a later one (`nextMatchId`/`nextMatchSlot`), the winner's name replaces the placeholder in that match's slot. Semifinals also push the *loser* into the third-place match via `loserNextMatchId`/`loserNextMatchSlot`. Logic lives in `src/lib/quinielas.ts` (`applyMatchResult`, `computeWinner`, `validateResult`).

## Page & lib

### `src/app/quinielas/page.tsx` (client component)
**Behavior:**
- Not signed in: sign-in card only
- Signed in: fetches `GET /api/quinielas/matches` and renders all 104 matches
- Stage tabs (Group Stage / Round of 32 / Round of 16 / Quarterfinal / Semifinal / Third Place / Final); defaults to the first stage (in bracket order) that still has a match without a result (`!ended`) — if every stage is fully resolved, falls back to the Final tab. Group Stage tab adds a group-letter (A–L) filter; a team-name text filter applies across all tabs.
- **Open / Past filter:** a second toggle next to the stage tabs shows either matches still missing a result (Open) or matches that have ended (Past). Switching stage tabs re-picks the default (Open if that stage has any unresolved match, otherwise Past) via `selectStage`.
- Each match card shows the two teams (or a placeholder like "Winner Match 83" if not yet determined), kickoff time formatted in `America/Mexico_City` ("hora CDMX"), and venue.
- **While a match hasn't ended (`!ended`):** score inputs + a "Decided by" selector (knockout stages only) to save/update your own pick. This is **not** tied to kickoff time — a match that's kicked off but has no result yet stays pickable. Ties are rejected for knockout matches unless "Decided by: Penalties" is selected with a decisive shootout score; selecting Penalties reveals a second score pair for the shootout plus a hint clarifying the main score is the (level) result after extra time.
- **Once a match has ended:** shows your own pick (read-only), then everyone else's picks too (hidden before the match ends so no one can copy). Picks that exactly match the final score are highlighted.
- **Entering a result:** once teams are determined (regardless of whether the match has "ended" yet), an "Enter/Edit result" toggle reveals the same score + decided-by inputs, posting to the result endpoint. Saving refetches all matches, since the bracket-advancement side effect can change other cards (a placeholder resolving into a real team name).

**Key types:** `Match` (note: `ended` reflects whether a result is recorded, not kickoff time), `Draft` (local per-match input state for both the pick form and the result form, keyed by match id).

### `src/lib/quinielas.ts`
Exports `validateResult(stage, input)` (draw/penalty rules), `computeWinner(stage, homeTeam, awayTeam, input)`, and `applyMatchResult(matchId, input)` — writes the result and cascades the winner (and semifinal losers) into the next match's team slot(s). No React dependency.

## Known gaps (as of last update)
- Group-stage `matchNumber`s (1-72) are our own chronological numbering, not FIFA's official numbers (doesn't affect app behavior — purely an internal ID).
- The Final's kickoff time is a placeholder guess — the source didn't confirm the exact local time.
- There's no dedicated "picks by person" view yet — picks are only visible per match card, once that match has ended.
