@AGENTS.md

# Woodland Chronicles

A leaderboard and game-log app for the board game **Root**. Players form groups, claim a
global Root identity, log games (factions, winners, victory type), and view aggregated
win-rate leaderboards.

## Stack

- **Next.js 15** (App Router) + **React 19** — see `AGENTS.md`: this Next.js has breaking
  changes from training data; read `node_modules/next/dist/docs/` before writing framework code.
- **Prisma 5** + **PostgreSQL** (Neon serverless; `DATABASE_URL` pooled, `DIRECT_URL` for migrations)
- **NextAuth v5 (beta)** — Google OAuth only, Prisma adapter, DB sessions (30-day maxAge)
- **TypeScript**, ESLint flat config (`eslint.config.mjs`)

## Commands

```bash
npm run dev      # next dev (localhost:3000)
npm run build    # prisma generate && next build
npm run start    # next start
npm run lint     # eslint

npx prisma migrate dev --name <name>   # create + apply a migration (uses DIRECT_URL)
npx prisma studio                      # inspect the DB
```

## Architecture

- **Routes** live under `src/app/api/`, mostly keyed by `[joinCode]`. Auth helpers come from
  `src/lib/auth.ts` (`auth`, `handlers`, `signIn`, `signOut`).
- **Identity model:** a `User` (Google account) *claims* one global `Player` (Root username,
  globally unique, case-insensitive). `Player`s join `Group`s via `GroupPlayer` (with a `Role`).
  Games belong to a group; `GamePlayer` records each participant's faction + winner flag.
- **Membership check:** a user is a "member" of a group when their claimed player is on that
  group's roster. Most write routes require membership; reads of a group/games are public.
- **Game validation** (in `POST /api/groups/[joinCode]/games`): 2–6 players, exactly 1 winner
  (SCORE/DOMINATION) or 2 (COALITION); COALITION requires a Vagabond who is a winner; faction
  must be in the allowed list. Keep this in sync with `docs/api.md`.
- `src/lib/prisma.ts` is a hot-reload-safe singleton; `src/lib/nanoid.ts` generates join codes.

## Conventions

- Singleton Prisma import from `@/lib/prisma` — never `new PrismaClient()`.
- Faction is stored as a free `String` (validated at the app layer) to allow future expansions.
- Player name uniqueness is case-insensitive, enforced by a `lower(name)` DB index — match that
  behavior in queries (compare lowercased).

# Documentation

Project docs live in `docs/`. **Update the relevant doc file(s) whenever you make changes:**

- `docs/schema.md` — DB models, fields, enums, constraints
- `docs/api.md` — API routes, auth requirements, request/response shape, validation rules
- `docs/components.md` — pages, components, lib files, and their behavior

Keep docs accurate and current. Do not leave them describing behavior that no longer exists.
