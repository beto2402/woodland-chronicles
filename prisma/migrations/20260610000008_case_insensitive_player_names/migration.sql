-- Replace case-sensitive unique index with a case-insensitive one
DROP INDEX IF EXISTS "Player_name_key";
CREATE UNIQUE INDEX "Player_name_key" ON "Player" (lower(name));