"use client";

import { useState, useEffect, useRef } from "react";
import { WikiText } from "./WikiText";
import { InGameLookup } from "./InGameLookup";
import type { FactionTurnGuide, TurnPhase, ActionRepeat, GuideBlock, Action, ActionModifier } from "@/lib/wiki/types";
import type { GameId } from "@/lib/wiki/loaders";

const BEGINNER_MODE_KEY = "wiki:beginnerMode";
const progressKey = (gameId: GameId, factionId: string) => `wiki:${gameId}:${factionId}:progress`;
const variantKey = (gameId: GameId, factionId: string) => `wiki:${gameId}:${factionId}:variant`;
const modifiersKey = (gameId: GameId, factionId: string) => `wiki:${gameId}:${factionId}:modifiers`;

const PHASE_LABEL_ES: Record<TurnPhase, string> = {
  birdsong: "Canto del Alba",
  daylight: "Día",
  evening: "Noche",
};

const PHASE_ORDER: TurnPhase[] = ["birdsong", "daylight", "evening"];

export interface TipRow {
  id: string;
  text: string;
  targets: { factionId: string; actionId: string | null }[];
}

type Screen =
  | { kind: "action"; phase: TurnPhase; actionIds: string[]; repeat: ActionRepeat }
  | {
      kind: "driven";
      phase: TurnPhase;
      actionIds: string[];
      title: string;
      body: string;
      onFailureBlocks: GuideBlock[];
    }
  | { kind: "pending"; phase: TurnPhase };

function repeatLabelEs(repeat: ActionRepeat): string {
  if (repeat === "once") return "Obligatorio";
  if (repeat === "unlimited") return "Ilimitado";
  const cap = repeat.maxEs ?? (repeat.max != null ? `Hasta ${repeat.max}` : "");
  const bonus = repeat.bonusEs ? ` (${repeat.bonusEs})` : "";
  return `${cap}${bonus}`;
}

// Renders one action's title/body plus any active ActionModifiers targeting it — used for
// normal screens and for the failure-chain steps nested inside a DrivenActionBlock.
function ActionCard({ gameId, action, modifiers }: { gameId: GameId; action?: Action; modifiers?: ActionModifier[] }) {
  const t = action?.translations.es;
  if (!t) return null;
  return (
    <div className="wizard-action">
      <h3>{t.title}</h3>
      <p>
        <WikiText gameId={gameId} text={t.body} />
      </p>
      {modifiers?.map((m) => {
        const mt = m.translations.es;
        if (!mt) return null;
        return (
          <p key={m.id} className="wizard-action-modifier">
            <strong>{mt.name}:</strong> <WikiText gameId={gameId} text={mt.appendBody} />
          </p>
        );
      })}
    </div>
  );
}

