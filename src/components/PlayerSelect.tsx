"use client";

import { useState, useEffect, useRef } from "react";

export function PlayerSelect({
  value,
  options,
  onChange,
  placeholder = "— Player —",
}: {
  value: string;
  options: string[];
  onChange: (name: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const q = query.trim().toLowerCase();
  const filtered = q ? options.filter((n) => n.toLowerCase().includes(q)) : options;

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

  function pick(name: string) {
    onChange(name);
    setOpen(false);
    setQuery("");
  }

  return (
    <div className="combobox" ref={ref}>
      <input
        className="combobox-input"
        placeholder={placeholder}
        value={open ? query : value}
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
            if (filtered[active]) { pick(filtered[active]); e.currentTarget.blur(); }
          } else if (e.key === "Escape") {
            setOpen(false);
            setQuery("");
          }
        }}
      />
      {open && (
        <div className="combobox-list">
          {filtered.length === 0 ? (
            <div className="combobox-empty">No players match</div>
          ) : (
            filtered.map((name, i) => (
              <div
                key={name}
                className={`combobox-option${i === active ? " active" : ""}${name === value ? " selected" : ""}`}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => { e.preventDefault(); pick(name); }}
              >
                {name}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
