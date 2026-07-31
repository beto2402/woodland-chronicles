"use client";

import { useState } from "react";

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  isAdmin: boolean;
  wikiPdfAccess: boolean;
  claimedPlayer: { name: string } | null;
}

const styles = `
  :root { --accent-label: #e08a3a; }
  body { background: #0f1a0f; }
  .admin-page { min-height: 100vh; padding: 32px 16px 60px; font-family: 'Lato', sans-serif; color: #d8e0c8; }
  .admin-container { max-width: 720px; margin: 0 auto; }
  .admin-title { font-family: 'Cinzel', serif; font-size: 1.4rem; color: #f2e8d0; }
  .admin-subtitle { font-size: 0.85rem; color: #a0b090; margin-top: 4px; margin-bottom: 24px; }
  .admin-error { font-size: 0.82rem; color: #f2a866; background: #0a110a; border: 1px solid #2a2114; border-left: 3px solid var(--accent-label); border-radius: 3px; padding: 8px 11px; margin-bottom: 16px; }
  .admin-table { background: #1a2e1a; border: 1px solid #2d3b2d; border-radius: 4px; overflow: hidden; }
  .admin-row { display: grid; grid-template-columns: 1fr 1fr auto; gap: 12px; align-items: center; padding: 10px 16px; border-bottom: 1px solid #2d3b2d; font-size: 0.85rem; }
  .admin-row:last-child { border-bottom: none; }
  .admin-row-head { font-family: 'Cinzel', serif; font-size: 0.62rem; letter-spacing: 0.15em; color: var(--accent-label); text-transform: uppercase; background: #152515; }
  .admin-email { color: #7a8a6a; font-size: 0.78rem; overflow-wrap: break-word; }
  .admin-toggle { display: flex; align-items: center; gap: 6px; cursor: pointer; white-space: nowrap; }
  .admin-toggle input { cursor: pointer; }
`;

export function AdminUserAccess({ users: initialUsers }: { users: AdminUser[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle(userId: string, next: boolean) {
    setPendingId(userId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wikiPdfAccess: next }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "No se pudo actualizar");
      }
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, wikiPdfAccess: next } : u)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <>
      <style>{styles}</style>
      <div className="admin-page">
        <div className="admin-container">
          <div className="admin-title">Admin</div>
          <div className="admin-subtitle">Acceso a las guías PDF de facciones (contenido de terceros, no público)</div>
          {error && <div className="admin-error">{error}</div>}
          <div className="admin-table">
            <div className="admin-row admin-row-head">
              <span>Usuario</span>
              <span>Email</span>
              <span>Acceso PDF</span>
            </div>
            {users.map((u) => (
              <div key={u.id} className="admin-row">
                <span>
                  {u.claimedPlayer?.name ?? u.name ?? "—"}
                  {u.isAdmin ? " 👑" : ""}
                </span>
                <span className="admin-email">{u.email}</span>
                <label className="admin-toggle">
                  <input
                    type="checkbox"
                    checked={u.wikiPdfAccess}
                    disabled={pendingId === u.id}
                    onChange={(e) => toggle(u.id, e.target.checked)}
                  />
                  {u.wikiPdfAccess ? "Habilitado" : "Deshabilitado"}
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
