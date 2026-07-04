"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import { FACTION_MAP, FactionIcon, FactionPortrait, FACTIONS_WITH_PORTRAIT, getFactionStyle } from "@/components/FactionIcon";
import { FactionSelect } from "@/components/FactionSelect";
import { PlayerSelect } from "@/components/PlayerSelect";
import { analyzeScreenshot, levenshtein } from "@/lib/screenshot-scan";

const VICTORY_TYPES = ["Score (30pts)", "Domination", "Coalition"];
// Emoji per stored VictoryType enum value — keeps footer victory tags the same
// height as the format tag (which carries an emoji).
const VICTORY_EMOJI: Record<string, string> = {
  SCORE: "🔢",
  DOMINATION: "👑",
  COALITION: "🤝",
};
const MAX_PLAYERS = 6;
const PROVISIONAL_THRESHOLD = 3;
const emptyGameRow = () => ({ playerId: "", faction: "", score: "" });


type Player = { id: string; name: string; claimedBy?: { id: string; name: string; image: string } | null };
type RosterEntry = { playerId: string; role: string; groupElo: number; player: Player };
type Me = { id: string; name: string | null; email: string; claimedPlayer: { id: string; name: string } | null };
type GamePlayer = { id: string; playerId: string; faction: string; isWinner: boolean; score: number | null; player: Player };
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
  .hof-link { display: inline-block; margin-top: 12px; font-family: 'Cinzel', serif; font-size: 0.72rem; letter-spacing: 0.12em; color: #c9922a; text-decoration: none; border: 1px solid #2d3b2d; border-radius: 4px; padding: 5px 12px; transition: all 0.15s; }
  .hof-link:hover { background: rgba(201,146,42,0.1); border-color: #c9922a; }

  .container { max-width: 780px; margin: 0 auto; padding: 0 16px; }
  .section-label { font-family: 'Cinzel', serif; font-size: 0.68rem; letter-spacing: 0.25em; color: var(--accent-label); text-transform: uppercase; margin: 32px 0 12px; }

  .leaderboard { background: #1a2e1a; border: 1px solid #2d3b2d; border-radius: 4px; overflow: hidden; }
  .lb-row { display: grid; grid-template-columns: 36px 1fr 76px 56px 52px 60px; gap: 0; align-items: center; padding: 10px 16px; border-bottom: 1px solid #1e2e1e; transition: background 0.15s; }
  .lb-row:last-child { border-bottom: none; }
  .lb-header { background: #152515; padding: 8px 16px; }
  .lb-header span { font-family: 'Cinzel', serif; font-size: 0.6rem; letter-spacing: 0.2em; color: #5a6a4a; text-transform: uppercase; }
  .lb-row:not(.lb-header):hover { background: #1e341e; }
  .lb-row.top-player { background: linear-gradient(90deg, rgba(201,146,42,0.08) 0%, transparent 80%); }
  .rank { font-family: 'Cinzel', serif; font-size: 0.85rem; color: #5a6a4a; font-weight: 600; }
  .rank-1 { color: #c9922a; } .rank-2 { color: #a0a0a0; } .rank-3 { color: #8b5a2a; }
  .player-info { display: flex; flex-direction: column; gap: 2px; }
  .faction-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 3px; }
  .faction-tag { font-size: 0.6rem; padding: 1px 6px 1px 3px; border-radius: 2px; border: 1px solid; opacity: 0.85; font-family: 'Lato', sans-serif; letter-spacing: 0.05em; display: inline-flex; align-items: center; gap: 3px; }
  .stat { text-align: center; font-size: 0.88rem; }
  .stat-wins { color: #c9922a; font-weight: 700; font-size: 1rem; }
  .stat-avg { color: #a0b090; font-size: 0.9rem; }
  .stat-elo { font-family: 'Cinzel', serif; color: #c9922a; font-weight: 700; font-size: 1rem; text-align: center; }
  .stat-elo.provisional { color: #7a6a40; }
  .stat-elo-label { font-size: 0.6rem; color: #5a6a4a; letter-spacing: 0.08em; text-align: center; }
  .stat-games { color: #7a8a6a; }
  .stat-pct { color: #a0b090; font-size: 0.8rem; }
  .empty-state { padding: 40px 16px; text-align: center; color: #5a6a4a; font-style: italic; font-size: 0.9rem; }

  .page-loader { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px; padding: 90px 16px; }
  .spinner { width: 38px; height: 38px; border: 3px solid #2d3b2d; border-top-color: #c9922a; border-radius: 50%; animation: spin 0.8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .loader-text { font-family: 'Cinzel', serif; font-size: 0.7rem; letter-spacing: 0.22em; color: #8a7a5a; text-transform: uppercase; }

  .game-log { display: flex; flex-direction: column; gap: 8px; }
  /* Card is a size container so its grid can adapt to the card's own width
     (which differs between the full-width mobile column and the half-width desktop column). */
  .game-card { background: #1a2e1a; border: 1px solid #2d3b2d; border-radius: 4px; padding: 12px 16px; container-type: inline-size; }
  /* Wide: footer tucks under the winner; losers + delete span both rows.
     The 1fr top row absorbs the slack so the footer sits at the bottom. */
  .game-body {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    grid-template-rows: 1fr auto;
    grid-template-areas:
      "winner losers delete"
      "footer losers delete";
    column-gap: 12px;
  }
  .game-body > .game-actions { grid-area: delete; display: flex; flex-direction: column; align-items: center; gap: 4px; }
  /* Narrow: footer drops to its own full-width row so its tags never overflow. */
  @container (max-width: 480px) {
    .game-body {
      grid-template-rows: auto auto;
      grid-template-areas:
        "winner losers delete"
        "footer footer footer";
    }
  }
  .game-winner { grid-area: winner; display: flex; flex-direction: column; gap: 7px; min-width: 0; }
  .winner-label { font-size: 0.62rem; letter-spacing: 0.18em; color: var(--accent-label); text-transform: uppercase; font-family: 'Cinzel', serif; margin-bottom: 2px; }
  .winner-entry { display: flex; flex-direction: row; align-items: flex-start; gap: 12px; }
  .winner-text { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
  .winner-name { font-weight: 700; font-size: 1.15rem; line-height: 1.2; color: #c9922a; }
  .winner-faction { font-size: 0.9rem; color: #a0b090; }
  .game-players { grid-area: losers; display: flex; flex-direction: column; gap: 7px; align-items: flex-start; }
  .player-chip { font-size: 0.85rem; color: #a0b090; white-space: nowrap; display: inline-flex; align-items: center; gap: 8px; }
  .player-chip-name { line-height: 1.1; }
  .delete-btn, .edit-scores-btn { background: none; border: none; color: #3a4a3a; cursor: pointer; font-size: 1rem; padding: 4px; line-height: 1; transition: color 0.15s; flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center; align-self: center; }
  .delete-btn:hover { color: #8b3a1a; }
  .edit-scores-btn:hover { color: var(--accent-label); }
  .confirm-delete { display: flex; align-items: center; gap: 6px; flex-shrink: 0; align-self: center; }
  .confirm-text { font-size: 0.72rem; color: #f2a866; white-space: nowrap; }
  .confirm-yes { background: #8b3a1a; border: none; border-radius: 3px; color: #f2e8d0; cursor: pointer; font-family: 'Lato', sans-serif; font-size: 0.72rem; padding: 4px 10px; transition: background 0.15s; }
  .confirm-yes:hover { background: #a04520; }
  .confirm-no { background: none; border: 1px solid #2d3b2d; border-radius: 3px; color: #a0b090; cursor: pointer; font-family: 'Lato', sans-serif; font-size: 0.72rem; padding: 4px 10px; transition: all 0.15s; }
  .confirm-no:hover { border-color: #5a6a4a; color: #f2e8d0; }
  .edit-scores-panel { grid-column: 1 / -1; margin-top: 12px; padding-top: 12px; border-top: 1px solid #2d3b2d; }
  .edit-scores-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 8px; }
  .edit-scores-name { font-size: 0.85rem; color: #d8e0c8; }
  .edit-scores-row input { width: 70px; }

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
  .player-row { display: grid; grid-template-columns: 1fr 1fr 56px 32px; gap: 8px; align-items: center; }
  .score-field input { width: 100%; }
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

  .game-footer { grid-area: footer; align-self: end; display: flex; align-items: center; flex-wrap: wrap; gap: 8px; padding-top: 10px; }
  .footer-date { font-family: 'Cinzel', serif; font-size: 0.66rem; letter-spacing: 0.1em; color: #7a8a6a; margin-right: 2px; }
  .footer-tag { font-size: 0.6rem; padding: 2px 7px; border-radius: 2px; letter-spacing: 0.06em; border: 1px solid; white-space: nowrap; }
  .tag-virtual { background: rgba(74,144,217,0.15); border-color: #4a90d955; color: #7ab0d0; }
  .tag-inperson { background: rgba(90,138,58,0.2); border-color: #5a8a3a55; color: #8ab070; }
  .tag-victory { background: rgba(139,58,26,0.2); border-color: #8b3a1a; color: #c9922a; }
  .tag-hirelings { background: rgba(201,146,42,0.1); border-color: #c9922a44; color: #c9922a; }

  .stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 8px; }
  .stat-card { background: #1a2e1a; border: 1px solid #2d3b2d; border-radius: 4px; padding: 14px 12px; text-align: center; }
  .stat-card-value { font-family: 'Cinzel', serif; font-size: 1.6rem; color: #c9922a; font-weight: 700; line-height: 1; }
  .stat-card-label { font-size: 0.62rem; color: var(--accent-label); letter-spacing: 0.15em; text-transform: uppercase; margin-top: 4px; }

  /* Sarcastic "Stupid Ass Nigga Award" award — very flashy: animated shiny golden border,
     a glint that sweeps across, a pulsing glow, bobbing trophies, gold gradient text. */
  .loser-award {
    position: relative; margin-top: 10px; border-radius: 7px; padding: 13px 18px; overflow: hidden;
    display: flex; align-items: center; gap: 14px; border: 2px solid transparent;
    background:
      linear-gradient(135deg, #2c2207 0%, #46380e 45%, #5c4a12 60%, #2c2207 100%) padding-box,
      linear-gradient(110deg, #7a5e16, #ffe9a0, #c9922a, #fff6cf, #b8861f, #ffe9a0, #7a5e16) border-box;
    background-size: 100% 100%, 300% 100%;
    animation: loserBorder 3s linear infinite, loserGlow 1.8s ease-in-out infinite alternate;
  }
  .loser-award::before {
    content: ''; position: absolute; inset: 0; pointer-events: none;
    background: linear-gradient(115deg, transparent 35%, rgba(255,243,200,0.40) 50%, transparent 65%);
    transform: translateX(-120%); animation: loserShine 3.2s ease-in-out infinite;
  }
  @keyframes loserBorder { to { background-position: 0 0, 300% 0; } }
  @keyframes loserShine { 0% { transform: translateX(-120%); } 55%, 100% { transform: translateX(120%); } }
  @keyframes loserGlow {
    from { box-shadow: 0 0 10px rgba(201,146,42,0.45), inset 0 0 14px rgba(255,220,140,0.12); }
    to   { box-shadow: 0 0 26px rgba(255,219,130,0.85), inset 0 0 22px rgba(255,230,160,0.22); }
  }
  .loser-medal { font-size: 1.9rem; line-height: 1; flex-shrink: 0; filter: drop-shadow(0 0 6px rgba(255,220,130,0.8)); animation: loserBob 1.6s ease-in-out infinite; }
  .loser-medal-right { animation-delay: 0.8s; }
  @keyframes loserBob { 0%,100% { transform: translateY(0) rotate(-6deg); } 50% { transform: translateY(-3px) rotate(6deg); } }
  .loser-text { flex: 1; text-align: center; position: relative; z-index: 1; min-width: 0; }
  .loser-label { font-family: 'Cinzel', serif; font-size: 0.6rem; letter-spacing: 0.3em; text-transform: uppercase; color: #ffe9a0; text-shadow: 0 0 8px rgba(255,210,120,0.6); }
  .loser-name { font-family: 'Cinzel', serif; font-weight: 700; font-size: 1.5rem; line-height: 1.15; margin-top: 2px;
    background: linear-gradient(180deg, #fff6cf 0%, #ffd86b 45%, #c9922a 100%);
    -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
    filter: drop-shadow(0 1px 2px rgba(0,0,0,0.55)); }
  .loser-sub { font-size: 0.62rem; letter-spacing: 0.12em; color: #e8c987; text-transform: uppercase; margin-top: 3px; opacity: 0.85; }
  /* "Least Retarded" champion award — same idea as the loser banner but understated:
     calm static gold border, soft static glow, a slow faint glint, no bobbing/pulsing. */
  .champ-award {
    position: relative; margin-top: 10px; border-radius: 7px; padding: 12px 18px; overflow: hidden;
    display: flex; align-items: center; gap: 14px; border: 1px solid #5e5026;
    background: linear-gradient(135deg, #1d2a17 0%, #25341a 50%, #1d2a17 100%);
    box-shadow: 0 0 10px rgba(201,146,42,0.16), inset 0 0 18px rgba(201,146,42,0.05);
  }
  .champ-award::before {
    content: ''; position: absolute; inset: 0; pointer-events: none;
    background: linear-gradient(115deg, transparent 40%, rgba(255,240,200,0.16) 50%, transparent 60%);
    transform: translateX(-120%); animation: champShine 5.5s ease-in-out infinite;
  }
  @keyframes champShine { 0% { transform: translateX(-120%); } 60%, 100% { transform: translateX(120%); } }
  .champ-crown { font-size: 1.55rem; line-height: 1; flex-shrink: 0; filter: drop-shadow(0 0 4px rgba(201,146,42,0.4)); }
  .champ-text { flex: 1; text-align: center; position: relative; z-index: 1; min-width: 0; }
  .champ-label { font-family: 'Cinzel', serif; font-size: 0.58rem; letter-spacing: 0.28em; text-transform: uppercase; color: var(--accent-label); }
  .champ-name { font-family: 'Cinzel', serif; font-weight: 700; font-size: 1.35rem; line-height: 1.15; margin-top: 2px;
    background: linear-gradient(180deg, #f0d488, #c9922a); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
  .champ-sub { font-size: 0.6rem; letter-spacing: 0.12em; color: #8a9a6a; text-transform: uppercase; margin-top: 3px; }

  /* Top Faction stat card — as flashy as the loser: animated shiny gold border, glint, pulsing glow. */
  .shimmer-card {
    position: relative; overflow: hidden; border: 2px solid transparent;
    background:
      linear-gradient(135deg, #2c2207 0%, #46380e 45%, #5c4a12 60%, #2c2207 100%) padding-box,
      linear-gradient(110deg, #7a5e16, #ffe9a0, #c9922a, #fff6cf, #b8861f, #ffe9a0, #7a5e16) border-box;
    background-size: 100% 100%, 300% 100%;
    animation: loserBorder 3s linear infinite, loserGlow 1.8s ease-in-out infinite alternate;
  }
  .shimmer-card::before {
    content: ''; position: absolute; inset: 0; pointer-events: none;
    background: linear-gradient(115deg, transparent 35%, rgba(255,243,200,0.40) 50%, transparent 65%);
    transform: translateX(-120%); animation: loserShine 3.2s ease-in-out infinite;
  }
  .shimmer-card .stat-card-value, .shimmer-card .stat-card-label { position: relative; z-index: 1; }
  .shimmer-card .stat-card-label { color: #ffe9a0; text-shadow: 0 0 8px rgba(255,210,120,0.6); }

  @media (prefers-reduced-motion: reduce) {
    .loser-award, .loser-award::before, .loser-medal,
    .champ-award::before, .shimmer-card, .shimmer-card::before { animation: none; }
  }

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

  .pagination { display: flex; flex-direction: column; gap: 8px; margin-top: 10px; }
  .pagination-pages { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
  .pagination-meta { display: flex; align-items: center; gap: 10px; }
  .pagination-info { font-family: 'Cinzel', serif; font-size: 0.62rem; letter-spacing: 0.1em; color: #5a6a4a; flex: 1; line-height: 1.5; }
  .pagination-btn { background: #1a2e1a; border: 1px solid #2d3b2d; border-radius: 3px; color: #a0b090; cursor: pointer; font-family: 'Lato', sans-serif; font-size: 0.78rem; padding: 5px 10px; transition: all 0.15s; white-space: nowrap; }
  .pagination-btn:hover:not(:disabled) { border-color: #5a6a4a; color: #f2e8d0; }
  .pagination-btn:disabled { opacity: 0.3; cursor: not-allowed; }
  .page-btn { background: #1a2e1a; border: 1px solid #2d3b2d; border-radius: 3px; color: #a0b090; cursor: pointer; font-family: 'Cinzel', serif; font-size: 0.72rem; min-width: 30px; height: 30px; padding: 0 6px; transition: all 0.15s; }
  .page-btn:hover { border-color: #5a6a4a; color: #f2e8d0; }
  .page-btn.active { background: rgba(201,146,42,0.12); border-color: #c9922a55; color: #c9922a; cursor: default; }
  .page-ellipsis { color: #5a6a4a; font-size: 0.8rem; padding: 0 2px; line-height: 30px; user-select: none; }
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
  .faction-modal-sub { font-size: 0.62rem; color: var(--accent-label); letter-spacing: 0.2em; text-transform: uppercase; font-family: 'Cinzel', serif; margin-bottom: 18px; }
  .faction-detail-row { display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: #152515; border: 1px solid #2d3b2d; border-radius: 4px; margin-bottom: 6px; }
  .faction-detail-name { flex: 1; font-size: 0.88rem; color: #f2e8d0; }
  .faction-detail-stats { text-align: right; font-size: 0.8rem; color: #7a8a6a; line-height: 1.5; min-width: 88px; }
  .faction-detail-pct { font-size: 0.72rem; color: #a0b090; }

  .player-name-btn { background: none; border: none; padding: 0; margin: 0; font-family: 'Lato', sans-serif; font-size: 0.95rem; font-weight: 700; line-height: 1.2; color: #f2e8d0; cursor: pointer; text-align: left; transition: color 0.15s; }
  .player-name-btn:hover { color: #c9922a; text-decoration: underline; text-underline-offset: 2px; }

  .profile-header { display: flex; align-items: center; gap: 14px; margin-bottom: 18px; padding-right: 36px; }
  .profile-avatar { width: 64px; height: 64px; border-radius: 50%; flex-shrink: 0; object-fit: cover; border: 2px solid #2d3b2d; background: #152515; }
  .profile-avatar-ph { display: flex; align-items: center; justify-content: center; color: #4a5a3a; }
  .profile-name { font-family: 'Cinzel', serif; font-size: 1.3rem; color: #c9922a; line-height: 1.1; }
  .profile-sub { font-size: 0.6rem; color: #5a6a4a; letter-spacing: 0.18em; text-transform: uppercase; font-family: 'Cinzel', serif; margin-top: 4px; }
  .profile-stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; margin-bottom: 20px; }
  .profile-stat { background: #152515; border: 1px solid #2d3b2d; border-radius: 4px; padding: 11px 12px; }
  .profile-stat-label { font-size: 0.72rem; color: var(--accent-label); letter-spacing: 0.08em; text-transform: uppercase; font-family: 'Lato', sans-serif; font-weight: 700; margin-bottom: 6px; }
  .profile-stat-value { font-size: 1.05rem; color: #f2e8d0; font-weight: 700; display: flex; align-items: center; gap: 6px; min-height: 22px; }
  .profile-stat-value.gold { color: #c9922a; font-family: 'Cinzel', serif; }
  .profile-stat-fac { font-size: 0.85rem; font-weight: 700; }
  .profile-stat-sub { font-size: 0.66rem; color: #7a8a6a; font-weight: 400; }
  .profile-donut-section { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; justify-content: center; }
  .profile-legend { display: flex; flex-direction: column; gap: 5px; flex: 1; min-width: 150px; }
  .profile-legend-row { display: flex; align-items: center; gap: 8px; font-size: 0.8rem; color: #d8e0c8; }
  .profile-legend-dot { width: 11px; height: 11px; border-radius: 2px; flex-shrink: 0; border: 1px solid rgba(0,0,0,0.3); }
  .profile-legend-name { flex: 1; }
  .profile-legend-val { color: #7a8a6a; font-size: 0.72rem; white-space: nowrap; }
  .profile-empty { font-size: 0.82rem; color: #5a6a4a; font-style: italic; padding: 8px 0; }
  .profile-stat-portrait { width: 24px; height: 24px; border-radius: 5px; }
  .profile-donut { width: 160px; height: 160px; }

  /* Desktop has room — scale the whole profile up and go 3-wide on the stat grid. */
  @media (min-width: 760px) {
    .profile-modal { width: min(660px, 100%); padding: 34px 36px 30px; }
    .profile-header { gap: 20px; margin-bottom: 24px; }
    .profile-avatar { width: 92px; height: 92px; }
    .profile-name { font-size: 1.8rem; }
    .profile-sub { font-size: 0.7rem; }
    .profile-stats-grid { grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 26px; }
    .profile-stat { padding: 14px; }
    .profile-stat-label { font-size: 0.82rem; margin-bottom: 8px; }
    .profile-stat-value { font-size: 1.3rem; min-height: 36px; }
    .profile-stat-fac { font-size: 1rem; }
    .profile-stat-sub { font-size: 0.78rem; }
    .profile-stat-portrait { width: 34px; height: 34px; border-radius: 6px; }
    .profile-modal .faction-modal-sub { font-size: 0.7rem; }
    .profile-donut { width: 210px; height: 210px; }
    .profile-donut-section { gap: 30px; }
    .profile-legend { min-width: 200px; gap: 8px; }
    .profile-legend-row { font-size: 0.92rem; }
    .profile-legend-dot { width: 13px; height: 13px; }
  }

  /* Standings + Battle Log stack on mobile, sit side by side on wider screens. */
  .main-grid { display: flex; flex-direction: column; }
  .main-col { min-width: 0; }
  /* The section label leads each column; reset its top margin so columns align. */
  .main-col > .section-label:first-child { margin-top: 24px; }

  @media (min-width: 900px) {
    .container { max-width: 1180px; }
    .main-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; align-items: start; }
  }

  @media (max-width: 500px) {
    .form-grid { grid-template-columns: 1fr; }
    .lb-row { grid-template-columns: 28px 1fr 60px 44px 42px 50px; }
    .player-row { grid-template-columns: 1fr 1fr 52px 32px; }
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
  const [editScoresId, setEditScoresId] = useState<string | null>(null);
  const [scoreDrafts, setScoreDrafts] = useState<Record<string, string>>({});
  const [savingScores, setSavingScores] = useState(false);
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
  const [logging, setLogging] = useState(false);
  const [gamesPage, setGamesPage] = useState(0);
  const [pageSize, setPageSize] = useState(5);
  const [factionModal, setFactionModal] = useState<string | null>(null);
  const [profileName, setProfileName] = useState<string | null>(null);

  const isCoalition = victoryType === "Coalition";

  useEffect(() => { loadAll(); }, []);
  useEffect(() => {
    if (!factionModal && !profileName) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setFactionModal(null);
      setProfileName(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [factionModal, profileName]);
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
          return { playerId, faction: factions[i] ?? "", score: "" };
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
    if (logging) return; // guard against double-submit
    const coalition = victoryType === "Coalition";
    const players = gameRows.map((r, i) => ({
      name: rowName(r),
      faction: r.faction,
      isWinner: coalition ? winnerIds.includes(i) : i === winnerId,
      score: r.score?.trim() ? r.score.trim() : undefined,
    }));

    // All-or-none: enforce client-side before hitting the API.
    const scored = players.filter((p) => p.score !== undefined).length;
    if (scored !== 0 && scored !== players.length) {
      alert("Enter a score for every player, or leave them all blank.");
      return;
    }

    setLogging(true);
    try {
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
    } finally {
      setLogging(false);
    }
  }

  async function deleteGame(id: string) {
    await fetch(`/api/groups/${joinCode}/games/${id}`, { method: "DELETE" });
    setGames((prev) => prev.filter((g) => g.id !== id));
  }

  function openEditScores(g: Game) {
    const drafts: Record<string, string> = {};
    for (const p of g.players) drafts[p.id] = p.score != null ? String(p.score) : "";
    setScoreDrafts(drafts);
    setEditScoresId(g.id);
  }

  async function saveScores(g: Game) {
    if (savingScores) return;
    const players = g.players.map((p) => ({
      id: p.id,
      score: scoreDrafts[p.id]?.trim() ? scoreDrafts[p.id].trim() : undefined,
    }));

    // All-or-none: enforce client-side before hitting the API.
    const scored = players.filter((p) => p.score !== undefined).length;
    if (scored !== 0 && scored !== players.length) {
      alert("Enter a score for every player, or leave them all blank.");
      return;
    }

    setSavingScores(true);
    try {
      const res = await fetch(`/api/groups/${joinCode}/games/${g.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ players }),
      });
      if (res.ok) {
        const updated = await res.json();
        setGames((prev) => prev.map((game) => (game.id === g.id ? updated : game)));
        setEditScoresId(null);
      } else {
        const data = await res.json();
        alert(data.error ?? "Failed to update scores.");
      }
    } finally {
      setSavingScores(false);
    }
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

  const playerStats: Record<string, { name: string; wins: number; games: number; scoreSum: number; scoredGames: number; factions: Set<string>; factionDetail: Record<string, { games: number; wins: number }> }> = {};
  for (const game of games) {
    for (const p of game.players) {
      const key = p.player.name.toLowerCase();
      if (!playerStats[key]) {
        playerStats[key] = { name: p.player.name, wins: 0, games: 0, scoreSum: 0, scoredGames: 0, factions: new Set(), factionDetail: {} };
      }
      playerStats[key].games++;
      if (p.score != null) {
        playerStats[key].scoreSum += p.score;
        playerStats[key].scoredGames++;
      }
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
    .map((p) => ({
      ...p,
      groupElo: rosterElo[p.name.toLowerCase()] ?? 1000,
      avgScore: p.scoredGames > 0 ? p.scoreSum / p.scoredGames : null,
    }))
    .sort((a, b) => b.groupElo - a.groupElo);

  // The lowest-ELO denizen — our (sarcastic) "Stupid Ass Nigga Award". Needs 2+ players to mean anything.
  const biggestLoser = leaderboard.length >= 2 ? leaderboard[leaderboard.length - 1] : null;
  // The highest-ELO denizen — the (less sarcastic) "Least Retarded". Needs 2+ players.
  const topPlayer = leaderboard.length >= 2 ? leaderboard[0] : null;

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
          <Link className="hof-link" href={`/g/${joinCode}/hall-of-fame`}>🏛 Hall of Fame</Link>
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
                <div className={`stat-card${topFaction ? " shimmer-card" : ""}`}>
                  <div className="stat-card-value">{topFaction && topFactionId ? <FactionIcon id={topFactionId} size={60} /> : "—"}</div>
                  <div className="stat-card-label">{topFaction ? "Top Faction" : "No Data"}</div>
                </div>
              </div>
              {topPlayer && (
                <div className="champ-award">
                  <span className="champ-crown" aria-hidden="true">👑</span>
                  <div className="champ-text">
                    <div className="champ-label">Least Retarded</div>
                    <div className="champ-name">{topPlayer.name}</div>
                    <div className="champ-sub">Top of the heap · {topPlayer.groupElo} ELO</div>
                  </div>
                  <span className="champ-crown" aria-hidden="true">👑</span>
                </div>
              )}
              {biggestLoser && (
                <div className="loser-award">
                  <span className="loser-medal" aria-hidden="true">🏆</span>
                  <div className="loser-text">
                    <div className="loser-label">Stupid Ass Nigga Award</div>
                    <div className="loser-name">{biggestLoser.name}</div>
                    <div className="loser-sub">Dead last · {biggestLoser.groupElo} ELO</div>
                  </div>
                  <span className="loser-medal loser-medal-right" aria-hidden="true">🏆</span>
                </div>
              )}
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
                          <PlayerSelect
                            value={row.playerId}
                            options={availableForRow(i)}
                            onChange={(name) => updateGameRow(i, "playerId", name)}
                          />
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
                      <div className="field score-field">
                        <input
                          type="number"
                          min={0}
                          inputMode="numeric"
                          placeholder="VP"
                          value={row.score}
                          onChange={(e) => updateGameRow(i, "score", e.target.value)}
                        />
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
                <button className="btn-primary" onClick={logGame} disabled={!formValid || logging}>
                  {logging ? "Recording…" : "Record Battle"}
                </button>
              </div>
            </div>
          )}

          <div className="main-grid">
          <div className="main-col">
          <div className="section-label">Standings</div>
          <div className="leaderboard">
            <div className="lb-row lb-header">
              <span>#</span>
              <span>Denizen</span>
              <span style={{ textAlign: "center" }}>ELO</span>
              <span style={{ textAlign: "center" }}>Wins</span>
              <span style={{ textAlign: "center" }}>Avg</span>
              <span style={{ textAlign: "center" }}>Games</span>
            </div>
            {leaderboard.length === 0 ? (
              <div className="empty-state">No battles recorded yet. Log a game to begin.</div>
            ) : (
              leaderboard.map((p, i) => (
                <div key={p.name} className={`lb-row ${i === 0 ? "top-player" : ""}`}>
                  <span className={`rank rank-${i + 1}`}>{i + 1}</span>
                  <div className="player-info">
                    <button className="player-name-btn" onClick={() => setProfileName(p.name)} title="View profile">{p.name}</button>
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
                    <div className={`stat-elo${p.games < PROVISIONAL_THRESHOLD ? " provisional" : ""}`}>
                      {p.games < PROVISIONAL_THRESHOLD ? "~" : ""}{p.groupElo}
                    </div>
                    <div className="stat-elo-label">{p.games < PROVISIONAL_THRESHOLD ? "prov." : "pts"}</div>
                  </div>
                  <div className="stat"><span className="stat-wins">{p.wins}</span></div>
                  <div className="stat">
                    <span className="stat-avg">{p.avgScore != null ? p.avgScore.toFixed(1) : "–"}</span>
                  </div>
                  <div className="stat">
                    <div className="stat-games">{p.games}</div>
                    <div className="stat-pct">{Math.round((p.wins / p.games) * 100)}%</div>
                  </div>
                </div>
              ))
            )}
          </div>
          </div>

          {sortedGames.length > 0 && (
            <div className="main-col">
              <div className="section-label">Battle Log</div>
              <div className="game-log">
                {pagedGames.map((g) => {
                  const winners = g.players.filter((p) => p.isWinner);
                  const winnerNames = new Set(winners.map((w) => w.player.name));
                  return (
                    <div key={g.id} className="game-card">
                      <div className="game-body">
                        <div className="game-winner">
                          {winners.map((w, idx) => {
                            const wf = FACTION_MAP[w.faction];
                            return (
                              <div key={w.player.name} className="winner-entry">
                                {wf && <FactionIcon id={w.faction} size={72} />}
                                <div className="winner-text">
                                  {idx === 0 && <span className="winner-label">{winners.length > 1 ? "Coalition" : "Victor"}</span>}
                                  <span className="winner-name">{w.player.name}{w.score != null ? ` · ${w.score}` : ""}</span>
                                  <span className="winner-faction">{wf ? wf.name : w.faction}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        <div className="game-players">
                          <span className="winner-label">Retards</span>
                          {g.players.filter((p) => !winnerNames.has(p.player.name)).map((p) => {
                            const pf = FACTION_MAP[p.faction];
                            return (
                              <span key={p.player.name} className="player-chip">
                                {pf ? <FactionPortrait id={p.faction} size={26} radius={4} /> : null}
                                <span className="player-chip-name">{p.player.name}{p.score != null ? ` · ${p.score}` : ""}</span>
                              </span>
                            );
                          })}
                        </div>
                        <div className="game-actions">
                          <button className="edit-scores-btn" onClick={() => (editScoresId === g.id ? setEditScoresId(null) : openEditScores(g))} title="Edit VPs">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                              <path d="m15 5 4 4" />
                            </svg>
                          </button>
                          {confirmDeleteId === g.id ? (
                            <div className="confirm-delete">
                              <span className="confirm-text">Delete?</span>
                              <button className="confirm-yes" onClick={() => { deleteGame(g.id); setConfirmDeleteId(null); }}>Yes</button>
                              <button className="confirm-no" onClick={() => setConfirmDeleteId(null)}>No</button>
                            </div>
                          ) : (
                            <button className="delete-btn" onClick={() => setConfirmDeleteId(g.id)} title="Delete">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M3 6h18" />
                                <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
                                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                <line x1="10" y1="11" x2="10" y2="17" />
                                <line x1="14" y1="11" x2="14" y2="17" />
                              </svg>
                            </button>
                          )}
                        </div>
                        <div className="game-footer">
                          <span className="footer-date">{g.date.slice(0, 10)}</span>
                          <span className={`footer-tag ${g.isVirtual ? "tag-virtual" : "tag-inperson"}`}>
                            {g.isVirtual ? "🖥️ Virtual" : "🎲 In Person"}
                          </span>
                          <span className="footer-tag tag-victory">{VICTORY_EMOJI[g.victoryType]} {g.victoryType}</span>
                          {g.hasHirelings && <span className="footer-tag tag-hirelings">🐾 Hirelings</span>}
                        </div>
                        {editScoresId === g.id && (
                          <div className="edit-scores-panel">
                            <div className="field-label" style={{ marginBottom: 8 }}>Edit Victory Points</div>
                            {g.players.map((p) => (
                              <div key={p.id} className="edit-scores-row">
                                <span className="edit-scores-name">{p.player.name}</span>
                                <input
                                  type="number"
                                  min={0}
                                  inputMode="numeric"
                                  placeholder="VP"
                                  value={scoreDrafts[p.id] ?? ""}
                                  onChange={(e) => setScoreDrafts((prev) => ({ ...prev, [p.id]: e.target.value }))}
                                />
                              </div>
                            ))}
                            <div className="form-actions">
                              <button className="btn-secondary" onClick={() => setEditScoresId(null)}>Cancel</button>
                              <button className="btn-primary" onClick={() => saveScores(g)} disabled={savingScores}>
                                {savingScores ? "Saving…" : "Save"}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              {(() => {
                const lastPage = totalPages - 1;
                const windowEnd = Math.min(safePage + 3, lastPage);
                const windowPages = Array.from({ length: windowEnd - safePage + 1 }, (_, i) => safePage + i);
                const gapToLast = lastPage - windowEnd;
                return (
                  <div className="pagination">
                    <div className="pagination-pages">
                      <button className="pagination-btn" disabled={safePage === 0} onClick={() => setGamesPage((p) => p - 1)}>←</button>
                      {windowPages.map((pg) => (
                        <button key={pg} className={`page-btn${pg === safePage ? " active" : ""}`} onClick={() => setGamesPage(pg)}>
                          {pg + 1}
                        </button>
                      ))}
                      {gapToLast >= 2 && <span className="page-ellipsis">…</span>}
                      {gapToLast >= 1 && (
                        <button className="page-btn" onClick={() => setGamesPage(lastPage)}>{totalPages}</button>
                      )}
                      <button className="pagination-btn" disabled={safePage >= lastPage} onClick={() => setGamesPage((p) => p + 1)}>→</button>
                    </div>
                    <div className="pagination-meta">
                      <span className="pagination-info">{pageFirst}–{pageLast} of {sortedGames.length} battles</span>
                      <select className="page-size-select" value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setGamesPage(0); }}>
                        <option value={5}>5 / page</option>
                        <option value={10}>10 / page</option>
                        <option value={15}>15 / page</option>
                      </select>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
          </div>
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

      {profileName && (() => {
        const entry = leaderboard.find((x) => x.name === profileName);
        if (!entry) return null;
        const rosterEntry = roster.find((r) => r.player.name.toLowerCase() === profileName.toLowerCase());
        const googleImage = rosterEntry?.player.claimedBy?.image ?? null;
        const googleName = rosterEntry?.player.claimedBy?.name ?? null;

        const factionsPlayed = Object.entries(entry.factionDetail); // [fid, { games, wins }]
        const totalFactionGames = factionsPlayed.reduce((s, [, d]) => s + d.games, 0);
        const mostPlayed = [...factionsPlayed].sort((a, b) => b[1].games - a[1].games)[0] ?? null;
        const mostPlayedFid = mostPlayed ? mostPlayed[0] : null;
        // Avatar: Google photo if claimed, else the most-played faction's portrait, else a silhouette.
        const avatarSrc = googleImage
          ?? (mostPlayedFid && FACTIONS_WITH_PORTRAIT.has(mostPlayedFid)
            ? `/art/icons/${mostPlayedFid}-portrait.jpg`
            : null);

        // Dominant / weakest faction by win rate, only among factions played 2+ times.
        const eligible = factionsPlayed
          .filter(([, d]) => d.games >= 2)
          .map(([fid, d]) => ({ fid, games: d.games, wins: d.wins, rate: d.wins / d.games }))
          .sort((a, b) => b.rate - a.rate || b.games - a.games);
        const dominant = eligible.length > 0 ? eligible[0] : null;
        const noob = eligible.length > 1 ? eligible[eligible.length - 1] : null;

        const winPct = entry.games > 0 ? Math.round((entry.wins / entry.games) * 100) : 0;
        const provisional = entry.games < PROVISIONAL_THRESHOLD;
        const facLabel = (fid: string) => FACTION_MAP[fid]?.name ?? fid;

        // Donut segments (faction distribution by games played).
        const R = 60, CIRC = 2 * Math.PI * R;
        const segs = [...factionsPlayed]
          .map(([fid, d]) => ({ fid, games: d.games, frac: d.games / totalFactionGames }))
          .sort((a, b) => b.games - a.games);
        let acc = 0;

        return (
          <div className="faction-modal-backdrop" onClick={() => setProfileName(null)}>
            <div className="faction-modal profile-modal" onClick={(e) => e.stopPropagation()}>
              <button className="faction-modal-close" onClick={() => setProfileName(null)}>✕</button>

              <div className="profile-header">
                {avatarSrc ? (
                  <img className="profile-avatar" src={avatarSrc} alt={profileName} referrerPolicy="no-referrer" />
                ) : (
                  <div className="profile-avatar profile-avatar-ph">
                    <svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="12" cy="8.5" r="4" />
                      <path d="M4 21c0-4.4 3.6-7.5 8-7.5s8 3.1 8 7.5z" />
                    </svg>
                  </div>
                )}
                <div>
                  <div className="profile-name">{profileName}</div>
                  <div className="profile-sub">{googleName ?? "Unclaimed denizen"}</div>
                </div>
              </div>

              <div className="profile-stats-grid">
                <div className="profile-stat">
                  <div className="profile-stat-label">Games Played</div>
                  <div className="profile-stat-value">{entry.games}</div>
                </div>
                <div className="profile-stat">
                  <div className="profile-stat-label">Win Rate</div>
                  <div className="profile-stat-value">{winPct}%<span className="profile-stat-sub">{entry.wins}W</span></div>
                </div>
                <div className="profile-stat">
                  <div className="profile-stat-label">ELO</div>
                  <div className="profile-stat-value gold">{provisional ? "~" : ""}{entry.groupElo}{provisional && <span className="profile-stat-sub">prov.</span>}</div>
                </div>
                <div className="profile-stat">
                  <div className="profile-stat-label">Most Played</div>
                  <div className="profile-stat-value">
                    {mostPlayed
                      ? <><FactionPortrait id={mostPlayed[0]} size={26} className="profile-stat-portrait" /><span className="profile-stat-fac">{facLabel(mostPlayed[0])}</span></>
                      : "—"}
                  </div>
                </div>
                <div className="profile-stat">
                  <div className="profile-stat-label">Most Dominant</div>
                  <div className="profile-stat-value">
                    {dominant
                      ? <><FactionPortrait id={dominant.fid} size={26} className="profile-stat-portrait" /><span className="profile-stat-fac">{facLabel(dominant.fid)}</span><span className="profile-stat-sub">{Math.round(dominant.rate * 100)}%</span></>
                      : <span className="profile-stat-sub">Need 2+ games on a faction</span>}
                  </div>
                </div>
                <div className="profile-stat">
                  <div className="profile-stat-label">Most Retarded</div>
                  <div className="profile-stat-value">
                    {noob
                      ? <><FactionPortrait id={noob.fid} size={26} className="profile-stat-portrait" /><span className="profile-stat-fac">{facLabel(noob.fid)}</span><span className="profile-stat-sub">{Math.round(noob.rate * 100)}%</span></>
                      : <span className="profile-stat-sub">Not enough variety yet</span>}
                  </div>
                </div>
              </div>

              <div className="faction-modal-sub">Faction Distribution</div>
              {totalFactionGames === 0 ? (
                <div className="profile-empty">No games recorded yet.</div>
              ) : (
                <div className="profile-donut-section">
                  <svg className="profile-donut" width="160" height="160" viewBox="0 0 160 160">
                    <g transform="rotate(-90 80 80)">
                      {segs.map((s) => {
                        const dash = s.frac * CIRC;
                        const offset = -acc * CIRC;
                        acc += s.frac;
                        return (
                          <circle key={s.fid} cx="80" cy="80" r={R} fill="none"
                            stroke={FACTION_MAP[s.fid]?.color ?? "#5a6a4a"} strokeWidth="26"
                            strokeDasharray={`${dash} ${CIRC - dash}`} strokeDashoffset={offset} />
                        );
                      })}
                    </g>
                    <text x="80" y="78" textAnchor="middle" fontFamily="'Cinzel', serif" fontSize="24" fontWeight="700" fill="#c9922a">{entry.games}</text>
                    <text x="80" y="94" textAnchor="middle" fontFamily="'Cinzel', serif" fontSize="8" letterSpacing="2" fill="#5a6a4a">GAMES</text>
                  </svg>
                  <div className="profile-legend">
                    {segs.map((s) => (
                      <div key={s.fid} className="profile-legend-row">
                        <span className="profile-legend-dot" style={{ background: FACTION_MAP[s.fid]?.color ?? "#5a6a4a" }} />
                        <span className="profile-legend-name">{facLabel(s.fid)}</span>
                        <span className="profile-legend-val">{s.games} · {Math.round(s.frac * 100)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </>
  );
}
