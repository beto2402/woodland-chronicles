"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession, signIn, signOut } from "next-auth/react";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Lato:wght@300;400;700&display=swap');

  :root { --accent-label: #e08a3a; }
  .quinielas { min-height: 100vh; background: #0f1a0f; color: #f2e8d0; font-family: 'Lato', sans-serif; padding: 24px; }
  .container { max-width: 760px; margin: 0 auto; }
  .hero-title { font-family: 'Cinzel', serif; font-size: 1.7rem; font-weight: 700; letter-spacing: 0.06em; color: #c9922a; text-align: center; }
  .hero-sub { font-family: 'Cinzel', serif; font-size: 0.7rem; letter-spacing: 0.2em; color: #8a7a5a; margin-top: 6px; text-transform: uppercase; text-align: center; }
  .user-bar { display: flex; align-items: center; justify-content: space-between; margin: 20px 0; padding-bottom: 14px; border-bottom: 1px solid #2d3b2d; }
  .user-name { font-size: 0.82rem; color: #a0b090; }
  .btn-signout, .btn-toggle { background: none; border: 1px solid #2d3b2d; border-radius: 3px; color: #a0b090; cursor: pointer; font-family: 'Lato', sans-serif; font-size: 0.75rem; padding: 5px 10px; }
  .btn-signout:hover, .btn-toggle:hover { border-color: var(--accent-label); color: var(--accent-label); }
  .btn-google { background: #f2e8d0; border: none; border-radius: 3px; color: #1a1a1a; cursor: pointer; font-family: 'Lato', sans-serif; font-size: 0.88rem; font-weight: 700; padding: 11px 24px; width: 100%; display: flex; align-items: center; justify-content: center; gap: 10px; margin-top: 24px; }
  .tabs { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
  .tab { background: #152515; border: 1px solid #2d3b2d; border-radius: 3px; color: #a0b090; cursor: pointer; font-family: 'Cinzel', serif; font-size: 0.62rem; letter-spacing: 0.08em; text-transform: uppercase; padding: 7px 11px; }
  .tab.active { border-color: #c9922a; color: #c9922a; }
  .controls-row { display: flex; gap: 8px; margin-bottom: 18px; flex-wrap: wrap; }
  .controls-row input, .controls-row select { background: #152515; border: 1px solid #2d3b2d; border-radius: 3px; color: #f2e8d0; font-family: 'Lato', sans-serif; font-size: 0.82rem; padding: 7px 10px; }
  .card { background: #1a2e1a; border: 1px solid #2d3b2d; border-radius: 4px; padding: 16px; margin-bottom: 12px; }
  .card-meta { display: flex; justify-content: space-between; font-size: 0.68rem; color: #8a7a5a; margin-bottom: 10px; letter-spacing: 0.04em; }
  .matchup { display: flex; align-items: center; justify-content: center; gap: 14px; margin-bottom: 12px; }
  .team { flex: 1; text-align: center; font-size: 0.9rem; font-weight: 700; }
  .team.placeholder { font-weight: 400; font-style: italic; color: #6a7a5a; font-size: 0.78rem; }
  .score-actual { font-family: 'Cinzel', serif; font-size: 1.1rem; color: #c9922a; min-width: 64px; text-align: center; }
  .decided-tag { display: block; font-size: 0.6rem; color: #8a7a5a; text-align: center; margin-top: 2px; letter-spacing: 0.06em; }
  .vs { color: #5a6a4a; font-size: 0.75rem; }
  .pick-row { display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 10px; }
  .pick-row input[type="number"] { width: 46px; background: #152515; border: 1px solid #2d3b2d; border-radius: 3px; color: #f2e8d0; text-align: center; padding: 6px 4px; font-size: 0.9rem; }
  .pick-row select { background: #152515; border: 1px solid #2d3b2d; border-radius: 3px; color: #a0b090; font-size: 0.72rem; padding: 5px; }
  .btn-save { background: #8b3a1a; border: none; border-radius: 3px; color: #f2e8d0; cursor: pointer; font-family: 'Cinzel', serif; font-size: 0.68rem; letter-spacing: 0.08em; padding: 7px 14px; text-transform: uppercase; }
  .btn-save:hover { background: #a04520; }
  .btn-save:disabled { background: #2d3b2d; color: #5a6a4a; cursor: not-allowed; }
  .locked-note { text-align: center; font-size: 0.7rem; color: #5a6a4a; margin-top: 8px; }
  .my-pick { text-align: center; font-size: 0.8rem; color: #a0b090; margin-top: 8px; }
  .all-picks { margin-top: 10px; border-top: 1px solid #2d3b2d; padding-top: 10px; }
  .all-picks-title { font-size: 0.62rem; letter-spacing: 0.14em; color: var(--accent-label); text-transform: uppercase; margin-bottom: 6px; }
  .pick-line { display: flex; justify-content: space-between; font-size: 0.78rem; color: #a0b090; padding: 2px 0; }
  .pick-line.correct { color: #c9922a; font-weight: 700; }
  .result-toggle { text-align: center; margin-top: 10px; }
  .result-form { display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 10px; flex-wrap: wrap; }
  .error { font-size: 0.72rem; color: #f2a866; margin-top: 6px; text-align: center; }
  .empty { text-align: center; color: #5a6a4a; padding: 40px 0; }
`;

const STAGES = [
  { key: "GROUP", label: "Group Stage" },
  { key: "ROUND_OF_32", label: "Round of 32" },
  { key: "ROUND_OF_16", label: "Round of 16" },
  { key: "QUARTERFINAL", label: "Quarterfinal" },
  { key: "SEMIFINAL", label: "Semifinal" },
  { key: "THIRD_PLACE", label: "Third Place" },
  { key: "FINAL", label: "Final" },
] as const;

type DecidedBy = "REGULATION" | "EXTRA_TIME" | "PENALTIES";

type PickShape = {
  homeScore: number;
  awayScore: number;
  decidedBy: DecidedBy;
  penaltyHomeScore: number | null;
  penaltyAwayScore: number | null;
};

type Match = {
  id: string;
  matchNumber: number;
  stage: (typeof STAGES)[number]["key"];
  groupName: string | null;
  homeTeam: string | null;
  homeTeamPlaceholder: string | null;
  awayTeam: string | null;
  awayTeamPlaceholder: string | null;
  kickoffAt: string;
  venue: string | null;
  homeScore: number | null;
  awayScore: number | null;
  decidedBy: DecidedBy | null;
  penaltyHomeScore: number | null;
  penaltyAwayScore: number | null;
  winnerTeam: string | null;
  locked: boolean;
  myPick: PickShape | null;
  allPicks: (PickShape & { userName: string | null })[];
};

type Draft = {
  homeScore: string;
  awayScore: string;
  decidedBy: DecidedBy;
  penaltyHomeScore: string;
  penaltyAwayScore: string;
};

const EMPTY_DRAFT: Draft = { homeScore: "", awayScore: "", decidedBy: "REGULATION", penaltyHomeScore: "", penaltyAwayScore: "" };

function draftFromPick(pick: PickShape | null): Draft {
  if (!pick) return { ...EMPTY_DRAFT };
  return {
    homeScore: String(pick.homeScore),
    awayScore: String(pick.awayScore),
    decidedBy: pick.decidedBy,
    penaltyHomeScore: pick.penaltyHomeScore != null ? String(pick.penaltyHomeScore) : "",
    penaltyAwayScore: pick.penaltyAwayScore != null ? String(pick.penaltyAwayScore) : "",
  };
}

function formatKickoff(iso: string) {
  const d = new Date(iso);
  const formatted = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Mexico_City",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
  return `${formatted} (hora CDMX)`;
}

function teamLabel(team: string | null, placeholder: string | null) {
  return team ?? placeholder ?? "TBD";
}

export default function QuinielasPage() {
  const { data: session, status } = useSession();
  const [matches, setMatches] = useState<Match[] | null>(null);
  const [stage, setStage] = useState<(typeof STAGES)[number]["key"]>("ROUND_OF_32");
  const [groupFilter, setGroupFilter] = useState("");
  const [search, setSearch] = useState("");
  const [pickDrafts, setPickDrafts] = useState<Record<string, Draft>>({});
  const [resultDrafts, setResultDrafts] = useState<Record<string, Draft>>({});
  const [resultOpen, setResultOpen] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/quinielas/matches")
      .then((r) => r.json())
      .then((data: Match[]) => {
        setMatches(data);
        const drafts: Record<string, Draft> = {};
        for (const m of data) drafts[m.id] = draftFromPick(m.myPick);
        setPickDrafts(drafts);

        // Default tab: first stage (in bracket order) that still has an unlocked match.
        for (const s of STAGES) {
          if (data.some((m) => m.stage === s.key && !m.locked)) {
            setStage(s.key);
            return;
          }
        }
        setStage("FINAL");
      });
  }, [status]);

  const groupNames = useMemo(() => {
    if (!matches) return [];
    return Array.from(new Set(matches.filter((m) => m.stage === "GROUP").map((m) => m.groupName!))).sort();
  }, [matches]);

  const visible = useMemo(() => {
    if (!matches) return [];
    return matches
      .filter((m) => m.stage === stage)
      .filter((m) => (stage === "GROUP" && groupFilter ? m.groupName === groupFilter : true))
      .filter((m) => {
        if (!search.trim()) return true;
        const q = search.trim().toLowerCase();
        return (
          teamLabel(m.homeTeam, m.homeTeamPlaceholder).toLowerCase().includes(q) ||
          teamLabel(m.awayTeam, m.awayTeamPlaceholder).toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.kickoffAt.localeCompare(b.kickoffAt));
  }, [matches, stage, groupFilter, search]);

  function updatePickDraft(id: string, patch: Partial<Draft>) {
    setPickDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  function updateResultDraft(id: string, patch: Partial<Draft>) {
    setResultDrafts((prev) => ({ ...prev, [id]: { ...(prev[id] ?? EMPTY_DRAFT), ...patch } }));
  }

  function validateDraft(stageKey: string, d: Draft): string | null {
    const h = Number(d.homeScore);
    const a = Number(d.awayScore);
    if (d.homeScore === "" || d.awayScore === "" || !Number.isInteger(h) || !Number.isInteger(a) || h < 0 || a < 0) {
      return "Enter both scores";
    }
    if (stageKey === "GROUP") return null;
    if (h !== a) return null;
    if (d.decidedBy !== "PENALTIES") return "Knockout ties need a penalty shootout — set Decided by: Penalties";
    const ph = Number(d.penaltyHomeScore);
    const pa = Number(d.penaltyAwayScore);
    if (d.penaltyHomeScore === "" || d.penaltyAwayScore === "" || !Number.isInteger(ph) || !Number.isInteger(pa) || ph === pa) {
      return "Enter a decisive penalty shootout score";
    }
    return null;
  }

  async function savePick(m: Match) {
    const d = pickDrafts[m.id];
    const err = validateDraft(m.stage, d);
    setErrors((prev) => ({ ...prev, [`pick-${m.id}`]: err ?? "" }));
    if (err) return;

    setSaving((prev) => ({ ...prev, [`pick-${m.id}`]: true }));
    try {
      const res = await fetch(`/api/quinielas/matches/${m.id}/pick`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          homeScore: Number(d.homeScore),
          awayScore: Number(d.awayScore),
          decidedBy: d.decidedBy,
          penaltyHomeScore: d.decidedBy === "PENALTIES" ? Number(d.penaltyHomeScore) : null,
          penaltyAwayScore: d.decidedBy === "PENALTIES" ? Number(d.penaltyAwayScore) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrors((prev) => ({ ...prev, [`pick-${m.id}`]: data.error ?? "Failed to save" }));
        return;
      }
      setMatches((prev) => prev && prev.map((mm) => (mm.id === m.id ? { ...mm, myPick: data } : mm)));
    } finally {
      setSaving((prev) => ({ ...prev, [`pick-${m.id}`]: false }));
    }
  }

  async function saveResult(m: Match) {
    const d = resultDrafts[m.id] ?? EMPTY_DRAFT;
    const err = validateDraft(m.stage, d);
    setErrors((prev) => ({ ...prev, [`result-${m.id}`]: err ?? "" }));
    if (err) return;

    setSaving((prev) => ({ ...prev, [`result-${m.id}`]: true }));
    try {
      const res = await fetch(`/api/quinielas/matches/${m.id}/result`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          homeScore: Number(d.homeScore),
          awayScore: Number(d.awayScore),
          decidedBy: d.decidedBy,
          penaltyHomeScore: d.decidedBy === "PENALTIES" ? Number(d.penaltyHomeScore) : null,
          penaltyAwayScore: d.decidedBy === "PENALTIES" ? Number(d.penaltyAwayScore) : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrors((prev) => ({ ...prev, [`result-${m.id}`]: data.error ?? "Failed to save" }));
        return;
      }
      // Result affects this match plus possibly the next one it feeds into — just refetch.
      const refreshed = await fetch("/api/quinielas/matches").then((r) => r.json());
      setMatches(refreshed);
      setResultOpen((prev) => ({ ...prev, [m.id]: false }));
    } finally {
      setSaving((prev) => ({ ...prev, [`result-${m.id}`]: false }));
    }
  }

  if (status === "loading") return null;

  if (!session) {
    return (
      <>
        <style>{styles}</style>
        <div className="quinielas">
          <div className="container">
            <div className="hero-title">Quinielas</div>
            <div className="hero-sub">Mundial 2026</div>
            <button className="btn-google" onClick={() => signIn("google")}>Sign in with Google</button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{styles}</style>
      <div className="quinielas">
        <div className="container">
          <div className="hero-title">Quinielas</div>
          <div className="hero-sub">Mundial 2026</div>

          <div className="user-bar">
            <span className="user-name">{session.user?.name ?? session.user?.email}</span>
            <button className="btn-signout" onClick={() => signOut()}>Sign out</button>
          </div>

          <div className="tabs">
            {STAGES.map((s) => (
              <button key={s.key} className={`tab ${stage === s.key ? "active" : ""}`} onClick={() => setStage(s.key)}>
                {s.label}
              </button>
            ))}
          </div>

          <div className="controls-row">
            {stage === "GROUP" && (
              <select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)}>
                <option value="">All groups</option>
                {groupNames.map((g) => (
                  <option key={g} value={g}>Group {g}</option>
                ))}
              </select>
            )}
            <input
              placeholder="Filter by team…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {matches === null && <div className="empty">Loading matches…</div>}
          {matches !== null && visible.length === 0 && <div className="empty">No matches here.</div>}

          {visible.map((m) => {
            const draft = pickDrafts[m.id] ?? { ...EMPTY_DRAFT };
            const rDraft = resultDrafts[m.id] ?? draftFromPick(
              m.homeScore != null
                ? {
                    homeScore: m.homeScore,
                    awayScore: m.awayScore!,
                    decidedBy: m.decidedBy ?? "REGULATION",
                    penaltyHomeScore: m.penaltyHomeScore,
                    penaltyAwayScore: m.penaltyAwayScore,
                  }
                : null
            );
            const needsPenaltyPick = m.stage !== "GROUP" && draft.homeScore !== "" && draft.awayScore !== "" && draft.homeScore === draft.awayScore;
            const needsPenaltyResult = m.stage !== "GROUP" && rDraft.homeScore !== "" && rDraft.awayScore !== "" && rDraft.homeScore === rDraft.awayScore;
            const canEnterResult = !!m.homeTeam && !!m.awayTeam;

            return (
              <div className="card" key={m.id}>
                <div className="card-meta">
                  <span>{m.stage === "GROUP" ? `Group ${m.groupName}` : STAGES.find((s) => s.key === m.stage)?.label}</span>
                  <span>{formatKickoff(m.kickoffAt)}{m.venue ? ` · ${m.venue}` : ""}</span>
                </div>

                <div className="matchup">
                  <span className={`team ${m.homeTeam ? "" : "placeholder"}`}>{teamLabel(m.homeTeam, m.homeTeamPlaceholder)}</span>
                  {m.homeScore != null ? (
                    <div>
                      <div className="score-actual">{m.homeScore} – {m.awayScore}</div>
                      {m.decidedBy && m.decidedBy !== "REGULATION" && (
                        <span className="decided-tag">
                          {m.decidedBy === "EXTRA_TIME" ? "AET" : `Pens ${m.penaltyHomeScore}-${m.penaltyAwayScore}`}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="vs">vs</span>
                  )}
                  <span className={`team ${m.awayTeam ? "" : "placeholder"}`}>{teamLabel(m.awayTeam, m.awayTeamPlaceholder)}</span>
                </div>

                {!m.locked && (
                  <>
                    <div className="pick-row">
                      <input
                        type="number"
                        min={0}
                        value={draft.homeScore}
                        onChange={(e) => updatePickDraft(m.id, { homeScore: e.target.value })}
                      />
                      <span className="vs">–</span>
                      <input
                        type="number"
                        min={0}
                        value={draft.awayScore}
                        onChange={(e) => updatePickDraft(m.id, { awayScore: e.target.value })}
                      />
                      {m.stage !== "GROUP" && (
                        <select value={draft.decidedBy} onChange={(e) => updatePickDraft(m.id, { decidedBy: e.target.value as DecidedBy })}>
                          <option value="REGULATION">Regulation</option>
                          <option value="EXTRA_TIME">Extra time</option>
                          <option value="PENALTIES">Penalties</option>
                        </select>
                      )}
                      {needsPenaltyPick && draft.decidedBy === "PENALTIES" && (
                        <>
                          <input type="number" min={0} placeholder="P" value={draft.penaltyHomeScore} onChange={(e) => updatePickDraft(m.id, { penaltyHomeScore: e.target.value })} />
                          <span className="vs">–</span>
                          <input type="number" min={0} placeholder="P" value={draft.penaltyAwayScore} onChange={(e) => updatePickDraft(m.id, { penaltyAwayScore: e.target.value })} />
                        </>
                      )}
                      <button className="btn-save" disabled={saving[`pick-${m.id}`]} onClick={() => savePick(m)}>
                        {m.myPick ? "Update" : "Save"}
                      </button>
                    </div>
                    {errors[`pick-${m.id}`] && <div className="error">{errors[`pick-${m.id}`]}</div>}
                  </>
                )}

                {m.locked && (
                  <>
                    {m.myPick ? (
                      <div className="my-pick">
                        Your pick: {m.myPick.homeScore}–{m.myPick.awayScore}
                        {m.myPick.decidedBy === "PENALTIES" ? ` (pens ${m.myPick.penaltyHomeScore}-${m.myPick.penaltyAwayScore})` : m.myPick.decidedBy === "EXTRA_TIME" ? " (AET)" : ""}
                      </div>
                    ) : (
                      <div className="locked-note">Picks locked — you didn&apos;t make one in time.</div>
                    )}

                    {m.allPicks.length > 0 && (
                      <div className="all-picks">
                        <div className="all-picks-title">Everyone&apos;s picks</div>
                        {m.allPicks.map((p, i) => {
                          const exact = m.homeScore != null && p.homeScore === m.homeScore && p.awayScore === m.awayScore;
                          return (
                            <div className={`pick-line ${exact ? "correct" : ""}`} key={i}>
                              <span>{p.userName ?? "Unknown"}</span>
                              <span>{p.homeScore}–{p.awayScore}{p.decidedBy === "PENALTIES" ? ` (pens ${p.penaltyHomeScore}-${p.penaltyAwayScore})` : p.decidedBy === "EXTRA_TIME" ? " (AET)" : ""}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {canEnterResult && (
                      <div className="result-toggle">
                        <button className="btn-toggle" onClick={() => setResultOpen((prev) => ({ ...prev, [m.id]: !prev[m.id] }))}>
                          {m.homeScore != null ? "Edit result" : "Enter result"}
                        </button>
                      </div>
                    )}

                    {resultOpen[m.id] && (
                      <>
                        <div className="result-form">
                          <input type="number" min={0} value={rDraft.homeScore} onChange={(e) => updateResultDraft(m.id, { homeScore: e.target.value })} />
                          <span className="vs">–</span>
                          <input type="number" min={0} value={rDraft.awayScore} onChange={(e) => updateResultDraft(m.id, { awayScore: e.target.value })} />
                          {m.stage !== "GROUP" && (
                            <select value={rDraft.decidedBy} onChange={(e) => updateResultDraft(m.id, { decidedBy: e.target.value as DecidedBy })}>
                              <option value="REGULATION">Regulation</option>
                              <option value="EXTRA_TIME">Extra time</option>
                              <option value="PENALTIES">Penalties</option>
                            </select>
                          )}
                          {needsPenaltyResult && rDraft.decidedBy === "PENALTIES" && (
                            <>
                              <input type="number" min={0} placeholder="P" value={rDraft.penaltyHomeScore} onChange={(e) => updateResultDraft(m.id, { penaltyHomeScore: e.target.value })} />
                              <span className="vs">–</span>
                              <input type="number" min={0} placeholder="P" value={rDraft.penaltyAwayScore} onChange={(e) => updateResultDraft(m.id, { penaltyAwayScore: e.target.value })} />
                            </>
                          )}
                          <button className="btn-save" disabled={saving[`result-${m.id}`]} onClick={() => saveResult(m)}>
                            Save result
                          </button>
                        </div>
                        {errors[`result-${m.id}`] && <div className="error">{errors[`result-${m.id}`]}</div>}
                      </>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
