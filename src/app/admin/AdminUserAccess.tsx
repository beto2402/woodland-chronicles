"use client";

import { useEffect, useMemo, useState } from "react";

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  isAdmin: boolean;
  wikiPdfAccess: boolean;
  claimedPlayer: { name: string } | null;
}

const PAGE_SIZE = 10;

const styles = `
  :root { --accent-label: #e08a3a; }
  body { background: #0f1a0f; }
  .admin-page { min-height: 100vh; padding: 32px 16px 60px; font-family: 'Lato', sans-serif; color: #d8e0c8; }
  .admin-container { max-width: 720px; margin: 0 auto; }
  .admin-title { font-family: 'Cinzel', serif; font-size: 1.4rem; color: #f2e8d0; }
  .admin-subtitle { font-size: 0.85rem; color: #a0b090; margin-top: 4px; margin-bottom: 24px; }
  .admin-error { font-size: 0.82rem; color: #f2a866; background: #0a110a; border: 1px solid #2a2114; border-left: 3px solid var(--accent-label); border-radius: 3px; padding: 8px 11px; margin-bottom: 16px; }
  .admin-search { width: 100%; background: #152515; border: 1px solid #2d3b2d; border-radius: 4px; color: #f2e8d0; font-family: 'Lato', sans-serif; font-size: 0.85rem; padding: 9px 12px; outline: none; box-sizing: border-box; margin-bottom: 14px; }
  .admin-search:focus { border-color: #5a6a4a; }
  .admin-table { background: #1a2e1a; border: 1px solid #2d3b2d; border-radius: 4px; overflow: hidden; }
  .admin-row { display: grid; grid-template-columns: 1fr 1fr auto auto; gap: 12px; align-items: center; padding: 10px 16px; border-bottom: 1px solid #2d3b2d; font-size: 0.85rem; }
  .admin-row:last-child { border-bottom: none; }
  .admin-row-head { font-family: 'Cinzel', serif; font-size: 0.62rem; letter-spacing: 0.15em; color: var(--accent-label); text-transform: uppercase; background: #152515; }
  .admin-email { color: #7a8a6a; font-size: 0.78rem; overflow-wrap: break-word; }
  .admin-toggle { display: flex; align-items: center; gap: 6px; cursor: pointer; white-space: nowrap; }
  .admin-toggle input { cursor: pointer; }
  .admin-manage-btn { background: none; border: 1px solid #2d3b2d; border-radius: 3px; color: #a0b090; cursor: pointer; font-family: 'Lato', sans-serif; font-size: 0.72rem; padding: 5px 10px; white-space: nowrap; transition: all 0.15s; }
  .admin-manage-btn:hover { border-color: #5a6a4a; color: #f2e8d0; }
  .admin-empty { padding: 24px 16px; text-align: center; color: #7a8a6a; font-size: 0.85rem; }
  .admin-pagination { display: flex; align-items: center; justify-content: center; gap: 10px; margin-top: 16px; }
  .admin-page-btn { background: #1a2e1a; border: 1px solid #2d3b2d; border-radius: 3px; color: #a0b090; cursor: pointer; font-family: 'Lato', sans-serif; font-size: 0.78rem; padding: 6px 12px; transition: all 0.15s; }
  .admin-page-btn:hover:not(:disabled) { border-color: #5a6a4a; color: #f2e8d0; }
  .admin-page-btn:disabled { opacity: 0.4; cursor: default; }
  .admin-page-status { font-size: 0.78rem; color: #7a8a6a; }

  .admin-modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.78); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 16px; overscroll-behavior: contain; }
  .admin-modal { background: #1a2e1a; border: 1px solid #2d3b2d; border-radius: 6px; width: min(420px, 100%); max-height: calc(100dvh - 64px); overflow-y: auto; overscroll-behavior: contain; -webkit-overflow-scrolling: touch; padding: 24px 24px 20px; position: relative; }
  .admin-modal-close { position: sticky; top: 0; float: right; margin: -8px -6px 0 0; background: none; border: none; color: #5a6a4a; cursor: pointer; font-size: 1.1rem; line-height: 1; padding: 4px 8px; border-radius: 3px; transition: color 0.15s; z-index: 2; }
  .admin-modal-close:hover { color: #f2e8d0; }
  .admin-modal-title { font-family: 'Cinzel', serif; font-size: 1.1rem; color: #c9922a; margin-bottom: 2px; padding-right: 36px; overflow-wrap: break-word; }
  .admin-modal-sub { font-size: 0.78rem; color: #7a8a6a; margin-bottom: 18px; overflow-wrap: break-word; }
  .admin-modal-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 0; border-top: 1px solid #2d3b2d; }
  .admin-modal-row-label { font-size: 0.85rem; }
  .admin-modal-hint { font-size: 0.72rem; color: #7a8a6a; margin-top: 10px; line-height: 1.4; }
`;