export function PlayGuideWizard({
  gameId,
  guide,
  tips,
}: {
  gameId: GameId;
  guide: FactionTurnGuide;
  tips: TipRow[];
}) {
  const [beginnerMode, setBeginnerMode] = useState(true);
  // Two-tier navigation: phaseIdx picks Birdsong/Daylight/Noche, actionIdx steps through that
  // phase's action-blocks. "Fase siguiente/anterior" jumps between phases (resetting to that
  // phase's first block); "Acción siguiente/anterior" stays within the current phase.
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [actionIdx, setActionIdx] = useState(0);
  const [variantId, setVariantId] = useState<string | null>(guide.variants?.[0]?.id ?? null);
  const [toggledModifierIds, setToggledModifierIds] = useState<Set<string>>(new Set());
  const [showFailure, setShowFailure] = useState(false);
  const hydrated = useRef(false);

  useEffect(() => {
    const storedBeginner = localStorage.getItem(BEGINNER_MODE_KEY);
    if (storedBeginner !== null) setBeginnerMode(storedBeginner === "1");

    const storedProgress = localStorage.getItem(progressKey(gameId, guide.factionId));
    if (storedProgress) {
      try {
        const parsed = JSON.parse(storedProgress);
        if (typeof parsed.phaseIdx === "number") {
          setPhaseIdx(Math.min(Math.max(parsed.phaseIdx, 0), PHASE_ORDER.length - 1));
        }
        if (typeof parsed.actionIdx === "number") setActionIdx(Math.max(parsed.actionIdx, 0));
      } catch {
        // ignore malformed stored progress, start from the beginning
      }
    }

    const storedVariant = localStorage.getItem(variantKey(gameId, guide.factionId));
    if (storedVariant && guide.variants?.some((v) => v.id === storedVariant)) setVariantId(storedVariant);

    const storedModifiers = localStorage.getItem(modifiersKey(gameId, guide.factionId));
    if (storedModifiers) {
      try {
        const ids: string[] = JSON.parse(storedModifiers);
        const valid = ids.filter((id) => guide.modifiers?.some((m) => m.id === id));
        setToggledModifierIds(new Set(valid));
      } catch {
        // ignore malformed stored modifiers
      }
    }

    // A search result (WikiSearch) can deep-link straight to one action via ?action=id,
    // overriding whatever phase/step localStorage had restored above. Nested (onFailureBlocks)
    // actions land on their parent driven screen instead, since they aren't independently
    // navigable steps.
    const targetAction = new URLSearchParams(window.location.search).get("action");
    if (targetAction) {
      for (let i = 0; i < guide.blocks.length; i++) {
        const b = guide.blocks[i];
        const matches = b.actionIds.includes(targetAction) ||
          (b.kind === "driven" && b.onFailureBlocks?.some((fb) => fb.actionIds.includes(targetAction)));
        if (!matches) continue;
        const phaseI = PHASE_ORDER.indexOf(b.phase);
        const idxInPhase = guide.blocks.filter((ob) => ob.phase === b.phase).indexOf(b);
        if (phaseI !== -1 && idxInPhase !== -1) {
          setPhaseIdx(phaseI);
          setActionIdx(idxInPhase);
        }
        break;
      }
    }

    hydrated.current = true;
    // Intentionally mount-only: this reads localStorage once to resume where the visitor left
    // off, independent of prop identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    localStorage.setItem(BEGINNER_MODE_KEY, beginnerMode ? "1" : "0");
  }, [beginnerMode]);

  useEffect(() => {
    if (!hydrated.current) return;
    localStorage.setItem(progressKey(gameId, guide.factionId), JSON.stringify({ phaseIdx, actionIdx }));
  }, [gameId, guide.factionId, phaseIdx, actionIdx]);

  useEffect(() => {
    if (!hydrated.current || !variantId) return;
    localStorage.setItem(variantKey(gameId, guide.factionId), variantId);
  }, [gameId, guide.factionId, variantId]);

  useEffect(() => {
    if (!hydrated.current) return;
    localStorage.setItem(modifiersKey(gameId, guide.factionId), JSON.stringify([...toggledModifierIds]));
  }, [gameId, guide.factionId, toggledModifierIds]);

  function toggleModifier(id: string) {
    setToggledModifierIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (guide.modifiersMaxActive != null && next.size >= guide.modifiersMaxActive) return prev;
        next.add(id);
      }
      return next;
    });
  }

  const selectedVariant = guide.variants?.find((v) => v.id === variantId);
  // The chosen variant's actions (e.g. Vagabond's character special action) override the
  // faction's base actions of the same id; a variant with no overrides (Eyrie's leaders) is
  // purely informational and changes nothing here.
  const effectiveActions: Record<string, Action> = { ...guide.actions, ...(selectedVariant?.actionOverrides ?? {}) };

  // A modifier is active either because it's directly toggled, or bundled into the selected
  // variant (e.g. Eyrie's Charismatic leader auto-applies its Recruit-tweak modifier).
  const activeModifierIds = new Set([...(selectedVariant?.modifierIds ?? []), ...toggledModifierIds]);
  const modifiersByAction = new Map<string, ActionModifier[]>();
  for (const m of guide.modifiers ?? []) {
    if (!activeModifierIds.has(m.id)) continue;
    const targets = Array.isArray(m.targetActionId) ? m.targetActionId : [m.targetActionId];
    for (const targetId of targets) {
      const list = modifiersByAction.get(targetId) ?? [];
      list.push(m);
      modifiersByAction.set(targetId, list);
    }
  }

  const presentPhases = new Set(guide.blocks.map((b) => b.phase));
  const missingPhases = guide.status === "partial" ? PHASE_ORDER.filter((p) => !presentPhases.has(p)) : [];

  const screensByPhase: Record<TurnPhase, Screen[]> = { birdsong: [], daylight: [], evening: [] };
  for (const b of guide.blocks) {
    if (b.kind === "driven") {
      const t = b.translations.es;
      screensByPhase[b.phase].push({
        kind: "driven",
        phase: b.phase,
        actionIds: b.actionIds,
        title: t?.title ?? "",
        body: t?.body ?? "",
        onFailureBlocks: b.onFailureBlocks ?? [],
      });
    } else {
      screensByPhase[b.phase].push({ kind: "action", phase: b.phase, actionIds: b.actionIds, repeat: b.repeat });
    }
  }
  for (const p of missingPhases) screensByPhase[p].push({ kind: "pending", phase: p });

  const currentPhase = PHASE_ORDER[phaseIdx];
  const currentPhaseScreens = screensByPhase[currentPhase];
  const safeActionIdx = Math.min(actionIdx, currentPhaseScreens.length - 1);
  const screen = currentPhaseScreens[safeActionIdx];
  if (!screen) return null;

  function goToPhase(idx: number) {
    setPhaseIdx(Math.min(Math.max(idx, 0), PHASE_ORDER.length - 1));
    setActionIdx(0);
    setShowFailure(false);
  }

  const tipsForScreen =
    beginnerMode && screen.kind !== "pending"
      ? tips.filter((t) =>
          t.targets.some(
            (target) =>
              target.factionId === guide.factionId &&
              (target.actionId === null || screen.actionIds.includes(target.actionId))
          )
        )
      : [];

  return (
    <div className="wizard">
      <label className="wizard-beginner-toggle">
        <input type="checkbox" checked={beginnerMode} onChange={(e) => setBeginnerMode(e.target.checked)} />
        Modo principiante (consejos adicionales)
      </label>

      <InGameLookup gameId={gameId} />

      {guide.variants && guide.variants.length > 0 && (
        <div className="wizard-variant-picker">
          <span className="wizard-nav-label">Personaje</span>
          <div className="wizard-phase-pills">
            {guide.variants.map((v) => (
              <button
                key={v.id}
                type="button"
                className={`wizard-phase-pill ${v.id === variantId ? "active" : ""}`}
                onClick={() => setVariantId(v.id)}
              >
                {v.translations.es?.name ?? v.id}
              </button>
            ))}
          </div>
          {selectedVariant?.translations.es?.description && (
            <p className="wizard-variant-description">{selectedVariant.translations.es.description}</p>
          )}
        </div>
      )}

      {guide.modifiers && guide.modifiers.length > 0 && guide.modifiersMaxActive != null && (
        <div className="wizard-variant-picker">
          <span className="wizard-nav-label">
            {guide.modifiersLabelEs ?? "Modificadores"} ({toggledModifierIds.size}/{guide.modifiersMaxActive})
          </span>
          <div className="wizard-modifier-list">
            {guide.modifiers.map((m) => {
              const mt = m.translations.es;
              const checked = toggledModifierIds.has(m.id);
              const disabled = !checked && toggledModifierIds.size >= (guide.modifiersMaxActive ?? Infinity);
              return (
                <label key={m.id} className={`wizard-modifier-option ${disabled ? "disabled" : ""}`}>
                  <input type="checkbox" checked={checked} disabled={disabled} onChange={() => toggleModifier(m.id)} />
                  {mt?.name ?? m.id}
                </label>
              );
            })}
          </div>
        </div>
      )}

      <div className="wizard-phase-pills">
        {PHASE_ORDER.map((p, i) => (
          <button key={p} type="button" className={`wizard-phase-pill ${i === phaseIdx ? "active" : ""}`} onClick={() => goToPhase(i)}>
            {PHASE_LABEL_ES[p]}
          </button>
        ))}
      </div>

      <div className="wizard-progress">
        Acción {safeActionIdx + 1} / {currentPhaseScreens.length} · {PHASE_LABEL_ES[currentPhase]}
      </div>

      {screen.kind === "pending" && (
        <div className="wizard-pending">Contenido pendiente para la fase «{PHASE_LABEL_ES[screen.phase]}».</div>
      )}

      {screen.kind === "action" && (
        <>
          {screen.actionIds.length > 1 && <div className="wizard-repeat-badge">{repeatLabelEs(screen.repeat)}</div>}
          {screen.actionIds.map((actionId) => (
            <div key={actionId}>
              {screen.actionIds.length === 1 && <div className="wizard-repeat-badge">{repeatLabelEs(screen.repeat)}</div>}
              <ActionCard gameId={gameId} action={effectiveActions[actionId]} modifiers={modifiersByAction.get(actionId)} />
            </div>
          ))}
        </>
      )}

      {screen.kind === "driven" && (
        <>
          <div className="wizard-repeat-badge">Obligatorio, según el estado del Decreto</div>
          <div className="wizard-action">
            <h3>{screen.title}</h3>
            <p>
              <WikiText gameId={gameId} text={screen.body} />
            </p>
          </div>
          <div className="wizard-driven-actions">
            {screen.actionIds.map((actionId) => (
              <ActionCard key={actionId} gameId={gameId} action={effectiveActions[actionId]} modifiers={modifiersByAction.get(actionId)} />
            ))}
          </div>
          {screen.onFailureBlocks.length > 0 && (
            <div className="wizard-failure-panel">
              <button type="button" className="wizard-failure-toggle" onClick={() => setShowFailure((s) => !s)}>
                {showFailure ? "▾" : "▸"} ¿Qué pasa si no puedes completarla?
              </button>
              {showFailure && (
                <div className="wizard-failure-body">
                  {screen.onFailureBlocks.map((fb) =>
                    fb.actionIds.map((actionId) => (
                      <ActionCard key={`${fb.id}-${actionId}`} gameId={gameId} action={effectiveActions[actionId]} modifiers={modifiersByAction.get(actionId)} />
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {tipsForScreen.map((t) => (
        <div key={t.id} className="wizard-tip">
          💡 <WikiText gameId={gameId} text={t.text} />
        </div>
      ))}

      <div className="wizard-nav">
        <div className="wizard-nav-group">
          <span className="wizard-nav-label">Acción</span>
          <button disabled={safeActionIdx === 0} onClick={() => { setActionIdx((i) => Math.max(i - 1, 0)); setShowFailure(false); }}>
            ← Anterior
          </button>
          <button
            disabled={safeActionIdx === currentPhaseScreens.length - 1}
            onClick={() => { setActionIdx((i) => Math.min(i + 1, currentPhaseScreens.length - 1)); setShowFailure(false); }}
          >
            Siguiente →
          </button>
        </div>
        <div className="wizard-nav-group">
          <span className="wizard-nav-label">Fase</span>
          <button disabled={phaseIdx === 0} onClick={() => goToPhase(phaseIdx - 1)}>
            ◀◀ Anterior
          </button>
          <button disabled={phaseIdx === PHASE_ORDER.length - 1} onClick={() => goToPhase(phaseIdx + 1)}>
            Siguiente ▶▶
          </button>
        </div>
      </div>
    </div>
  );
}
