"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

type MomentGamePlayer = { faction: string; isWinner: boolean; player: { name: string } };
type Moment = {
  id: string;
  gameId: string;
  title: string;
  description: string;
  kind: "GLORY" | "TARD";
  imageUrl: string | null;
  createdByUserId: string | null;
  createdAt: string;
  game: { id: string; date: string; victoryType: string; players: MomentGamePlayer[] };
};
type Loss29 = { id: string; name: string; count: number };
type GapRecord = {
  gameId: string;
  date: string;
  gap: number;
  first: { name: string; score: number };
  second: { name: string; score: number };
} | null;
type TallyRecord = { id: string; name: string; count: number } | null;
type Records = { blowout: GapRecord; crackhead: TallyRecord };
type Me = { id: string; claimedPlayer: { id: string; name: string } | null };
type GameLite = {
  id: string;
  date: string;
  players: { faction: string; isWinner: boolean; player: { name: string } }[];
};

const styles = `
  .hof { max-width: 760px; margin: 0 auto; padding: 24px 16px 64px; color: #f2e8d0; font-family: 'Lato', sans-serif; }
  .hof a { color: inherit; }
  .hof-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
  .hof-back { font-size: 0.72rem; letter-spacing: 0.08em; color: #7a8a6a; text-decoration: none; }
  .hof-back:hover { color: #c9922a; }
  .hof-title { font-family: 'Cinzel', serif; font-size: 1.6rem; color: #c9922a; }
  .hof-sub { font-size: 0.66rem; letter-spacing: 0.2em; text-transform: uppercase; color: #7a8a6a; margin-bottom: 28px; }
  .hof-section-title { font-family: 'Cinzel', serif; font-size: 1.05rem; color: #f2e8d0; margin: 32px 0 12px; border-bottom: 1px solid #2d3b2d; padding-bottom: 6px; }
  .womp-grid { display: flex; flex-wrap: wrap; gap: 10px; }
  .womp-cell { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 12px 18px; background: #152515; border: 1px solid #2d3b2d; border-radius: 6px; min-width: 92px; }
  .womp-name { font-size: 0.85rem; color: #d8cdb0; }
  .womp-count { font-family: 'Cinzel', serif; color: #8b3a1a; font-size: 1.5rem; line-height: 1; }
  .womp-count-label { font-size: 0.58rem; letter-spacing: 0.12em; text-transform: uppercase; color: #5a6a4a; }
  .record-row { display: flex; align-items: baseline; gap: 10px; padding: 10px 12px; background: #152515; border: 1px solid #2d3b2d; border-radius: 4px; margin-bottom: 6px; }
  .record-name { font-family: 'Cinzel', serif; color: #c9922a; font-size: 0.78rem; letter-spacing: 0.08em; min-width: 92px; }
  .record-val { color: #d8cdb0; font-size: 0.88rem; }
  .record-val b { color: #f2e8d0; }
  .record-meta { margin-left: auto; font-size: 0.64rem; color: #5a6a4a; }
  .empty { color: #5a6a4a; font-size: 0.85rem; font-style: italic; padding: 8px 0; }
  .moment-card { background: #152515; border: 1px solid #2d3b2d; border-radius: 6px; padding: 14px 16px; margin-bottom: 12px; }
  .moment-glory { border-left: 3px solid #c9922a; }
  .moment-tard { border-left: 3px solid #8b3a1a; }
  .moment-badge { display: inline-block; font-size: 0.6rem; letter-spacing: 0.1em; text-transform: uppercase; font-family: 'Cinzel', serif; padding: 2px 8px; border-radius: 3px; margin-bottom: 6px; }
  .badge-glory { background: rgba(201,146,42,0.15); color: #c9922a; }
  .badge-tard { background: rgba(139,58,26,0.2); color: #d2693a; }
  .moment-card img { max-width: 100%; border-radius: 4px; margin: 8px 0; border: 1px solid #2d3b2d; }
  .moment-title { font-family: 'Cinzel', serif; color: #c9922a; font-size: 1rem; }
  .moment-meta { font-size: 0.66rem; color: #7a8a6a; margin: 2px 0 8px; }
  .moment-desc { font-size: 0.9rem; line-height: 1.5; color: #d8cdb0; white-space: pre-wrap; }
  .moment-del { background: none; border: none; color: #5a6a4a; cursor: pointer; font-size: 0.7rem; margin-top: 8px; }
  .moment-del:hover { color: #8b3a1a; }
  .add-btn { background: #c9922a; color: #1a2e1a; border: none; border-radius: 4px; padding: 9px 16px; font-weight: 700; cursor: pointer; font-family: 'Cinzel', serif; }
  .add-btn:disabled { opacity: 0.5; cursor: default; }
  .form-box { background: #152515; border: 1px solid #2d3b2d; border-radius: 6px; padding: 16px; margin-bottom: 20px; display: flex; flex-direction: column; gap: 10px; }
  .form-box label { font-size: 0.7rem; letter-spacing: 0.08em; text-transform: uppercase; color: #7a8a6a; }
  .form-box input, .form-box textarea, .form-box select { width: 100%; background: #0e1a0e; border: 1px solid #2d3b2d; border-radius: 4px; color: #f2e8d0; padding: 8px 10px; font-family: inherit; font-size: 0.9rem; }
  .form-box textarea { min-height: 80px; resize: vertical; }
  .notice { color: #8b3a1a; font-size: 0.8rem; }
  .hof-loader { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 48px 0; color: #5a6a4a; font-size: 0.85rem; }
  .hof-spinner { width: 18px; height: 18px; border: 2px solid #2d3b2d; border-top-color: #c9922a; border-radius: 50%; animation: hof-spin 0.7s linear infinite; }
  @keyframes hof-spin { to { transform: rotate(360deg); } }
`;

