"use client";

import { useState, useEffect, useRef } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { FACTION_MAP, FactionIcon, getFactionStyle } from "@/components/FactionIcon";
import { FactionSelect } from "@/components/FactionSelect";
import { analyzeScreenshot, levenshtein } from "@/lib/screenshot-scan";

const VICTORY_TYPES = ["Score (30pts)", "Domination", "Coalition"];
const MAX_PLAYERS = 6;
const emptyGameRow = () => ({ playerId: "", faction: "" });


type Player = { id: string; name: string; claimedBy?: { id: string; name: string; image: string } | null };
type RosterEntry = { playerId: string; role: string; groupElo: number; player: Player };
type Me = { id: string; name: string | null; email: string; claimedPlayer: { id: string; name: string } | null };
type GamePlayer = { id: string; playerId: string; faction: string; isWinner: boolean; player: Player };
type Game = {
  id: string;
  date: string;
  victoryType: string;
  isVirtual: boolean;
  hasHirelings: boolean;
  players: GamePlayer[];
};

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Lato:wght@300;400;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  /* Scale the whole type system up ~14% so base body text reads at ~1rem (16px);
     every font-size here is rem/em, so this bumps them all proportionally. */
  html { font-size: 114%; }
  /* Section/label accent — orange instead of brick-red for color-blind legibility on green. */
  :root { --accent-label: #e08a3a; }
  body { background: #0f1a0f; }
  .app { min-height: 100vh; background: #0f1a0f; color: #f2e8d0; font-family: 'Lato', sans-serif; padding: 0 0 60px; }

  .hero { background: linear-gradient(180deg, #0f1a0f 0%, #1a2e1a 60%, #0f1a0f 100%); border-bottom: 1px solid #2d3b2d; padding: 36px 24px 28px; text-align: center; position: relative; overflow: hidden; }
  .hero::before { content: ''; position: absolute; inset: 0; background: radial-gradient(ellipse 60% 40% at 50% 0%, rgba(201,146,42,0.12) 0%, transparent 70%); pointer-events: none; }
  .hero-title { font-family: 'Cinzel', serif; font-size: 2.2rem; font-weight: 700; letter-spacing: 0.08em; color: #c9922a; text-shadow: 0 0 40px rgba(201,146,42,0.4); line-height: 1.1; }
  .hero-sub { font-family: 'Cinzel', serif; font-size: 0.78rem; letter-spacing: 0.22em; color: #8a7a5a; margin-top: 6px; text-transform: uppercase; }
  .join-code { font-family: 'Cinzel', serif; font-size: 0.7rem; letter-spacing: 0.18em; color: #5a6a4a; margin-top: 10px; }
  .join-code span { color: #c9922a; letter-spacing: 0.25em; }

  .container { max-width: 780px; margin: 0 auto; padding: 0 16px; }
  .section-label { font-family: 'Cinzel', serif; font-size: 0.68rem; letter-spacing: 0.25em; color: var(--accent-label); text-transform: uppercase; margin: 32px 0 12px; }

  .leaderboard { background: #1a2e1a; border: 1px solid #2d3b2d; border-radius: 4px; overflow: hidden; }
  .lb-row { display: grid; grid-template-columns: 36px 1fr 76px 56px 60px; gap: 0; align-items: center; padding: 10px 16px; border-bottom: 1px solid #1e2e1e; transition: background 0.15s; }
  .lb-row:last-child { border-bottom: none; }
  .lb-header { background: #152515; padding: 8px 16px; }
  .lb-header span { font-family: 'Cinzel', serif; font-size: 0.6rem; letter-spacing: 0.2em; color: #5a6a4a; text-transform: uppercase; }
  .lb-row:not(.lb-header):hover { background: #1e341e; }
  .lb-row.top-player { background: linear-gradient(90deg, rgba(201,146,42,0.08) 0%, transparent 80%); }
  .rank { font-family: 'Cinzel', serif; font-size: 0.85rem; color: #5a6a4a; font-weight: 600; }
  .rank-1 { color: #c9922a; } .rank-2 { color: #a0a0a0; } .rank-3 { color: #8b5a2a; }
  .player-info { display: flex; flex-direction: column; gap: 2px; }
  .player-name { font-weight: 700; font-size: 0.95rem; color: #f2e8d0; }
  .faction-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 3px; }
  .faction-tag { font-size: 0.6rem; padding: 1px 6px 1px 3px; border-radius: 2px; border: 1px solid; opacity: 0.85; font-family: 'Lato', sans-serif; letter-spacing: 0.05em; display: inline-flex; align-items: center; gap: 3px; }
  .stat { text-align: center; font-size: 0.88rem; }
  .stat-wins { color: #c9922a; font-weight: 700; font-size: 1rem; }
  .stat-elo { font-family: 'Cinzel', serif; color: #c9922a; font-weight: 700; font-size: 1rem; text-align: center; }
  .stat-elo-label { font-size: 0.6rem; color: #5a6a4a; letter-spacing: 0.08em; text-align: center; }
  .stat-games { color: #7a8a6a; }
  .stat-pct { color: #a0b090; font-size: 0.8rem; }
  .empty-state { padding: 40px 16px; text-align: center; color: #5a6a4a; font-style: italic; font-size: 0.9rem; }

  .page-loader { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px; padding: 90px 16px; }
  .spinner { width: 38px; height: 38px; border: 3px solid #2d3b2d; border-top-color: #c9922a; border-radius: 50%; animation: spin 0.8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .loader-text { font-family: 'Cinzel', serif; font-size: 0.7rem; letter-spacing: 0.22em; color: #8a7a5a; text-transform: uppercase; }

  .game-log { display: flex; flex-direction: column; gap: 8px; }
  .game-card { background: #1a2e1a; border: 1px solid #2d3b2d; border-radius: 4px; padding: 12px 16px; display: flex; align-items: center; gap: 12px; }
  .game-date { font-size: 0.7rem; color: #5a6a4a; font-family: 'Cinzel', serif; letter-spacing: 0.1em; white-space: nowrap; flex-shrink: 0; }
  .game-winner { flex: 1; display: flex; flex-direction: column; gap: 7px; min-width: 0; }
  .winner-label { font-size: 0.62rem; letter-spacing: 0.18em; color: var(--accent-label); text-transform: uppercase; font-family: 'Cinzel', serif; }
  .winner-entry { display: flex; flex-direction: row; align-items: center; flex-wrap: wrap; gap: 16px; padding: 2px 0; }
  .winner-name { font-weight: 700; font-size: 1.1rem; line-height: 1.2; color: #c9922a; }
  .winner-faction { font-size: 0.92rem; color: #a0b090; display: inline-flex; align-items: center; gap: 8px; }
  .game-players { display: flex; flex-wrap: wrap; gap: 7px; justify-content: flex-end; max-width: 330px; flex-shrink: 0; }
  .player-chip { font-size: 0.82rem; padding: 5px 10px 5px 6px; background: #152515; border: 1px solid #2d3b2d; border-radius: 3px; color: #a0b090; white-space: nowrap; display: inline-flex; align-items: center; gap: 6px; }
  .delete-btn { background: none; border: none; color: #3a4a3a; cursor: pointer; font-size: 1rem; padding: 4px; line-height: 1; transition: color 0.15s; flex-shrink: 0; }
  .delete-btn:hover { color: #8b3a1a; }
  .confirm-delete { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
  .confirm-text { font-size: 0.72rem; color: #f2a866; white-space: nowrap; }
  .confirm-yes { background: #8b3a1a; border: none; border-radius: 3px; color: #f2e8d0; cursor: pointer; font-family: 'Lato', sans-serif; font-size: 0.72rem; padding: 4px 10px; transition: background 0.15s; }
  .confirm-yes:hover { background: #a04520; }
  .confirm-no { background: none; border: 1px solid #2d3b2d; border-radius: 3px; color: #a0b090; cursor: pointer; font-family: 'Lato', sans-serif; font-size: 0.72rem; padding: 4px 10px; transition: all 0.15s; }
  .confirm-no:hover { border-color: #5a6a4a; color: #f2e8d0; }

  /* Error/validation/notice messages — dark box for strong contrast (color-blind friendly). */
  .notice { font-size: 0.8rem; line-height: 1.4; color: #f2a866; background: #0a110a; border: 1px solid #2a2114; border-left: 3px solid var(--accent-label); border-radius: 3px; padding: 8px 11px; }
  .form-card { background: #1a2e1a; border: 1px solid #2d3b2d; border-radius: 4px; padding: 20px; }
  .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .field { display: flex; flex-direction: column; gap: 5px; }
  .field-label { font-size: 0.62rem; letter-spacing: 0.2em; color: var(--accent-label); text-transform: uppercase; font-family: 'Cinzel', serif; }
  .field input, .field select { background: #152515; border: 1px solid #2d3b2d; border-radius: 3px; color: #f2e8d0; font-family: 'Lato', sans-serif; font-size: 0.88rem; padding: 8px 10px; outline: none; transition: border-color 0.15s; width: 100%; -webkit-appearance: none; }
  .field input:focus, .field select:focus { border-color: #c9922a; }
  .field select option { background: #1a2e1a; }

  .combobox { position: relative; width: 100%; }
  .combobox-icon { position: absolute; left: 8px; top: 50%; transform: translateY(-50%); pointer-events: none; display: flex; }
  .combobox-input { background: #152515; border: 1px solid #2d3b2d; border-radius: 3px; color: #f2e8d0; font-family: 'Lato', sans-serif; font-size: 0.88rem; padding: 8px 10px; outline: none; transition: border-color 0.15s; width: 100%; }
  .combobox-input:focus { border-color: #c9922a; }
  .combobox-input::placeholder { color: #5a6a4a; }
  .combobox-list { position: absolute; top: calc(100% + 2px); left: 0; right: 0; z-index: 20; background: #1a2e1a; border: 1px solid #2d3b2d; border-radius: 3px; max-height: 220px; overflow-y: auto; box-shadow: 0 8px 24px rgba(0,0,0,0.45); }
  .combobox-option { padding: 8px 10px; font-size: 0.85rem; color: #d8e0c8; cursor: pointer; display: flex; gap: 6px; align-items: center; }
  .combobox-option.active { background: #1e341e; }
  .combobox-option.selected { color: #c9922a; }
  .combobox-empty { padding: 8px 10px; font-size: 0.8rem; color: #5a6a4a; font-style: italic; }

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

  .pagination { display: flex; align-items: center; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
  .pagination-info { font-family: 'Cinzel', serif; font-size: 0.62rem; letter-spacing: 0.1em; color: #5a6a4a; flex: 1; min-width: 140px; line-height: 1.5; }
  .pagination-btn { background: #1a2e1a; border: 1px solid #2d3b2d; border-radius: 3px; color: #a0b090; cursor: pointer; font-family: 'Lato', sans-serif; font-size: 0.78rem; padding: 5px 12px; transition: all 0.15s; white-space: nowrap; }
  .pagination-btn:hover:not(:disabled) { border-color: #5a6a4a; color: #f2e8d0; }
  .pagination-btn:disabled { opacity: 0.3; cursor: not-allowed; }
  .page-size-select { background: #152515; border: 1px solid #2d3b2d; border-radius: 3px; color: #7a8a6a; font-family: 'Lato', sans-serif; font-size: 0.75rem; padding: 5px 8px; cursor: pointer; outline: none; -webkit-appearance: none; }
  .page-size-select:focus { border-color: #c9922a; }
  .claimed-badge { font-size: 0.6rem; padding: 1px 6px; background: rgba(201,146,42,0.1); border: 1px solid #c9922a44; border-radius: 2px; color: #c9922a; letter-spacing: 0.08em; }
  .btn-claim { background: none; border: 1px solid #2d3b2d; border-radius: 3px; color: #5a6a4a; cursor: pointer; font-family: 'Lato', sans-serif; font-size: 0.72rem; padding: 2px 8px; transition: all 0.15s; white-space: nowrap; }
  .btn-claim:hover { border-color: #c9922a; color: #c9922a; }
  .btn-unlink { background: none; border: 1px solid #2d3b2d; border-radius: 3px; color: #5a6a4a; cursor: pointer; font-family: 'Lato', sans-serif; font-size: 0.72rem; padding: 2px 8px; transition: all 0.15s; white-space: nowrap; }
  .btn-unlink:hover { border-color: #8b3a1a; color: #8b3a1a; }

  .auth-bar { position: absolute; top: 12px; right: 16px; display: flex; align-items: center; gap: 8px; z-index: 1; }
  .auth-name { font-size: 0.72rem; color: #5a6a4a; font-family: 'Lato', sans-serif; }
  .btn-auth { background: none; border: 1px solid #2d3b2d; border-radius: 3px; color: #5a6a4a; cursor: pointer; font-family: 'Lato', sans-serif; font-size: 0.72rem; padding: 4px 10px; transition: all 0.15s; }
  .btn-auth:hover { border-color: #c9922a; color: #c9922a; }

  .join-banner { background: #1a2e1a; border: 1px solid #2d3b2d; border-radius: 4px; padding: 16px 20px; margin: 24px 0 0; display: flex; flex-direction: column; gap: 10px; }
  .join-banner-title { font-family: 'Cinzel', serif; font-size: 0.68rem; letter-spacing: 0.25em; color: var(--accent-label); text-transform: uppercase; }
  .join-banner-row { display: flex; gap: 8px; align-items: center; }
  .join-banner-row input { flex: 1; background: #152515; border: 1px solid #2d3b2d; border-radius: 3px; color: #f2e8d0; font-family: 'Lato', sans-serif; font-size: 0.88rem; padding: 8px 10px; outline: none; transition: border-color 0.15s; }
  .join-banner-row input:focus { border-color: #c9922a; }

  .faction-detail-btn { background: none; border: none; color: #5a6a4a; cursor: pointer; font-family: 'Lato', sans-serif; font-size: 0.65rem; padding: 1px 4px; border-radius: 2px; letter-spacing: 0.04em; transition: all 0.15s; }
  .faction-detail-btn:hover { color: #c9922a; background: rgba(201,146,42,0.08); }
  .faction-count { font-size: 0.68rem; color: #5a6a4a; display: flex; align-items: center; gap: 4px; margin-top: 3px; }

  .faction-modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.78); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 16px; }
  .faction-modal { background: #1a2e1a; border: 1px solid #2d3b2d; border-radius: 6px; width: min(480px, 100%); max-height: calc(100vh - 64px); overflow-y: auto; padding: 24px 24px 20px; position: relative; }
  .faction-modal-close { position: absolute; top: 12px; right: 14px; background: none; border: none; color: #5a6a4a; cursor: pointer; font-size: 1.1rem; line-height: 1; padding: 4px 8px; border-radius: 3px; transition: color 0.15s; }
  .faction-modal-close:hover { color: #f2e8d0; }
  .faction-modal-title { font-family: 'Cinzel', serif; font-size: 1.1rem; color: #c9922a; margin-bottom: 2px; padding-right: 36px; }
  .faction-modal-sub { font-size: 0.62rem; color: #5a6a4a; letter-spacing: 0.2em; text-transform: uppercase; font-family: 'Cinzel', serif; margin-bottom: 18px; }
  .faction-detail-row { display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: #152515; border: 1px solid #2d3b2d; border-radius: 4px; margin-bottom: 6px; }
  .faction-detail-name { flex: 1; font-size: 0.88rem; color: #f2e8d0; }
  .faction-detail-stats { text-align: right; font-size: 0.8rem; color: #7a8a6a; line-height: 1.5; min-width: 88px; }
  .faction-detail-pct { font-size: 0.72rem; color: #a0b090; }

  @media (max-width: 500px) {
    .form-grid { grid-template-columns: 1fr; }
    .game-players { max-width: 170px; }
    .lb-row { grid-template-columns: 28px 1fr 60px 44px 50px; }
    .player-row { grid-template-columns: 1fr 1fr 32px; }
  }
`;


export default function GroupLeaderboard({
  joinCode,
  groupName,
}: {
  joinCode: string;
  groupName: string;
}) {
  const { data: session } = useSession();
  const [me, setMe] = useState<Me | null | undefined>(undefined); // undefined = loading
  const [games, setGames] = useState<Game[]>([]);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showRoster, setShowRoster] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [joinName, setJoinName] = useState("");
  const [joinError, setJoinError] = useState("");
  const [newPlayerName, setNewPlayerName] = useState("");

  const [gameDate, setGameDate] = useState(new Date().toISOString().slice(0, 10));
  const [victoryType, setVictoryType] = useState("Score (30pts)");
  const [gameRows, setGameRows] = useState([emptyGameRow(), emptyGameRow(), emptyGameRow(), emptyGameRow()]);
  const [winnerId, setWinnerId] = useState(0);
  const [winnerIds, setWinnerIds] = useState<number[]>([]);
  const [isVirtual, setIsVirtual] = useState(true);
  const [hasHirelings, setHasHirelings] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [scanError, setScanError] = useState("");
  const [scanning, setScanning] = useState(false);
  const [gamesPage, setGamesPage] = useState(0);
  const [pageSize, setPageSize] = useState(5);
  const [factionModal, setFactionModal] = useState<string | null>(null);

  const isCoalition = victoryType === "Coalition";

  useEffect(() => { loadAll(); }, []);
  useEffect(() => {
    if (!factionModal) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setFactionModal(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [factionModal]);
  useEffect(() => {
    if (session) {
      fetch("/api/me").then((r) => r.ok ? r.json() : null).then(setMe);
    } else if (session === null) {
      setMe(null);
    }
  }, [session]);

  async function loadAll() {
    setLoading(true);
    try {
      const [gRes, rRes] = await Promise.all([
        fetch(`/api/groups/${joinCode}/games`),
        fetch(`/api/groups/${joinCode}/roster`),
      ]);
      if (gRes.ok) setGames(await gRes.json());
      if (rRes.ok) setRoster(await rRes.json());
    } catch (_) {}
    setLoading(false);
  }

  async function addToRoster() {
    const name = newPlayerName.trim();
    if (!name) return;
    const res = await fetch(`/api/groups/${joinCode}/roster`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerName: name }),
    });
    if (res.ok) {
      setNewPlayerName("");
      await loadAll();
    }
  }

  async function removeFromRoster(playerName: string) {
    await fetch(`/api/groups/${joinCode}/roster/${encodeURIComponent(playerName)}`, {
      method: "DELETE",
    });
    await loadAll();
  }

  async function joinGroup() {
    setJoinError("");
    const body = me?.claimedPlayer ? {} : { playerName: joinName.trim() };
    const res = await fetch(`/api/groups/${joinCode}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      await Promise.all([loadAll(), fetch("/api/me").then((r) => r.json()).then(setMe)]);
      setJoinName("");
    } else {
      const data = await res.json();
      setJoinError(data.error ?? "Failed to join.");
    }
  }

  async function claimPlayer(playerName: string) {
    const res = await fetch("/api/players/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerName }),
    });
    if (res.ok) {
      await Promise.all([loadAll(), fetch("/api/me").then((r) => r.json()).then(setMe)]);
    }
  }

  async function unlinkPlayer() {
    const res = await fetch("/api/players/unlink", { method: "POST" });
    if (res.ok) {
      await Promise.all([loadAll(), fetch("/api/me").then((r) => r.json()).then(setMe)]);
    }
  }

  async function scanImage(file: File) {
    setScanError("");
    setScanning(true);
    try {
      const { names, factions } = await analyzeScreenshot(file);
      if (!names.length) {
        setScanError("No player names detected. Make sure you're uploading a Root end-game screenshot.");
        return;
      }
      const count = Math.max(2, Math.min(MAX_PLAYERS, names.length));
      setGameRows(
        Array.from({ length: count }, (_, i) => {
          const ocrName = names[i]?.toLowerCase() ?? "";
          // Fuzzy match OCR name against roster: exact first, then nearest by edit distance.
          // Threshold: 35% of the shorter string's length (min 2) to handle OCR noise.
          const exact = rosterNames.find((n) => n.toLowerCase() === ocrName);
          let playerId = exact ?? "";
          if (!playerId && ocrName) {
            let bestName = "", bestDist = Infinity;
            for (const n of rosterNames) {
              const d = levenshtein(ocrName, n.toLowerCase());
              if (d < bestDist) { bestDist = d; bestName = n; }
            }
            const threshold = Math.max(2, Math.round(Math.min(ocrName.length, bestName.length) * 0.35));
            if (bestDist <= threshold) playerId = bestName;
          }
          return { playerId, faction: factions[i] ?? "" };
        })
      );
      setWinnerId(0);
      setWinnerIds([]);
    } catch {
      setScanError("Failed to analyze screenshot. Please try again.");
    } finally {
      setScanning(false);
    }
  }

  function addGameRow() { setGameRows([...gameRows, emptyGameRow()]); }

  function removeGameRow(i: number) {
    if (gameRows.length <= 2) return;
    const next = gameRows.filter((_, idx) => idx !== i);
    setGameRows(next);
    if (winnerId >= next.length) setWinnerId(0);
    setWinnerIds(winnerIds.filter((id) => id !== i).map((id) => (id > i ? id - 1 : id)));
  }

  function updateGameRow(i: number, field: string, val: string) {
    setGameRows(gameRows.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)));
  }

  function toggleCoalitionWinner(i: number) {
    setWinnerIds((prev) =>
      prev.includes(i) ? prev.filter((x) => x !== i) : prev.length < 2 ? [...prev, i] : prev
    );
  }

  function resetForm() {
    setGameDate(new Date().toISOString().slice(0, 10));
    setVictoryType("Score (30pts)");
    setGameRows([emptyGameRow(), emptyGameRow(), emptyGameRow(), emptyGameRow()]);
    setWinnerId(0);
    setWinnerIds([]);
    setIsVirtual(true);
    setHasHirelings(false);
  }

  function rowName(row: { playerId: string }) { return row.playerId || ""; }

  async function logGame() {
    const coalition = victoryType === "Coalition";
    const players = gameRows.map((r, i) => ({
      name: rowName(r),
      faction: r.faction,
      isWinner: coalition ? winnerIds.includes(i) : i === winnerId,
    }));

    const res = await fetch(`/api/groups/${joinCode}/games`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: gameDate, victoryType, isVirtual, hasHirelings, players }),
    });

    if (res.ok) {
      resetForm();
      setShowForm(false);
      await loadAll();
    } else {
      const data = await res.json();
      alert(data.error ?? "Failed to save game.");
    }
  }

  async function deleteGame(id: string) {
    await fetch(`/api/groups/${joinCode}/games/${id}`, { method: "DELETE" });
    setGames((prev) => prev.filter((g) => g.id !== id));
  }

  // Games sorted newest-first for the battle log
  const sortedGames = [...games].sort((a, b) => b.date.localeCompare(a.date));
  const totalPages = Math.max(1, Math.ceil(sortedGames.length / pageSize));
  const safePage = Math.min(gamesPage, totalPages - 1);
  const pagedGames = sortedGames.slice(safePage * pageSize, (safePage + 1) * pageSize);
  const pageFirst = sortedGames.length === 0 ? 0 : safePage * pageSize + 1;
  const pageLast = Math.min((safePage + 1) * pageSize, sortedGames.length);

  // Leaderboard computation
  const rosterElo: Record<string, number> = {};
  for (const entry of roster) {
    rosterElo[entry.player.name.toLowerCase()] = entry.groupElo;
  }

  const playerStats: Record<string, { name: string; wins: number; games: number; factions: Set<string>; factionDetail: Record<string, { games: number; wins: number }> }> = {};
  for (const game of games) {
    for (const p of game.players) {
      const key = p.player.name.toLowerCase();
      if (!playerStats[key]) {
        playerStats[key] = { name: p.player.name, wins: 0, games: 0, factions: new Set(), factionDetail: {} };
      }
      playerStats[key].games++;
      if (p.faction) {
        playerStats[key].factions.add(p.faction);
        if (!playerStats[key].factionDetail[p.faction]) playerStats[key].factionDetail[p.faction] = { games: 0, wins: 0 };
        playerStats[key].factionDetail[p.faction].games++;
        if (p.isWinner) playerStats[key].factionDetail[p.faction].wins++;
      }
      if (p.isWinner) playerStats[key].wins++;
    }
  }
  const leaderboard = Object.values(playerStats)
    .map((p) => ({ ...p, groupElo: rosterElo[p.name.toLowerCase()] ?? 1000 }))
    .sort((a, b) => b.groupElo - a.groupElo);

  const factionWins: Record<string, number> = {};
  for (const game of games) {
    for (const p of game.players) {
      if (p.isWinner && p.faction) factionWins[p.faction] = (factionWins[p.faction] || 0) + 1;
    }
  }
  const topFactionId = Object.entries(factionWins).sort((a, b) => b[1] - a[1])[0]?.[0];
  const topFaction = topFactionId ? FACTION_MAP[topFactionId] : null;

  const isMember = !!me && roster.some((r) => r.player.claimedBy?.id === me.id);

  const usedNames = gameRows.map((r) => rowName(r));
  const namesUnique = new Set(usedNames.filter(Boolean)).size === usedNames.filter(Boolean).length;

  const VAGABOND_FACTIONS = new Set(["vagabond", "vagabond2"]);
  const vagabondRowIndex = gameRows.findIndex((r) => VAGABOND_FACTIONS.has(r.faction));
  const hasVagabondInGame = !isCoalition || vagabondRowIndex !== -1;
  const vagabondIsWinner = !isCoalition || winnerIds.length !== 2 || winnerIds.some((i) => VAGABOND_FACTIONS.has(gameRows[i].faction));

  const formValid =
    gameRows.every((r) => rowName(r) && r.faction) &&
    namesUnique &&
    gameDate &&
    hasVagabondInGame &&
    vagabondIsWinner &&
    (isCoalition ? winnerIds.length === 2 : true);

  const rosterNames = roster.map((r) => r.player.name);

  function availableForRow(i: number) {
    const taken = new Set(gameRows.filter((_, idx) => idx !== i).map((r) => r.playerId).filter(Boolean));
    return rosterNames.filter((n) => !taken.has(n));
  }

  return (
    <>
      <style>{styles}</style>
      <div className="app">
        <div className="hero">
          <div className="auth-bar">
            {session ? (
              <>
                <span className="auth-name">{me?.claimedPlayer?.name ?? session.user?.name}</span>
                <button className="btn-auth" onClick={() => signOut()}>Sign out</button>
              </>
            ) : (
              <button className="btn-auth" onClick={() => signIn("google")}>Sign in</button>
            )}
          </div>
          <div className="hero-title">The Woodland Chronicles</div>
          <div className="hero-sub">{groupName}</div>
          <div className="join-code">Join code: <span>{joinCode}</span></div>
        </div>

        <div className="container">
          {loading ? (
            <div className="page-loader">
              <div className="spinner" />
              <div className="loader-text">Loading the chronicles…</div>
            </div>
          ) : (
          <>
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
                  <div className="stat-card-value">{topFaction && topFactionId ? <FactionIcon id={topFactionId} size={60} /> : "—"}</div>
                  <div className="stat-card-label">{topFaction ? "Top Faction" : "No Data"}</div>
                </div>
              </div>
            </>
          )}

          {session && me !== undefined && !isMember && (
            <div className="join-banner">
              <div className="join-banner-title">Join this group</div>
              {me?.claimedPlayer ? (
                <div className="join-banner-row">
                  <span style={{ fontSize: "0.85rem", color: "#a0b090", flex: 1 }}>
                    Join as <strong style={{ color: "#f2e8d0" }}>{me.claimedPlayer.name}</strong>
                  </span>
                  <button className="btn-primary" style={{ marginTop: 0 }} onClick={joinGroup}>Join</button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div className="join-banner-row">
                    <input
                      placeholder="Your Root username"
                      value={joinName}
                      onChange={(e) => setJoinName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && joinName.trim() && joinGroup()}
                    />
                    <button className="btn-primary" style={{ marginTop: 0, whiteSpace: "nowrap" }} onClick={joinGroup} disabled={!joinName.trim()}>
                      Join &amp; Claim
                    </button>
                  </div>
                  {joinError && <div className="notice">{joinError}</div>}
                </div>
              )}
            </div>
          )}

          {isMember && (
          <div className="section-label" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span>Roster</span>
            <button className="roster-toggle" onClick={() => setShowRoster(!showRoster)}>
              {showRoster ? "hide" : "manage"}
            </button>
          </div>
          )}
          {isMember && showRoster && (
            <div className="form-card">
              <div className="roster-grid">
                {roster.length === 0 ? (
                  <div className="no-roster">No players yet. Add your group below.</div>
                ) : (
                  roster.map((entry) => {
                    const isMyPlayer = me && entry.player.claimedBy?.id === me.id;
                    const isClaimed = !!entry.player.claimedBy;
                    const canClaim = me && !me.claimedPlayer && !isClaimed;
                    return (
                      <div key={entry.player.name} className="roster-row">
                        <span className="roster-name">{entry.player.name}</span>
                        {isMyPlayer && <span className="claimed-badge">you</span>}
                        {!isMyPlayer && isClaimed && <span className="claimed-badge">claimed</span>}
                        {isMyPlayer && (
                          <button className="btn-unlink" onClick={unlinkPlayer}>Unlink</button>
                        )}
                        {canClaim && (
                          <button className="btn-claim" onClick={() => claimPlayer(entry.player.name)}>Claim</button>
                        )}
                        {!isClaimed && !canClaim && !isMyPlayer && (
                          <button className="delete-btn" onClick={() => removeFromRoster(entry.player.name)} title="Remove">✕</button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
              <div className="add-roster-row">
                <input
                  placeholder="Player name"
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addToRoster()}
                />
                <button className="add-roster-btn" onClick={addToRoster} disabled={!newPlayerName.trim()}>
                  + Add
                </button>
              </div>
            </div>
          )}

          <button className="toggle-form-btn" onClick={() => setShowForm(!showForm)}>
            {showForm ? "✕ Cancel" : "+ Log a Battle"}
          </button>

          {showForm && (
            <div className="form-card" style={{ marginTop: 12 }}>
              {roster.length === 0 && (
                <div className="notice" style={{ marginBottom: 14 }}>
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
                    {([["Virtual", true, "🖥️"], ["In Person", false, "🎲"]] as const).map(([label, val, icon]) => {
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
                <div className="field" style={{ gridColumn: "1 / -1" }}>
                  <label className="field-label">Modules</label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setHasHirelings(!hasHirelings)} style={{
                      flex: 1, background: hasHirelings ? "rgba(139,58,26,0.25)" : "#152515",
                      border: `1px solid ${hasHirelings ? "#8b3a1a" : "#2d3b2d"}`, borderRadius: 3,
                      color: hasHirelings ? "#c9922a" : "#7a8a6a", cursor: "pointer",
                      fontFamily: "'Lato', sans-serif", fontSize: "0.85rem", padding: "8px", transition: "all 0.15s",
                    }}>
                      🐾 Hirelings
                    </button>
                  </div>
                </div>
              </div>

              <div className="players-section">
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  onChange={(e) => { if (e.target.files?.[0]) scanImage(e.target.files[0]); e.target.value = ""; }}
                />
                <button
                  className="add-player-btn"
                  style={{ marginBottom: 12 }}
                  onClick={() => imageInputRef.current?.click()}
                  disabled={scanning}
                >
                  {scanning ? "⏳ Scanning screenshot…" : "📷 Scan screenshot to prefill"}
                </button>
                {scanError && <div className="notice" style={{ marginBottom: 10 }}>{scanError}</div>}
                <div className="field-label" style={{ marginBottom: 8 }}>Players in this game</div>
                <div className="players-list">
                  {gameRows.map((row, i) => (
                    <div key={i} className="player-row">
                      <div className="field">
                        {rosterNames.length > 0 ? (
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
                        <FactionSelect value={row.faction} onChange={(id) => updateGameRow(i, "faction", id)} />
                      </div>
                      <button className="remove-player" onClick={() => removeGameRow(i)} disabled={gameRows.length <= 2}>−</button>
                    </div>
                  ))}
                </div>
                {gameRows.length < MAX_PLAYERS && (
                  <button className="add-player-btn" onClick={addGameRow}>+ Add Player</button>
                )}
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
                <div className="notice" style={{ marginTop: 10 }}>
                  Each player can only appear once per game.
                </div>
              )}
              {isCoalition && !hasVagabondInGame && (
                <div className="notice" style={{ marginTop: 10 }}>
                  Coalition requires a Vagabond in the game.
                </div>
              )}
              {isCoalition && hasVagabondInGame && !vagabondIsWinner && (
                <div className="notice" style={{ marginTop: 10 }}>
                  The Vagabond must be one of the coalition winners.
                </div>
              )}

              <div className="form-actions">
                <button className="btn-secondary" onClick={() => { resetForm(); setShowForm(false); }}>Cancel</button>
                <button className="btn-primary" onClick={logGame} disabled={!formValid}>Record Battle</button>
              </div>
            </div>
          )}

          <div className="section-label">Standings</div>
          <div className="leaderboard">
            <div className="lb-row lb-header">
              <span>#</span>
              <span>Denizen</span>
              <span style={{ textAlign: "center" }}>ELO</span>
              <span style={{ textAlign: "center" }}>Wins</span>
              <span style={{ textAlign: "center" }}>Games</span>
            </div>
            {leaderboard.length === 0 ? (
              <div className="empty-state">No battles recorded yet. Log a game to begin.</div>
            ) : (
              leaderboard.map((p, i) => (
                <div key={p.name} className={`lb-row ${i === 0 ? "top-player" : ""}`}>
                  <span className={`rank rank-${i + 1}`}>{i + 1}</span>
                  <div className="player-info">
                    <span className="player-name">{p.name}</span>
                    {p.factions.size > 0 && (
                      <div className="faction-count">
                        <span>{p.factions.size} {p.factions.size === 1 ? "faction" : "factions"}</span>
                        <button className="faction-detail-btn" onClick={() => setFactionModal(p.name)}>
                          see details
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="stat">
                    <div className="stat-elo">{p.groupElo}</div>
                    <div className="stat-elo-label">pts</div>
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

          {sortedGames.length > 0 && (
            <>
              <div className="section-label">Battle Log</div>
              <div className="game-log">
                {pagedGames.map((g) => {
                  const winners = g.players.filter((p) => p.isWinner);
                  const winnerNames = new Set(winners.map((w) => w.player.name));
                  return (
                    <div key={g.id} className="game-card">
                      <div className="game-date">
                        {g.date.slice(0, 10)}
                        <div style={{ marginTop: 4 }}>
                          <span style={{
                            fontSize: "0.6rem", padding: "1px 5px",
                            background: !g.isVirtual ? "rgba(90,138,58,0.2)" : "rgba(74,144,217,0.15)",
                            border: `1px solid ${!g.isVirtual ? "#5a8a3a55" : "#4a90d955"}`,
                            borderRadius: 2,
                            color: !g.isVirtual ? "#8ab070" : "#7ab0d0",
                            letterSpacing: "0.06em",
                          }}>
                            {!g.isVirtual ? "🎲 In Person" : "🖥️ Virtual"}
                          </span>
                        </div>
                        {g.hasHirelings && (
                          <div style={{ marginTop: 4 }}>
                            <span style={{ fontSize: "0.6rem", padding: "1px 5px", background: "rgba(201,146,42,0.1)", border: "1px solid #c9922a44", borderRadius: 2, color: "#c9922a", letterSpacing: "0.06em" }}>
                              Hirelings
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="game-winner">
                        <span className="winner-label">{winners.length > 1 ? "Coalition" : "Victor"}</span>
                        {winners.map((w) => {
                          const wf = FACTION_MAP[w.faction];
                          return (
                            <div key={w.player.name} className="winner-entry">
                              <span className="winner-name">{w.player.name}</span>
                              <span className="winner-faction">
                                {wf ? <><FactionIcon id={w.faction} size={28} /> {wf.name}</> : w.faction}
                              </span>
                            </div>
                          );
                        })}
                        <div className="victory-badge" style={{ marginTop: 4 }}>{g.victoryType}</div>
                      </div>
                      <div className="game-players">
                        {g.players.filter((p) => !winnerNames.has(p.player.name)).map((p) => {
                          const pf = FACTION_MAP[p.faction];
                          return (
                            <span key={p.player.name} className="player-chip">
                              {pf ? <FactionIcon id={p.faction} size={30} /> : null} {p.player.name}
                            </span>
                          );
                        })}
                      </div>
                      {confirmDeleteId === g.id ? (
                        <div className="confirm-delete">
                          <span className="confirm-text">Delete?</span>
                          <button className="confirm-yes" onClick={() => { deleteGame(g.id); setConfirmDeleteId(null); }}>Yes</button>
                          <button className="confirm-no" onClick={() => setConfirmDeleteId(null)}>No</button>
                        </div>
                      ) : (
                        <button className="delete-btn" onClick={() => setConfirmDeleteId(g.id)} title="Delete">✕</button>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="pagination">
                <button
                  className="pagination-btn"
                  disabled={safePage === 0}
                  onClick={() => setGamesPage((p) => p - 1)}
                >
                  ← Prev
                </button>
                <div className="pagination-info">
                  Page {safePage + 1} of {totalPages}
                  <br />
                  {pageFirst}–{pageLast} of {sortedGames.length} battles
                </div>
                <button
                  className="pagination-btn"
                  disabled={safePage >= totalPages - 1}
                  onClick={() => setGamesPage((p) => p + 1)}
                >
                  Next →
                </button>
                <select
                  className="page-size-select"
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setGamesPage(0); }}
                >
                  <option value={5}>5 / page</option>
                  <option value={10}>10 / page</option>
                  <option value={15}>15 / page</option>
                </select>
              </div>
            </>
          )}
          </>
          )}
        </div>
      </div>

      {factionModal && (() => {
        const entry = leaderboard.find((x) => x.name === factionModal);
        if (!entry) return null;
        const details = Object.entries(entry.factionDetail).sort((a, b) => b[1].games - a[1].games);
        return (
          <div className="faction-modal-backdrop" onClick={() => setFactionModal(null)}>
            <div className="faction-modal" onClick={(e) => e.stopPropagation()}>
              <button className="faction-modal-close" onClick={() => setFactionModal(null)}>✕</button>
              <div className="faction-modal-title">{entry.name}</div>
              <div className="faction-modal-sub">Faction History</div>
              {details.map(([fid, stat]) => {
                const f = FACTION_MAP[fid];
                return (
                  <div key={fid} className="faction-detail-row">
                    <FactionIcon id={fid} size={36} />
                    <span className="faction-detail-name">{f?.name ?? fid}</span>
                    <div className="faction-detail-stats">
                      <div>{stat.wins}W / {stat.games}G</div>
                      <div className="faction-detail-pct">{Math.round((stat.wins / stat.games) * 100)}% win rate</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
    </>
  );
}
