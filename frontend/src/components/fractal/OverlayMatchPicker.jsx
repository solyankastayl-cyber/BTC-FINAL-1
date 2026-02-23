import React from "react";

// Phase label mapping
const PHASE_SHORT = {
  ACCUMULATION: "Acc",
  ACC: "Acc",
  DISTRIBUTION: "Dist",
  DIS: "Dist",
  RECOVERY: "Rec",
  REC: "Rec",
  MARKDOWN: "Mark",
  MAR: "Mark",
  MARKUP: "Mkup",
  MKU: "Mkup",
  CAPITULATION: "Cap",
  CAP: "Cap",
};

export function OverlayMatchPicker({ matches, value, onChange }) {
  const top = matches.slice(0, 5);
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {top.map((m, i) => {
        const active = i === value;
        const phaseShort = PHASE_SHORT[m.phase] || m.phase?.slice(0, 4);
        return (
          <button
            key={m.id}
            onClick={() => onChange(i)}
            data-testid={`match-picker-${i}`}
            style={{
              padding: "6px 10px",
              background: active ? "#000" : "#fff",
              color: active ? "#fff" : "#000",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: 11,
              fontWeight: active ? 600 : 400,
              transition: "all 0.15s ease"
            }}
          >
            #{i + 1} · {phaseShort} · {(m.similarity * 100).toFixed(0)}%
          </button>
        );
      })}
    </div>
  );
}
