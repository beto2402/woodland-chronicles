"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { computeDueDate } from "@/lib/season-core";

interface SeasonDTO {
  id: string;
  name: string;
  startDate: string;
  endDate: string | null;
  cadenceMonths: number;
  createdAt: string;
}

const styles = `
  :root { --accent-label: #e08a3a; }
  body { background: #0f1a0f; }
  .admin-page { min-height: 100vh; padding: 32px 16px 60px; font-family: 'Lato', sans-serif; color: #d8e0c8; }
  .admin-container { max-width: 720px; margin: 0 auto; }
  .admin-title { font-family: 'Cinzel', serif; font-size: 1.4rem; color: #f2e8d0; }
  .admin-subtitle { font-size: 0.85rem; color: #a0b090; margin-top: 4px; margin-bottom: 24px; }
  .admin-error { font-size: 0.82rem; color: #f2a866; background: #0a110a; border: 1px solid #2a2114; border-left: 3px solid var(--accent-label); border-radius: 3px; padding: 8px 11px; margin-bottom: 16px; }
  .admin-notice { font-size: 0.82rem; color: #d8e0c8; background: #152515; border: 1px solid #2d3b2d; border-left: 3px solid #5a6a4a; border-radius: 3px; padding: 8px 11px; margin-bottom: 16px; }
  .season-card { background: #1a2e1a; border: 1px solid #2d3b2d; border-radius: 4px; padding: 18px 20px; margin-bottom: 20px; }
  .season-card-title { font-family: 'Cinzel', serif; font-size: 1.05rem; color: #c9922a; margin-bottom: 10px; }
  .season-row { display: flex; justify-content: space-between; gap: 12px; padding: 6px 0; font-size: 0.85rem; border-top: 1px solid #24331f; }
  .season-row:first-of-type { border-top: none; }
  .season-row-label { color: #7a8a6a; }
  .season-field { display: flex; align-items: center; gap: 10px; margin-top: 14px; flex-wrap: wrap; }
  .season-input { width: 90px; background: #152515; border: 1px solid #2d3b2d; border-radius: 4px; color: #f2e8d0; font-family: 'Lato', sans-serif; font-size: 0.85rem; padding: 8px 10px; outline: none; }
  .season-input:focus { border-color: #5a6a4a; }
  .season-btn { background: none; border: 1px solid #2d3b2d; border-radius: 3px; color: #a0b090; cursor: pointer; font-family: 'Lato', sans-serif; font-size: 0.8rem; padding: 8px 14px; transition: all 0.15s; }
  .season-btn:hover:not(:disabled) { border-color: #5a6a4a; color: #f2e8d0; }
  .season-btn:disabled { opacity: 0.5; cursor: default; }
  .season-btn-danger { border-color: #4a2a1a; color: #e08a3a; }
  .season-btn-danger:hover:not(:disabled) { border-color: #e08a3a; color: #f2a866; }
  .admin-table { background: #1a2e1a; border: 1px solid #2d3b2d; border-radius: 4px; overflow: hidden; }
  .admin-row { display: grid; grid-template-columns: 1fr 1.4fr auto; gap: 12px; align-items: center; padding: 10px 16px; border-bottom: 1px solid #2d3b2d; font-size: 0.85rem; }
  .admin-row:last-child { border-bottom: none; }
  .admin-row-head { font-family: 'Cinzel', serif; font-size: 0.62rem; letter-spacing: 0.15em; color: var(--accent-label); text-transform: uppercase; background: #152515; }
  .admin-empty { padding: 24px 16px; text-align: center; color: #7a8a6a; font-size: 0.85rem; }

  .admin-modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.78); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 16px; overscroll-behavior: contain; }
  .admin-modal { background: #1a2e1a; border: 1px solid #2d3b2d; border-radius: 6px; width: min(420px, 100%); max-height: calc(100dvh - 64px); overflow-y: auto; overscroll-behavior: contain; -webkit-overflow-scrolling: touch; padding: 24px 24px 20px; position: relative; }
  .admin-modal-close { position: sticky; top: 0; float: right; margin: -8px -6px 0 0; background: none; border: none; color: #5a6a4a; cursor: pointer; font-size: 1.1rem; line-height: 1; padding: 4px 8px; border-radius: 3px; transition: color 0.15s; z-index: 2; }
  .admin-modal-close:hover { color: #f2e8d0; }
  .admin-modal-title { font-family: 'Cinzel', serif; font-size: 1.1rem; color: #c9922a; margin-bottom: 2px; padding-right: 36px; overflow-wrap: break-word; }
  .admin-modal-sub { font-size: 0.78rem; color: #7a8a6a; margin-bottom: 18px; overflow-wrap: break-word; }
  .admin-modal-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 0; border-top: 1px solid #2d3b2d; }
  .admin-modal-row:first-of-type { border-top: none; }
  .admin-modal-row-label { font-size: 0.85rem; color: #7a8a6a; }
  .admin-modal-hint { font-size: 0.72rem; color: #7a8a6a; margin-top: 10px; line-height: 1.4; }
  .admin-modal-actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 18px; }
  .back-link { font-size: 0.8rem; color: #7a8a6a; text-decoration: none; }
  .back-link:hover { color: #a0b090; }
`;

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" });
}

