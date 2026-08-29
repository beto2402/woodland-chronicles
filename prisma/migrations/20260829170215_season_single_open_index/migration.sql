-- Enforce at most one currently-open season (endDate IS NULL) at a time. Mirrors the
-- case-insensitive-name trick on Player: a constraint expressible only via raw SQL, not a
-- Prisma @unique.
CREATE UNIQUE INDEX "Season_single_open_idx" ON "Season" ((true)) WHERE "endDate" IS NULL;