async function safeJson(res: Response): Promise<Record<string, unknown> | null> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function gameLabel(g: { date: string; players: { isWinner: boolean; player: { name: string } }[] }) {
  const winner = g.players.find((p) => p.isWinner);
  return `${g.date.slice(0, 10)}${winner ? ` — ${winner.player.name}` : ""}`;
}

export default function HallOfFame({ joinCode, groupName }: { joinCode: string; groupName: string }) {
  const [moments, setMoments] = useState<Moment[]>([]);
  const [lossesAt29, setLossesAt29] = useState<Loss29[]>([]);
  const [records, setRecords] = useState<Records>({ blowout: null, crackhead: null });
  const [games, setGames] = useState<GameLite[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [roster, setRoster] = useState<{ player: { claimedBy?: { id: string } | null } }[]>([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [gameId, setGameId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState<"GLORY" | "TARD">("GLORY");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [hofRes, gamesRes, rosterRes, meRes] = await Promise.all([
      fetch(`/api/groups/${joinCode}/hall-of-fame`),
      fetch(`/api/groups/${joinCode}/games`),
      fetch(`/api/groups/${joinCode}/roster`),
      fetch("/api/me"),
    ]);
    const hof = await hofRes.json();
    setMoments(hof.moments ?? []);
    setLossesAt29(hof.lossesAt29 ?? []);
    setRecords(hof.records ?? { blowout: null, crackhead: null });
    setGames(await gamesRes.json());
    setRoster(await rosterRes.json());
    setMe(meRes.ok ? await meRes.json() : null);
  }, [joinCode]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const isMember = !!me && roster.some((r) => r.player.claimedBy?.id === me.id);

  async function submit() {
    setError("");
    if (!gameId) return setError("Pick a game to attach this moment to.");
    if (!title.trim()) return setError("A title is required.");
    if (!description.trim()) return setError("A description is required.");
    setSaving(true);
    try {
      let imageUrl: string | null = null;
      if (file) {
        const fd = new FormData();
        fd.append("file", file);
        const up = await fetch("/api/upload", { method: "POST", body: fd });
        const upData = await safeJson(up);
        if (!up.ok) {
          setError((upData?.error as string) ?? `Image upload failed (${up.status}).`);
          return;
        }
        imageUrl = (upData?.url as string | undefined) ?? null;
      }
      const res = await fetch(`/api/groups/${joinCode}/games/${gameId}/moments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), description: description.trim(), kind, imageUrl }),
      });
      if (!res.ok) {
        const data = await safeJson(res);
        setError((data?.error as string) ?? `Failed to save moment (${res.status}).`);
        return;
      }
      setTitle("");
      setDescription("");
      setKind("GLORY");
      setFile(null);
      setGameId("");
      setShowForm(false);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function del(m: Moment) {
    if (!confirm("Delete this moment?")) return;
    const res = await fetch(`/api/groups/${joinCode}/games/${m.gameId}/moments/${m.id}`, {
      method: "DELETE",
    });
    if (res.ok) setMoments((prev) => prev.filter((x) => x.id !== m.id));
  }

  return (
    <div className="hof">
      <style>{styles}</style>
      <div className="hof-top">
        <Link className="hof-back" href={`/g/${joinCode}`}>← {groupName}</Link>
        {!loading && isMember && !showForm && (
          <button className="add-btn" onClick={() => setShowForm(true)}>+ Record a Moment</button>
        )}
      </div>
      <div className="hof-title">Hall of Fame</div>
      <div className="hof-sub">Legends, blunders & heartbreaks</div>

      {loading && (
        <div className="hof-loader"><span className="hof-spinner" /> Loading the chronicles…</div>
      )}

      {showForm && isMember && (
        <div className="form-box">
          {error && <div className="notice">{error}</div>}
          <div>
            <label>Game</label>
            <select value={gameId} onChange={(e) => setGameId(e.target.value)}>
              <option value="">Select a game…</option>
              {games.map((g) => (
                <option key={g.id} value={g.id}>{gameLabel(g)}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Kind</label>
            <select value={kind} onChange={(e) => setKind(e.target.value as "GLORY" | "TARD")}>
              <option value="GLORY">🏅 Glory — high IQ</option>
              <option value="TARD">🤡 Tard — this player is extremely retarded</option>
            </select>
          </div>
          <div>
            <label>Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="29 points. Again." />
          </div>
          <div>
            <label>What happened</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <label>Screenshot (optional)</label>
            <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="add-btn" onClick={submit} disabled={saving}>
              {saving ? "Saving…" : "Save Moment"}
            </button>
            <button className="moment-del" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {!loading && (
        <>
          <div className="hof-section-title">🏆 Moments</div>
          {moments.length === 0 ? (
            <div className="empty">No moments yet. Go record one.</div>
          ) : (
            moments.map((m) => (
              <div key={m.id} className={`moment-card ${m.kind === "TARD" ? "moment-tard" : "moment-glory"}`}>
                <span className={`moment-badge ${m.kind === "TARD" ? "badge-tard" : "badge-glory"}`}>
                  {m.kind === "TARD" ? "🤡 Tard" : "🏅 Glory"}
                </span>
                <div className="moment-title">{m.title}</div>
                <div className="moment-meta">{gameLabel(m.game)}</div>
                {m.imageUrl && <img src={m.imageUrl} alt={m.title} />}
                <div className="moment-desc">{m.description}</div>
                {me && m.createdByUserId === me.id && (
                  <button className="moment-del" onClick={() => del(m)}>Delete</button>
                )}
              </div>
            ))
          )}

          <div className="hof-section-title">😩 Womp Womp Hall — losses at 29 points</div>
          {lossesAt29.length === 0 ? (
            <div className="empty">No 29-point womp womps recorded yet. Lucky them.</div>
          ) : (
            <div className="womp-grid">
              {lossesAt29.map((l) => (
                <div key={l.id} className="womp-cell">
                  <span className="womp-name">{l.name}</span>
                  <span className="womp-count">{l.count}</span>
                  <span className="womp-count-label">womp womps</span>
                </div>
              ))}
            </div>
          )}

          <div className="hof-section-title">📊 Records</div>
          {!records.blowout && !records.crackhead ? (
            <div className="empty">No records yet — log some games to fill these in.</div>
          ) : (
            <>
              {records.blowout && (
                <div className="record-row">
                  <span className="record-name">Blowout</span>
                  <span className="record-val">
                    <b>{records.blowout.first.name}</b> beat {records.blowout.second.name} by{" "}
                    <b>{records.blowout.gap}</b> ({records.blowout.first.score}–{records.blowout.second.score})
                  </span>
                  <span className="record-meta">{records.blowout.date.slice(0, 10)}</span>
                </div>
              )}
              {records.crackhead && (
                <div className="record-row">
                  <span className="record-name">Biggest Crackhead</span>
                  <span className="record-val">
                    <b>{records.crackhead.name}</b> has played <b>{records.crackhead.count}</b> games
                  </span>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