function matches(u: AdminUser, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return (
    u.email.toLowerCase().includes(q) ||
    (u.name?.toLowerCase().includes(q) ?? false) ||
    (u.claimedPlayer?.name.toLowerCase().includes(q) ?? false)
  );
}

export function AdminUserAccess({ users: initialUsers }: { users: AdminUser[] }) {
  const [users, setUsers] = useState(initialUsers);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [modalUserId, setModalUserId] = useState<string | null>(null);
  const [adminPending, setAdminPending] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const filtered = useMemo(() => users.filter((u) => matches(u, search)), [users, search]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const paged = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
  const modalUser = users.find((u) => u.id === modalUserId) ?? null;

  useEffect(() => setPage(0), [search]);

  useEffect(() => {
    if (!modalUser) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModalUserId(null);
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [modalUser]);

  async function togglePdfAccess(userId: string, next: boolean) {
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

  async function toggleAdmin(userId: string, next: boolean) {
    setAdminPending(true);
    setModalError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAdmin: next }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "No se pudo actualizar");
      }
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, isAdmin: next } : u)));
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "No se pudo actualizar");
    } finally {
      setAdminPending(false);
    }
  }

  function openModal(userId: string) {
    setModalError(null);
    setModalUserId(userId);
  }

  return (
    <>
      <style>{styles}</style>
      <div className="admin-page">
        <div className="admin-container">
          <div className="admin-title">Admin</div>
          <div className="admin-subtitle">Acceso a las guías PDF de facciones (contenido de terceros, no público) y gestión de admins</div>
          {error && <div className="admin-error">{error}</div>}
          <input
            className="admin-search"
            placeholder="Buscar por nombre o email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="admin-table">
            <div className="admin-row admin-row-head">
              <span>Usuario</span>
              <span>Email</span>
              <span>Acceso PDF</span>
              <span></span>
            </div>
            {paged.length === 0 ? (
              <div className="admin-empty">Sin resultados</div>
            ) : (
              paged.map((u) => (
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
                      onChange={(e) => togglePdfAccess(u.id, e.target.checked)}
                    />
                    {u.wikiPdfAccess ? "Habilitado" : "Deshabilitado"}
                  </label>
                  <button type="button" className="admin-manage-btn" onClick={() => openModal(u.id)}>
                    Gestionar
                  </button>
                </div>
              ))
            )}
          </div>
          {filtered.length > PAGE_SIZE && (
            <div className="admin-pagination">
              <button className="admin-page-btn" disabled={safePage === 0} onClick={() => setPage((p) => p - 1)}>
                ← Anterior
              </button>
              <span className="admin-page-status">
                Página {safePage + 1} / {totalPages}
              </span>
              <button
                className="admin-page-btn"
                disabled={safePage >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                Siguiente →
              </button>
            </div>
          )}
        </div>
      </div>

      {modalUser && (
        <div className="admin-modal-backdrop" onClick={() => setModalUserId(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <button className="admin-modal-close" onClick={() => setModalUserId(null)}>✕</button>
            <div className="admin-modal-title">{modalUser.claimedPlayer?.name ?? modalUser.name ?? "—"}</div>
            <div className="admin-modal-sub">{modalUser.email}</div>
            {modalError && <div className="admin-error">{modalError}</div>}
            <div className="admin-modal-row">
              <span className="admin-modal-row-label">Admin</span>
              <label className="admin-toggle">
                <input
                  type="checkbox"
                  checked={modalUser.isAdmin}
                  disabled={adminPending}
                  onChange={(e) => toggleAdmin(modalUser.id, e.target.checked)}
                />
                {modalUser.isAdmin ? "Sí" : "No"}
              </label>
            </div>
            <div className="admin-modal-hint">
              Los admins pueden entrar a /admin y otorgar acceso a las guías PDF y a otros admins. No se puede quitar
              al último admin restante.
            </div>
          </div>
        </div>
      )}
    </>
  );
}
