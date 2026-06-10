import { useState, useEffect } from "react";

const FACTIONS = [
  { id: "marquise", name: "Marquise de Cat", symbol: "🐱", color: "#e8a020" },
  { id: "eyrie", name: "Eyrie Dynasties", symbol: "🦅", color: "#4a90d9" },
  { id: "alliance", name: "Woodland Alliance", symbol: "🌿", color: "#5a8a3a" },
  { id: "vagabond", name: "Vagabond", symbol: "🎒", color: "#888888" },
  { id: "vagabond2", name: "Vagabond (2nd)", symbol: "🎒", color: "#aaaaaa" },
  { id: "riverfolk", name: "Riverfolk Company", symbol: "🦦", color: "#3a9aaa" },
  { id: "lizard", name: "Lizard Cult", symbol: "🦎", color: "#c8a830" },
  { id: "duchy", name: "Underground Duchy", symbol: "🪨", color: "#9b7040" },
  { id: "corvid", name: "Corvid Conspiracy", symbol: "🐦‍⬛", color: "#5a3a7a" },
  { id: "lord", name: "Lord of the Hundreds", symbol: "🐀", color: "#b03030" },
  { id: "keepers", name: "Keepers in Iron", symbol: "⚔️", color: "#708090" },
  { id: "knaves", name: "Knaves of the Deepwood", symbol: "🗡️", color: "#4a6040" },
  { id: "marauder", name: "Marauder", symbol: "🏹", color: "#a05030" },
  { id: "warlord", name: "Warlord", symbol: "🛡️", color: "#8b0000" },
  { id: "bandits", name: "Bandit Gangs", symbol: "💰", color: "#b8860b" },
  { id: "exile", name: "Exile", symbol: "🌑", color: "#2c2c4a" },
];

const VICTORY_TYPES = ["Score (30pts)", "Domination", "Coalition"];
const FACTION_MAP = Object.fromEntries(FACTIONS.map((f) => [f.id, f]));

