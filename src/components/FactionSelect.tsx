"use client";

import { useState, useEffect, useRef } from "react";
import { FACTIONS, FACTION_MAP, FactionIcon } from "./FactionIcon";

export function FactionSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const selected = FACTION_MAP[value];
  const q = query.trim().toLowerCase();
  const filtered = q
    ? FACTIONS.filter((f) => f.name.toLowerCase().includes(q) || f.id.includes(q))
    : FACTIONS;

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  function pick(id: string) {
    onChange(id);
    setOpen(false);
    setQuery("");
  }

  return (
    <div className="combobox" ref={ref}>
      {!open && selected && (
        <span className="combobox-icon">
          <FactionIcon id={selected.id} size={30} />
        </span>
      )}
      <input
        className="combobox-input"
        placeholder="— Faction —"
        style={!open && selected ? { paddingLeft: 46 } : undefined}
        value={open ? query : selected ? selected.name : ""}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          if (!open) setOpen(true);
        }}
        onFocus={() => { setOpen(true); setQuery(""); setActive(0); }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setActive((a) => Math.min(a + 1, filtered.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            if (filtered[active]) { pick(filtered[active].id); e.currentTarget.blur(); }
          } else if (e.key === "Escape") {
            setOpen(false);
            setQuery("");
          }
        }}
      />
      {open && (
        <div className="combobox-list">
          {filtered.length === 0 ? (
            <div className="combobox-empty">No factions match</div>
          ) : (
            filtered.map((f, i) => (
              <div
                key={f.id}
                className={`combobox-option ${i === active ? "active" : ""} ${f.id === value ? "selected" : ""}`}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => { e.preventDefault(); pick(f.id); }}
              >
                <FactionIcon id={f.id} size={34} /> {f.name}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