export function AdminSeasonPanel() {
  const [current, setCurrent] = useState<SeasonDTO | null>(null);
  const [history, setHistory] = useState<SeasonDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [cadenceInput, setCadenceInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [cadenceConfirm, setCadenceConfirm] = useState<{ cadence: number; oldDue: Date; newDue: Date } | null>(null);
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/season");
      if (res.ok) {
        const data = await res.json();
        setCurrent(data.current);
        setHistory(data.history);
        setCadenceInput(data.current ? String(data.current.cadenceMonths) : "");
      }
    } catch {
      // ignore; error state below covers user-triggered actions
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!cadenceConfirm && !showEndConfirm) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setCadenceConfirm(null);
      setShowEndConfirm(false);
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [cadenceConfirm, showEndConfirm]);

  function openCadenceConfirm() {
    setError(null);
    setNotice(null);
    const cadence = Number(cadenceInput);
    if (!current || !Number.isInteger(cadence) || cadence < 1) {
      setError("La cadencia debe ser un número entero positivo de meses");
      return;
    }
    if (cadence === current.cadenceMonths) return;
    const oldDue = computeDueDate(new Date(current.startDate), current.cadenceMonths);
    const newDue = computeDueDate(new Date(current.startDate), cadence);
    setCadenceConfirm({ cadence, oldDue, newDue });
  }

  async function confirmCadenceChange() {
    if (!cadenceConfirm) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/season", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cadenceMonths: cadenceConfirm.cadence }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "No se pudo actualizar");
      }
      const data = await res.json();
      setCurrent(data.current);
      setHistory(data.history);
      setCadenceInput(data.current ? String(data.current.cadenceMonths) : "");
      setNotice(data.rolled ? `La temporada terminó — "${data.current?.name}" comenzó.` : "Cadencia actualizada.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar");
    } finally {
      setPending(false);
      setCadenceConfirm(null);
    }
  }

  async function confirmEndNow() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/season/rollover", { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "No se pudo terminar la temporada");
      }
      const data = await res.json();
      setCurrent(data.current);
      setHistory(data.history);
      setCadenceInput(data.current ? String(data.current.cadenceMonths) : "");
      setNotice(`La temporada terminó — "${data.current?.name}" comenzó.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo terminar la temporada");
    } finally {
      setPending(false);
      setShowEndConfirm(false);
    }
  }

  const dueDate = current ? computeDueDate(new Date(current.startDate), current.cadenceMonths) : null;
  const daysRemaining = dueDate ? Math.ceil((dueDate.getTime() - Date.now()) / 86_400_000) : null;

  return (
    <>
      <style>{styles}</style>
      <div className="admin-page">
        <div className="admin-container">
          <div className="admin-title">Temporadas</div>
          <div className="admin-subtitle">
            Configura la duración de las temporadas globales — usadas para restablecer récord y ELO en el
            leaderboard sin borrar el historial de partidas.
          </div>
          {error && <div className="admin-error">{error}</div>}
          {notice && <div className="admin-notice">{notice}</div>}

          {loading ? (
            <div className="admin-empty">Cargando…</div>
          ) : !current ? (
            <div className="admin-empty">No hay una temporada activa.</div>
          ) : (
            <div className="season-card">
              <div className="season-card-title">{current.name} (activa)</div>
              <div className="season-row">
                <span className="season-row-label">Inicio</span>
                <span>{fmtDate(current.startDate)}</span>
              </div>
              <div className="season-row">
                <span className="season-row-label">Termina</span>
                <span>{dueDate ? fmtDate(dueDate.toISOString()) : "—"}</span>
              </div>
              <div className="season-row">
                <span className="season-row-label">Días restantes</span>
                <span>{daysRemaining !== null ? Math.max(daysRemaining, 0) : "—"}</span>
              </div>

              <div className="season-field">
                <label htmlFor="cadence-input" className="season-row-label">
                  Cadencia (meses)
                </label>
                <input
                  id="cadence-input"
                  className="season-input"
                  type="number"
                  min={1}
                  step={1}
                  value={cadenceInput}
                  onChange={(e) => setCadenceInput(e.target.value)}
                  disabled={pending}
                />
                <button type="button" className="season-btn" onClick={openCadenceConfirm} disabled={pending}>
                  Guardar
                </button>
                <button
                  type="button"
                  className="season-btn season-btn-danger"
                  onClick={() => setShowEndConfirm(true)}
                  disabled={pending}
                >
                  Terminar temporada ahora
                </button>
              </div>
            </div>
          )}

          <div className="admin-table">
            <div className="admin-row admin-row-head">
              <span>Temporada</span>
              <span>Rango</span>
              <span>Cadencia</span>
            </div>
            {history.length === 0 ? (
              <div className="admin-empty">Sin temporadas anteriores</div>
            ) : (
              history.map((s) => (
                <div key={s.id} className="admin-row">
                  <span>{s.name}</span>
                  <span>
                    {fmtDate(s.startDate)} – {s.endDate ? fmtDate(s.endDate) : "—"}
                  </span>
                  <span>{s.cadenceMonths} mes(es)</span>
                </div>
              ))
            )}
          </div>

          <div style={{ marginTop: 20 }}>
            <Link href="/admin" className="back-link">
              ← Volver a admin
            </Link>
          </div>
        </div>
      </div>

      {cadenceConfirm && (
        <div className="admin-modal-backdrop" onClick={() => setCadenceConfirm(null)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <button className="admin-modal-close" onClick={() => setCadenceConfirm(null)}>
              ✕
            </button>
            <div className="admin-modal-title">Cambiar cadencia</div>
            <div className="admin-modal-sub">
              Esto aplica de inmediato a la temporada activa, recalculando su fin desde su fecha de inicio.
            </div>
            <div className="admin-modal-row">
              <span className="admin-modal-row-label">Termina actualmente</span>
              <span>{fmtDate(cadenceConfirm.oldDue.toISOString())}</span>
            </div>
            <div className="admin-modal-row">
              <span className="admin-modal-row-label">Con este cambio</span>
              <span>{fmtDate(cadenceConfirm.newDue.toISOString())}</span>
            </div>
            {cadenceConfirm.newDue.getTime() <= Date.now() && (
              <div className="admin-modal-hint">
                La nueva cadencia ya se cumplió — la temporada terminará de inmediato y una nueva comenzará hoy.
              </div>
            )}
            <div className="admin-modal-actions">
              <button className="season-btn" onClick={() => setCadenceConfirm(null)} disabled={pending}>
                Cancelar
              </button>
              <button className="season-btn season-btn-danger" onClick={confirmCadenceChange} disabled={pending}>
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {showEndConfirm && (
        <div className="admin-modal-backdrop" onClick={() => setShowEndConfirm(false)}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <button className="admin-modal-close" onClick={() => setShowEndConfirm(false)}>
              ✕
            </button>
            <div className="admin-modal-title">¿Terminar la temporada ahora?</div>
            <div className="admin-modal-sub">
              {current?.name} terminará hoy y una nueva temporada comenzará de inmediato. El historial de partidas
              no se ve afectado.
            </div>
            <div className="admin-modal-actions">
              <button className="season-btn" onClick={() => setShowEndConfirm(false)} disabled={pending}>
                Cancelar
              </button>
              <button className="season-btn season-btn-danger" onClick={confirmEndNow} disabled={pending}>
                Terminar ahora
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