const emptyGameRow = () => ({ playerId: "", faction: "" });

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Lato:wght@300;400;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #0f1a0f; }
  .app { min-height: 100vh; background: #0f1a0f; color: #f2e8d0; font-family: 'Lato', sans-serif; padding: 0 0 60px; }

  .hero {
    background: linear-gradient(180deg, #0f1a0f 0%, #1a2e1a 60%, #0f1a0f 100%);
    border-bottom: 1px solid #2d3b2d;
    padding: 36px 24px 28px;
    text-align: center;
    position: relative;
    overflow: hidden;
  }
  .hero::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(ellipse 60% 40% at 50% 0%, rgba(201,146,42,0.12) 0%, transparent 70%);
    pointer-events: none;
  }
  .hero-title { font-family: 'Cinzel', serif; font-size: 2.2rem; font-weight: 700; letter-spacing: 0.08em; color: #c9922a; text-shadow: 0 0 40px rgba(201,146,42,0.4); line-height: 1.1; }
  .hero-sub { font-family: 'Cinzel', serif; font-size: 0.78rem; letter-spacing: 0.22em; color: #8a7a5a; margin-top: 6px; text-transform: uppercase; }

  .container { max-width: 780px; margin: 0 auto; padding: 0 16px; }

  .section-label { font-family: 'Cinzel', serif; font-size: 0.68rem; letter-spacing: 0.25em; color: #8b3a1a; text-transform: uppercase; margin: 32px 0 12px; }

  .leaderboard { background: #1a2e1a; border: 1px solid #2d3b2d; border-radius: 4px; overflow: hidden; }
  .lb-row { display: grid; grid-template-columns: 36px 1fr 90px 60px 60px; gap: 0; align-items: center; padding: 10px 16px; border-bottom: 1px solid #1e2e1e; transition: background 0.15s; }
  .lb-row:last-child { border-bottom: none; }
  .lb-header { background: #152515; padding: 8px 16px; }
  .lb-header span { font-family: 'Cinzel', serif; font-size: 0.6rem; letter-spacing: 0.2em; color: #5a6a4a; text-transform: uppercase; }
  .lb-row:not(.lb-header):hover { background: #1e341e; }
  .lb-row.top-player { background: linear-gradient(90deg, rgba(201,146,42,0.08) 0%, transparent 80%); }
  .rank { font-family: 'Cinzel', serif; font-size: 0.85rem; color: #5a6a4a; font-weight: 600; }
  .rank-1 { color: #c9922a; }
  .rank-2 { color: #a0a0a0; }
  .rank-3 { color: #8b5a2a; }
  .player-info { display: flex; flex-direction: column; gap: 2px; }
  .player-name { font-weight: 700; font-size: 0.95rem; color: #f2e8d0; }
  .faction-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 3px; }
  .faction-tag { font-size: 0.6rem; padding: 1px 6px; border-radius: 2px; border: 1px solid; opacity: 0.85; font-family: 'Lato', sans-serif; letter-spacing: 0.05em; }
  .stat { text-align: center; font-size: 0.88rem; }
  .stat-wins { color: #c9922a; font-weight: 700; font-size: 1rem; }
  .stat-games { color: #7a8a6a; }
  .stat-pct { color: #a0b090; font-size: 0.8rem; }
  .empty-state { padding: 40px 16px; text-align: center; color: #5a6a4a; font-style: italic; font-size: 0.9rem; }

  .game-log { display: flex; flex-direction: column; gap: 8px; }
  .game-card { background: #1a2e1a; border: 1px solid #2d3b2d; border-radius: 4px; padding: 12px 16px; display: flex; align-items: center; gap: 12px; }
  .game-date { font-size: 0.7rem; color: #5a6a4a; font-family: 'Cinzel', serif; letter-spacing: 0.1em; white-space: nowrap; flex-shrink: 0; }
  .game-winner { flex: 1; display: flex; flex-direction: column; gap: 3px; min-width: 0; }
  .winner-label { font-size: 0.62rem; letter-spacing: 0.18em; color: #8b3a1a; text-transform: uppercase; font-family: 'Cinzel', serif; }
  .winner-name { font-weight: 700; font-size: 0.95rem; color: #c9922a; }
  .winner-faction { font-size: 0.78rem; color: #a0b090; }
  .game-players { display: flex; flex-wrap: wrap; gap: 4px; justify-content: flex-end; max-width: 260px; flex-shrink: 0; }
  .player-chip { font-size: 0.65rem; padding: 2px 7px; background: #152515; border: 1px solid #2d3b2d; border-radius: 2px; color: #a0b090; white-space: nowrap; }
  .delete-btn { background: none; border: none; color: #3a4a3a; cursor: pointer; font-size: 1rem; padding: 4px; line-height: 1; transition: color 0.15s; flex-shrink: 0; }
  .delete-btn:hover { color: #8b3a1a; }

  .form-card { background: #1a2e1a; border: 1px solid #2d3b2d; border-radius: 4px; padding: 20px; }
  .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .field { display: flex; flex-direction: column; gap: 5px; }
  .field-label { font-size: 0.62rem; letter-spacing: 0.2em; color: #8b3a1a; text-transform: uppercase; font-family: 'Cinzel', serif; }
  .field input, .field select { background: #152515; border: 1px solid #2d3b2d; border-radius: 3px; color: #f2e8d0; font-family: 'Lato', sans-serif; font-size: 0.88rem; padding: 8px 10px; outline: none; transition: border-color 0.15s; width: 100%; -webkit-appearance: none; }
  .field input:focus, .field select:focus { border-color: #c9922a; }
  .field select option { background: #1a2e1a; }
  .players-section { margin-top: 16px; }
  .players-list { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }
  .player-row { display: grid; grid-template-columns: 1fr 1fr 32px; gap: 8px; align-items: center; }
  .remove-player { background: none; border: 1px solid #2d3b2d; border-radius: 3px; color: #5a6a4a; cursor: pointer; font-size: 0.9rem; height: 34px; width: 32px; transition: all 0.15s; display: flex; align-items: center; justify-content: center; }
  .remove-player:hover { border-color: #8b3a1a; color: #8b3a1a; }
  .add-player-btn { margin-top: 8px; background: none; border: 1px dashed #2d3b2d; border-radius: 3px; color: #5a6a4a; cursor: pointer; font-family: 'Lato', sans-serif; font-size: 0.8rem; padding: 7px; width: 100%; transition: all 0.15s; letter-spacing: 0.05em; }
  .add-player-btn:hover { border-color: #5a6a4a; color: #a0b090; }
  .winner-select-section { margin-top: 16px; }
  .form-actions { margin-top: 20px; display: flex; gap: 10px; justify-content: flex-end; }

  .btn-primary { background: #8b3a1a; border: none; border-radius: 3px; color: #f2e8d0; cursor: pointer; font-family: 'Cinzel', serif; font-size: 0.78rem; letter-spacing: 0.12em; padding: 10px 24px; transition: background 0.15s; text-transform: uppercase; }
  .btn-primary:hover { background: #a04520; }
  .btn-primary:disabled { background: #2d3b2d; color: #5a6a4a; cursor: not-allowed; }
  .btn-secondary { background: none; border: 1px solid #2d3b2d; border-radius: 3px; color: #7a8a6a; cursor: pointer; font-family: 'Lato', sans-serif; font-size: 0.82rem; padding: 10px 16px; transition: all 0.15s; }
  .btn-secondary:hover { border-color: #5a6a4a; color: #a0b090; }

  .toggle-form-btn { display: flex; align-items: center; gap: 8px; background: #1a2e1a; border: 1px solid #2d3b2d; border-radius: 4px; color: #a0b090; cursor: pointer; font-family: 'Cinzel', serif; font-size: 0.72rem; letter-spacing: 0.18em; padding: 11px 18px; text-transform: uppercase; transition: all 0.15s; margin-top: 28px; width: 100%; justify-content: center; }
  .toggle-form-btn:hover { background: #1e341e; border-color: #5a6a4a; color: #f2e8d0; }

  .victory-badge { font-size: 0.62rem; padding: 1px 6px; background: rgba(139,58,26,0.2); border: 1px solid #8b3a1a; border-radius: 2px; color: #c9922a; letter-spacing: 0.08em; width: fit-content; }

  .stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 8px; }
  .stat-card { background: #1a2e1a; border: 1px solid #2d3b2d; border-radius: 4px; padding: 14px 12px; text-align: center; }
  .stat-card-value { font-family: 'Cinzel', serif; font-size: 1.6rem; color: #c9922a; font-weight: 700; line-height: 1; }
  .stat-card-label { font-size: 0.62rem; color: #5a6a4a; letter-spacing: 0.15em; text-transform: uppercase; margin-top: 4px; }

  /* ROSTER */
  .roster-grid { display: flex; flex-direction: column; gap: 6px; }
  .roster-row { display: flex; align-items: center; gap: 8px; background: #1a2e1a; border: 1px solid #2d3b2d; border-radius: 4px; padding: 8px 12px; }
  .roster-name { flex: 1; font-size: 0.9rem; color: #f2e8d0; }
  .add-roster-row { display: flex; gap: 8px; margin-top: 8px; }
  .add-roster-row input { flex: 1; background: #152515; border: 1px solid #2d3b2d; border-radius: 3px; color: #f2e8d0; font-family: 'Lato', sans-serif; font-size: 0.88rem; padding: 8px 10px; outline: none; transition: border-color 0.15s; }
  .add-roster-row input:focus { border-color: #c9922a; }
  .add-roster-btn { background: #1a2e1a; border: 1px solid #2d3b2d; border-radius: 3px; color: #a0b090; cursor: pointer; font-family: 'Lato', sans-serif; font-size: 0.82rem; padding: 8px 14px; transition: all 0.15s; white-space: nowrap; }
  .add-roster-btn:hover { border-color: #c9922a; color: #c9922a; }
  .add-roster-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .roster-toggle { background: none; border: none; color: #5a6a4a; cursor: pointer; font-size: 0.75rem; padding: 2px 6px; border-radius: 3px; transition: all 0.15s; font-family: 'Lato', sans-serif; }
  .roster-toggle:hover { background: #152515; color: #8b3a1a; }
  .no-roster { font-size: 0.82rem; color: #5a6a4a; font-style: italic; padding: 8px 0; }

  @media (max-width: 500px) {
    .form-grid { grid-template-columns: 1fr; }
    .game-players { max-width: 140px; }
    .lb-row { grid-template-columns: 28px 1fr 70px 50px 50px; }
    .player-row { grid-template-columns: 1fr 1fr 32px; }
  }
`;

function getFactionStyle(factionId) {
  const f = FACTION_MAP[factionId];
  if (!f) return {};
  return { color: f.color, borderColor: f.color + "55" };
}

export default function RootLeaderboard() {
  const [games, setGames] = useState([]);
  const [roster, setRoster] = useState([]); // persisted player names
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showRoster, setShowRoster] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState("");

  // Battle form state — rows of { playerId, faction }
  const [gameDate, setGameDate] = useState(new Date().toISOString().slice(0, 10));
  const [victoryType, setVictoryType] = useState("Score (30pts)");
  const [gameRows, setGameRows] = useState([emptyGameRow(), emptyGameRow()]);
  const [winnerId, setWinnerId] = useState(0);
  const [winnerIds, setWinnerIds] = useState([]);
  const [isVirtual, setIsVirtual] = useState(true);

  const isCoalition = victoryType === "Coalition";

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [gRes, rRes] = await Promise.all([
        window.storage.get("root-games"),
        window.storage.get("root-roster"),
      ]);
      if (gRes?.value) setGames(JSON.parse(gRes.value));
      if (rRes?.value) setRoster(JSON.parse(rRes.value));
    } catch (_) {}
    setLoading(false);
  }

  function saveGames(updated) {
    setGames(updated); // update UI immediately
    window.storage.set("root-games", JSON.stringify(updated)).catch((err) => {
      console.error("Failed to persist games:", err);
    });
  }

  function saveRoster(updated) {
    setRoster(updated); // update UI immediately
    window.storage.set("root-roster", JSON.stringify(updated)).catch((err) => {
      console.error("Failed to save roster:", err);
    });
  }

  // Roster management
  function addToRoster() {
    const name = newPlayerName.trim();
    if (!name || roster.find((r) => r.toLowerCase() === name.toLowerCase())) return;
    const updated = [...roster, name];
    setRoster(updated);
    setNewPlayerName("");
    window.storage.set("root-roster", JSON.stringify(updated)).catch((err) => {
      console.error("Failed to persist roster:", err);
    });
  }

  function removeFromRoster(name) {
    const updated = roster.filter((r) => r !== name);
    setRoster(updated);
    window.storage.set("root-roster", JSON.stringify(updated)).catch((err) => {
      console.error("Failed to persist roster:", err);
    });
  }

  // Game rows
  function addGameRow() {
    setGameRows([...gameRows, emptyGameRow()]);
  }

  function removeGameRow(i) {
    if (gameRows.length <= 2) return;
    const next = gameRows.filter((_, idx) => idx !== i);
    setGameRows(next);
    if (winnerId >= next.length) setWinnerId(0);
    setWinnerIds(winnerIds.filter((id) => id !== i).map((id) => (id > i ? id - 1 : id)));
  }

  function updateGameRow(i, field, val) {
    setGameRows(gameRows.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)));
  }

  function toggleCoalitionWinner(i) {
    setWinnerIds((prev) =>
      prev.includes(i) ? prev.filter((x) => x !== i) : prev.length < 2 ? [...prev, i] : prev
    );
  }

  function resetForm() {
    setGameDate(new Date().toISOString().slice(0, 10));
    setVictoryType("Score (30pts)");
    setGameRows([emptyGameRow(), emptyGameRow()]);
    setWinnerId(0);
    setWinnerIds([]);
    setIsVirtual(true);
  }

  // Get player name for a row (from roster or typed)
  function rowName(row) {
    return row.playerId || "";
  }

  async function logGame() {
    try {
      const coalition = victoryType === "Coalition";
      const playerEntries = gameRows.map((r) => ({ name: rowName(r), faction: r.faction }));
      let winners;
      if (coalition) {
        winners = winnerIds.map((i) => ({ name: rowName(gameRows[i]), faction: gameRows[i].faction }));
      } else {
        winners = [{ name: rowName(gameRows[winnerId]), faction: gameRows[winnerId].faction }];
      }
      const entry = {
        id: Date.now(),
        date: gameDate,
        victoryType,
        isVirtual,
        winners,
        winner: winners[0],
        players: playerEntries,
      };
      saveGames([entry, ...games]);
      resetForm();
      setShowForm(false);
    } catch (err) {
      console.error("Failed to save game:", err);
      alert("Failed to save. Please try again.");
    }
  }

  function deleteGame(id) {
    saveGames(games.filter((g) => g.id !== id));
  }

  // Leaderboard computation
  const playerStats = {};
  for (const game of games) {
    for (const p of game.players) {
      if (!p.name) continue;
      const key = p.name.toLowerCase();
      if (!playerStats[key]) {
        playerStats[key] = { name: p.name, wins: 0, games: 0, factions: new Set() };
      }
      playerStats[key].games++;
      if (p.faction) playerStats[key].factions.add(p.faction);
    }
    const winnerList = game.winners || [game.winner];
    for (const w of winnerList) {
      if (!w?.name) continue;
      const wKey = w.name.toLowerCase();
      if (playerStats[wKey]) playerStats[wKey].wins++;
    }
  }
  const leaderboard = Object.values(playerStats).sort((a, b) =>
    b.wins !== a.wins ? b.wins - a.wins : b.games - a.games
  );

  const factionWins = {};
  for (const game of games) {
    const wList = game.winners || [game.winner];
    for (const w of wList) {
      if (w?.faction) factionWins[w.faction] = (factionWins[w.faction] || 0) + 1;
    }
  }
  const topFactionId = Object.entries(factionWins).sort((a, b) => b[1] - a[1])[0]?.[0];
  const topFaction = topFactionId ? FACTION_MAP[topFactionId] : null;

  const coalition = victoryType === "Coalition";
  // Validate: all rows have a player selected and a faction, plus winner selection
  const usedNames = gameRows.map((r) => rowName(r));
  const namesUnique = new Set(usedNames.filter(Boolean)).size === usedNames.filter(Boolean).length;
  const formValid =
    gameRows.every((r) => rowName(r) && r.faction) &&
    namesUnique &&
    gameDate &&
    (coalition ? winnerIds.length === 2 : true);

  // Available roster names for a given row (exclude already selected in other rows)
  function availableForRow(i) {
    const taken = new Set(gameRows.filter((_, idx) => idx !== i).map((r) => r.playerId).filter(Boolean));
    return roster.filter((n) => !taken.has(n));
  }

  return (
    <>
      <style>{styles}</style>
      <div className="app">
        <div className="hero">
          <div className="hero-title">The Woodland Chronicles</div>
          <div className="hero-sub">Root · Leaderboard</div>
        </div>

        <div className="container">
          {/* Summary stats */}
          {games.length > 0 && (
            <>
              <div className="section-label">Chronicle</div>
              <div className="stats-row">
                <div className="stat-card">
                  <div className="stat-card-value">{games.length}</div>
                  <div className="stat-card-label">Games Played</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-value">{leaderboard.length}</div>
                  <div className="stat-card-label">Denizens</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-value">{topFaction ? topFaction.symbol : "—"}</div>
                  <div className="stat-card-label">{topFaction ? "Top Faction" : "No Data"}</div>
                </div>
              </div>
            </>
          )}

          {/* Leaderboard */}
          <div className="section-label">Standings</div>
          <div className="leaderboard">
            <div className="lb-row lb-header">
              <span>#</span>
              <span>Denizen</span>
              <span style={{ textAlign: "center" }}>Factions</span>
              <span style={{ textAlign: "center" }}>Wins</span>
              <span style={{ textAlign: "center" }}>Games</span>
            </div>
            {loading ? (
              <div className="empty-state">Loading the chronicles…</div>
            ) : leaderboard.length === 0 ? (
              <div className="empty-state">No battles recorded yet. Log a game to begin.</div>
            ) : (
              leaderboard.map((p, i) => (
                <div key={p.name} className={`lb-row ${i === 0 ? "top-player" : ""}`}>
                  <span className={`rank rank-${i + 1}`}>{i + 1}</span>
                  <div className="player-info">
                    <span className="player-name">{p.name}</span>
                    <div className="faction-tags">
                      {[...p.factions].map((fid) => {
                        const f = FACTION_MAP[fid];
                        return f ? (
                          <span key={fid} className="faction-tag" style={getFactionStyle(fid)}>
                            {f.symbol} {f.name.split(" ")[0]}
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>
                  <div className="stat" style={{ textAlign: "center" }}>
                    <span style={{ color: "#5a6a4a", fontSize: "0.8rem" }}>{p.factions.size}</span>
                  </div>
                  <div className="stat"><span className="stat-wins">{p.wins}</span></div>
                  <div className="stat">
                    <div className="stat-games">{p.games}</div>
                    <div className="stat-pct">{Math.round((p.wins / p.games) * 100)}%</div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Battle Log */}
          {games.length > 0 && (
            <>
              <div className="section-label">Battle Log</div>
              <div className="game-log">
                {games.map((g) => {
                  const winnerList = g.winners || [g.winner];
                  const winnerNames = new Set(winnerList.map((w) => w.name));
                  return (
                    <div key={g.id} className="game-card">
                      <div className="game-date">
                        {g.date}
                        <div style={{ marginTop: 4 }}>
                          <span style={{
                            fontSize: "0.6rem", padding: "1px 5px",
                            background: g.isVirtual === false ? "rgba(90,138,58,0.2)" : "rgba(74,144,217,0.15)",
                            border: `1px solid ${g.isVirtual === false ? "#5a8a3a55" : "#4a90d955"}`,
                            borderRadius: 2,
                            color: g.isVirtual === false ? "#8ab070" : "#7ab0d0",
                            letterSpacing: "0.06em",
                          }}>
                            {g.isVirtual === false ? "🌲 In Person" : "🖥️ Virtual"}
                          </span>
                        </div>
                      </div>
                      <div className="game-winner">
                        <span className="winner-label">{winnerList.length > 1 ? "Coalition" : "Victor"}</span>
                        {winnerList.map((w) => {
                          const wf = FACTION_MAP[w.faction];
                          return (
                            <div key={w.name}>
                              <span className="winner-name">{w.name}</span>
                              <span className="winner-faction" style={{ display: "block" }}>
                                {wf ? `${wf.symbol} ${wf.name}` : w.faction}
                              </span>
                            </div>
                          );
                        })}
                        <div className="victory-badge" style={{ marginTop: 4 }}>{g.victoryType}</div>
                      </div>
                      <div className="game-players">
                        {g.players.filter((p) => !winnerNames.has(p.name)).map((p) => {
                          const pf = FACTION_MAP[p.faction];
                          return (
                            <span key={p.name} className="player-chip">
                              {pf?.symbol} {p.name}
                            </span>
                          );
                        })}
                      </div>
                      <button className="delete-btn" onClick={() => deleteGame(g.id)} title="Delete">✕</button>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Roster section */}
          <div className="section-label" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span>Roster</span>
            <button className="roster-toggle" onClick={() => setShowRoster(!showRoster)}>
              {showRoster ? "hide" : "manage"}
            </button>
          </div>
          {showRoster && (
            <div className="form-card">
              <div className="roster-grid">
                {roster.length === 0 ? (
                  <div className="no-roster">No players yet. Add your group below.</div>
                ) : (
                  roster.map((name) => (
                    <div key={name} className="roster-row">
                      <span className="roster-name">{name}</span>
                      <button className="delete-btn" onClick={() => removeFromRoster(name)} title="Remove">✕</button>
                    </div>
                  ))
                )}
              </div>
              <div className="add-roster-row">
                <input
                  placeholder="Player name"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addToRoster()}
                />
                <button
                  className="add-roster-btn"
                  onClick={addToRoster}
                  disabled={!newPlayerName.trim()}
                >
                  + Add
                </button>
              </div>
            </div>
          )}

          {/* Log battle toggle */}
          <button className="toggle-form-btn" onClick={() => setShowForm(!showForm)}>
            {showForm ? "✕ Cancel" : "+ Log a Battle"}
          </button>

          {/* Battle form */}
          {showForm && (
            <div className="form-card" style={{ marginTop: 12 }}>
              {roster.length === 0 && (
                <div style={{ fontSize: "0.78rem", color: "#8b3a1a", marginBottom: 14, padding: "8px 10px", background: "rgba(139,58,26,0.1)", borderRadius: 3, border: "1px solid #8b3a1a44" }}>
                  Add players to your Roster first to quickly select them here.
                </div>
              )}

              <div className="form-grid">
                <div className="field">
                  <label className="field-label">Date</label>
                  <input type="date" value={gameDate} onChange={(e) => setGameDate(e.target.value)} />
                </div>
                <div className="field">
                  <label className="field-label">Victory Type</label>
                  <select value={victoryType} onChange={(e) => { setVictoryType(e.target.value); setWinnerIds([]); setWinnerId(0); }}>
                    {VICTORY_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div className="field" style={{ gridColumn: "1 / -1" }}>
                  <label className="field-label">Format</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    {[["Virtual", true, "🖥️"], ["In Person", false, "🌲"]].map(([label, val, icon]) => {
                      const active = isVirtual === val;
                      return (
                        <button key={label} onClick={() => setIsVirtual(val)} style={{
                          flex: 1, background: active ? "rgba(139,58,26,0.25)" : "#152515",
                          border: `1px solid ${active ? "#8b3a1a" : "#2d3b2d"}`, borderRadius: 3,
                          color: active ? "#c9922a" : "#7a8a6a", cursor: "pointer",
                          fontFamily: "'Lato', sans-serif", fontSize: "0.85rem", padding: "8px", transition: "all 0.15s",
                        }}>
                          {icon} {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="players-section">
                <div className="field-label" style={{ marginBottom: 8 }}>Players in this game</div>
                <div className="players-list">
                  {gameRows.map((row, i) => (
                    <div key={i} className="player-row">
                      <div className="field">
                        {roster.length > 0 ? (
                          <select value={row.playerId} onChange={(e) => updateGameRow(i, "playerId", e.target.value)}>
                            <option value="">— Player —</option>
                            {availableForRow(i).map((name) => (
                              <option key={name} value={name}>{name}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            placeholder={`Player ${i + 1} name`}
                            value={row.playerId}
                            onChange={(e) => updateGameRow(i, "playerId", e.target.value)}
                          />
                        )}
                      </div>
                      <div className="field">
                        <select value={row.faction} onChange={(e) => updateGameRow(i, "faction", e.target.value)}>
                          <option value="">— Faction —</option>
                          {FACTIONS.map((f) => (
                            <option key={f.id} value={f.id}>{f.symbol} {f.name}</option>
                          ))}
                        </select>
                      </div>
                      <button className="remove-player" onClick={() => removeGameRow(i)} disabled={gameRows.length <= 2}>−</button>
                    </div>
                  ))}
                </div>
                <button className="add-player-btn" onClick={addGameRow}>+ Add Player</button>
              </div>

              <div className="winner-select-section">
                <div className="field-label" style={{ marginBottom: 8 }}>
                  {isCoalition ? "Coalition Winners (pick 2)" : "Winner"}
                </div>
                {isCoalition ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {gameRows.map((row, i) => {
                      const name = rowName(row);
                      const checked = winnerIds.includes(i);
                      const disabled = !checked && winnerIds.length >= 2;
                      const fac = FACTION_MAP[row.faction];
                      return (
                        <label key={i} style={{
                          display: "flex", alignItems: "center", gap: 10,
                          background: checked ? "rgba(201,146,42,0.08)" : "#152515",
                          border: `1px solid ${checked ? "#c9922a55" : "#2d3b2d"}`,
                          borderRadius: 3, padding: "7px 10px",
                          cursor: disabled ? "not-allowed" : "pointer",
                          opacity: disabled ? 0.4 : 1, transition: "all 0.15s",
                        }}>
                          <input type="checkbox" checked={checked} disabled={disabled}
                            onChange={() => toggleCoalitionWinner(i)}
                            style={{ accentColor: "#c9922a", width: 14, height: 14 }} />
                          <span style={{ color: checked ? "#c9922a" : "#a0b090", fontSize: "0.88rem" }}>
                            {name || `Player ${i + 1}`}{fac ? ` — ${fac.name}` : ""}
                          </span>
                        </label>
                      );
                    })}
                    {winnerIds.length < 2 && (
                      <div style={{ fontSize: "0.72rem", color: "#5a6a4a", marginTop: 2 }}>
                        Select {2 - winnerIds.length} more
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="field">
                    <select value={winnerId} onChange={(e) => setWinnerId(Number(e.target.value))}>
                      {gameRows.map((row, i) => {
                        const name = rowName(row);
                        const fac = FACTION_MAP[row.faction];
                        return (
                          <option key={i} value={i}>
                            {name || `Player ${i + 1}`}{fac ? ` — ${fac.name}` : ""}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}
              </div>

              {!namesUnique && (
                <div style={{ fontSize: "0.75rem", color: "#8b3a1a", marginTop: 10 }}>
                  Each player can only appear once per game.
                </div>
              )}

              <div className="form-actions">
                <button className="btn-secondary" onClick={() => { resetForm(); setShowForm(false); }}>Cancel</button>
                <button className="btn-primary" onClick={logGame} disabled={!formValid}>Record Battle</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
