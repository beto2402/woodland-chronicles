// Pure head-to-head / recurring-lineup stats over a list of games. No server-only deps, so it's
// safe to import from client components (same as elo-core.ts). Players are keyed by playerId.

export type RivalryGame = { players: { playerId: string; isWinner: boolean; score: number | null }[] };

export type RivalRecord = {
  opponentId: string;
  games: number; // games both players were in
  myWins: number; // games where I was a winner
  theirWins: number; // games where they were a winner (coalition: can overlap with myWins)
  otherWins: number; // games where neither of us won
  vpGames: number; // shared games where both have a non-null score
  vpAhead: number;
  vpBehind: number;
  vpTied: number;
};

export function computeRivals(playerId: string, games: RivalryGame[]): RivalRecord[] {
  const byOpp: Record<string, RivalRecord> = {};
  for (const game of games) {
    const me = game.players.find((p) => p.playerId === playerId);
    if (!me) continue;
    for (const opp of game.players) {
      if (opp.playerId === playerId) continue;
      const r = (byOpp[opp.playerId] ??= {
        opponentId: opp.playerId, games: 0, myWins: 0, theirWins: 0, otherWins: 0,
        vpGames: 0, vpAhead: 0, vpBehind: 0, vpTied: 0,
      });
      r.games++;
      if (me.isWinner) r.myWins++;
      if (opp.isWinner) r.theirWins++;
      if (!me.isWinner && !opp.isWinner) r.otherWins++;
      if (me.score != null && opp.score != null) {
        r.vpGames++;
        if (me.score > opp.score) r.vpAhead++;
        else if (me.score < opp.score) r.vpBehind++;
        else r.vpTied++;
      }
    }
  }
  return Object.values(byOpp).sort((a, b) => b.games - a.games || a.opponentId.localeCompare(b.opponentId));
}

export type TableRecord = {
  key: string;
  opponentIds: string[]; // the exact lineup minus me, sorted
  games: number;
  winsByPlayer: Record<string, number>; // includes me; coalition counts both winners
};

export function computeUsualTables(playerId: string, games: RivalryGame[], minGames = 2): TableRecord[] {
  const byLineup: Record<string, TableRecord> = {};
  for (const game of games) {
    if (!game.players.some((p) => p.playerId === playerId)) continue;
    const opponentIds = game.players.map((p) => p.playerId).filter((id) => id !== playerId).sort();
    const key = opponentIds.join("|");
    const t = (byLineup[key] ??= { key, opponentIds, games: 0, winsByPlayer: {} });
    t.games++;
    for (const p of game.players) {
      t.winsByPlayer[p.playerId] ??= 0;
      if (p.isWinner) t.winsByPlayer[p.playerId]++;
    }
  }
  return Object.values(byLineup)
    .filter((t) => t.games >= minGames)
    .sort((a, b) => b.games - a.games || b.opponentIds.length - a.opponentIds.length || a.key.localeCompare(b.key));
}
