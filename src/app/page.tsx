"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signIn, signOut } from "next-auth/react";

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Lato:wght@300;400;700&display=swap');

  :root { --accent-label: #e08a3a; }
  .home { min-height: 100vh; background: #0f1a0f; color: #f2e8d0; font-family: 'Lato', sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; }
  .hero-title { font-family: 'Cinzel', serif; font-size: 2.2rem; font-weight: 700; letter-spacing: 0.08em; color: #c9922a; text-shadow: 0 0 40px rgba(201,146,42,0.4); text-align: center; }
  .hero-sub { font-family: 'Cinzel', serif; font-size: 0.78rem; letter-spacing: 0.22em; color: #8a7a5a; margin-top: 6px; text-transform: uppercase; text-align: center; }
  .card { background: #1a2e1a; border: 1px solid #2d3b2d; border-radius: 4px; padding: 28px 24px; width: 100%; max-width: 420px; margin-top: 40px; }
  .section-title { font-family: 'Cinzel', serif; font-size: 0.68rem; letter-spacing: 0.25em; color: var(--accent-label); text-transform: uppercase; margin-bottom: 16px; }
  .field { display: flex; flex-direction: column; gap: 5px; margin-bottom: 12px; }
  .field-label { font-size: 0.62rem; letter-spacing: 0.2em; color: var(--accent-label); text-transform: uppercase; font-family: 'Cinzel', serif; }
  .field input { background: #152515; border: 1px solid #2d3b2d; border-radius: 3px; color: #f2e8d0; font-family: 'Lato', sans-serif; font-size: 0.88rem; padding: 8px 10px; outline: none; transition: border-color 0.15s; width: 100%; }
  .field input:focus { border-color: #c9922a; }
  .btn-primary { background: #8b3a1a; border: none; border-radius: 3px; color: #f2e8d0; cursor: pointer; font-family: 'Cinzel', serif; font-size: 0.78rem; letter-spacing: 0.12em; padding: 10px 24px; transition: background 0.15s; text-transform: uppercase; width: 100%; margin-top: 4px; }
  .btn-primary:hover { background: #a04520; }
  .btn-primary:disabled { background: #2d3b2d; color: #5a6a4a; cursor: not-allowed; }
  .btn-google { background: #f2e8d0; border: none; border-radius: 3px; color: #1a1a1a; cursor: pointer; font-family: 'Lato', sans-serif; font-size: 0.88rem; font-weight: 700; padding: 11px 24px; transition: background 0.15s; width: 100%; display: flex; align-items: center; justify-content: center; gap: 10px; }
  .btn-google:hover { background: #fff; }
  .divider { border: none; border-top: 1px solid #2d3b2d; margin: 24px 0; }
  .error { font-size: 0.78rem; color: #f2a866; margin-top: 8px; padding: 7px 10px 7px 13px; background: #0a110a; border-radius: 3px; border: 1px solid #2a2114; border-left: 3px solid var(--accent-label); }
  .user-bar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #2d3b2d; }
  .user-name { font-size: 0.82rem; color: #a0b090; }
  .btn-signout { background: none; border: 1px solid #2d3b2d; border-radius: 3px; color: #5a6a4a; cursor: pointer; font-family: 'Lato', sans-serif; font-size: 0.75rem; padding: 4px 10px; transition: all 0.15s; }
  .btn-signout:hover { border-color: var(--accent-label); color: var(--accent-label); }
  .group-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 4px; }
  .group-item { background: #152515; border: 1px solid #2d3b2d; border-radius: 3px; color: #f2e8d0; cursor: pointer; font-family: 'Lato', sans-serif; font-size: 0.88rem; padding: 10px 14px; text-align: left; transition: border-color 0.15s; display: flex; align-items: center; justify-content: space-between; }
  .group-item:hover { border-color: #c9922a; }
  .group-item-name { font-weight: 700; }
  .group-item-code { font-size: 0.72rem; color: #5a6a4a; letter-spacing: 0.1em; }
  .wiki-nav-link { display: inline-block; margin-top: 12px; font-family: 'Cinzel', serif; font-size: 0.72rem; letter-spacing: 0.12em; color: #c9922a; text-decoration: none; border: 1px solid #2d3b2d; border-radius: 4px; padding: 5px 12px; transition: all 0.15s; }
  .wiki-nav-link:hover { background: rgba(201,146,42,0.1); border-color: #c9922a; }
`;

type Group = { id: string; name: string; joinCode: string };

export default function HomePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [groupName, setGroupName] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<Group[] | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch("/api/groups")
      .then((r) => r.json())
      .then((data: Group[]) => {
        if (data.length === 1) {
          router.replace(`/g/${data[0].joinCode}`);
        } else {
          setGroups(data);
        }
      })
      .catch(() => setGroups([]));
  }, [status, router]);

  async function createGroup() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: groupName.trim(), playerName: playerName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to create group"); return; }
      router.push(`/g/${data.group.joinCode}`);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function joinGroup() {
    const code = joinCode.trim().toLowerCase();
    if (code) router.push(`/g/${code}`);
  }

  if (status === "loading" || !session || (status === "authenticated" && groups === null)) {
    return (
      <>
        <style>{styles}</style>
        <div className="home">
          <div className="hero-title">The Woodland Chronicles</div>
          <div className="hero-sub">Root · Leaderboard</div>
        <Link className="wiki-nav-link" href="/wiki">📖 Cómo jugar Root</Link>
          <div className="card">
            <div className="section-title">Sign in to continue</div>
            <button className="btn-google" onClick={() => signIn("google")}>
              <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.08 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.34-8.16 2.34-6.26 0-11.57-3.59-13.46-8.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
              Sign in with Google
            </button>
            <hr className="divider" />
            <div className="section-title">Join an Existing Group</div>
            <div className="field">
              <label className="field-label">Join Code</label>
              <input
                placeholder="8-character code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && joinCode.trim().length >= 6 && router.push(`/g/${joinCode.trim().toLowerCase()}`)}
                maxLength={8}
              />
            </div>
            <button
              className="btn-primary"
              onClick={() => router.push(`/g/${joinCode.trim().toLowerCase()}`)}
              disabled={joinCode.trim().length < 6}
            >
              Enter the Woodland
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{styles}</style>
      <div className="home">
        <div className="hero-title">The Woodland Chronicles</div>
        <div className="hero-sub">Root · Leaderboard</div>
        <Link className="wiki-nav-link" href="/wiki">📖 Cómo jugar Root</Link>

        <div className="card">
          <div className="user-bar">
            <span className="user-name">{session.user?.name ?? session.user?.email}</span>
            <button className="btn-signout" onClick={() => signOut()}>Sign out</button>
          </div>
          {groups && groups.length > 1 && (
            <>
              <div className="section-title">Your Groups</div>
              <div className="group-list">
                {groups.map((g) => (
                  <button key={g.id} className="group-item" onClick={() => router.push(`/g/${g.joinCode}`)}>
                    <span className="group-item-name">{g.name}</span>
                    <span className="group-item-code">{g.joinCode}</span>
                  </button>
                ))}
              </div>
              <hr className="divider" />
            </>
          )}

          <div className="section-title">Create a New Group</div>
          <div className="field">
            <label className="field-label">Group Name</label>
            <input
              placeholder="e.g. Work Friends"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createGroup()}
            />
          </div>
          <div className="field">
            <label className="field-label">Your Player Name</label>
            <input
              placeholder="Your Root username"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createGroup()}
            />
          </div>
          {error && <div className="error">{error}</div>}
          <button
            className="btn-primary"
            onClick={createGroup}
            disabled={!groupName.trim() || !playerName.trim() || loading}
          >
            {loading ? "Creating…" : "Create Group"}
          </button>

          <hr className="divider" />

          <div className="section-title">Join an Existing Group</div>
          <div className="field">
            <label className="field-label">Join Code</label>
            <input
              placeholder="8-character code"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && joinGroup()}
              maxLength={8}
            />
          </div>
          <button
            className="btn-primary"
            onClick={joinGroup}
            disabled={joinCode.trim().length < 6}
          >
            Enter the Woodland
          </button>
        </div>
      </div>
    </>
  );
}
