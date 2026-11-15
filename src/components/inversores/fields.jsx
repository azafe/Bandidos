// Campos numéricos de las propuestas. Mientras se escribe se respeta lo
// tipeado; fuera del foco se muestra con separador de miles. `percent` guarda
// 0,3 y muestra 30.
import { useState } from "react";
import { parseNumberInput } from "../../lib/sucursal";

function show(value, { money, percent }) {
  if (!Number.isFinite(value)) return "";
  const v = percent ? value * 100 : value;
  return money
    ? Math.round(v).toLocaleString("es-AR")
    : Number(v).toLocaleString("es-AR", { maximumFractionDigits: 2 });
}

export function NumberField({ label, value, onChange, hint, prefix, suffix, min = 0, max, money = false, percent = false, integer = false }) {
  const [draft, setDraft] = useState(null);
  const shown = draft ?? show(value, { money, percent });
  return (
    <label className="form-field inv-field">
      <span>{label}</span>
      <span className="inv-input">
        {(prefix || money) && <span className="inv-affix">{prefix || "$"}</span>}
        <input
          type="text"
          inputMode={integer || money ? "numeric" : "decimal"}
          autoComplete="off"
          value={shown}
          onFocus={() => setDraft(value ? show(value, { money, percent }) : "")}
          onBlur={() => setDraft(null)}
          onChange={(e) => {
            const text = e.target.value;
            setDraft(text);
            let n = parseNumberInput(text, { money }) ?? 0;
            if (percent) n /= 100;
            if (integer || money) n = Math.round(n);
            onChange(Math.max(min, max === undefined ? n : Math.min(max, n)));
          }}
        />
        {(suffix || percent) && <span className="inv-affix">{suffix || "%"}</span>}
      </span>
      {hint && <small className="form-hint">{hint}</small>}
    </label>
  );
}

export function SelectField({ label, value, onChange, options, hint }) {
  return (
    <label className="form-field inv-field">
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.id} value={o.id}>{o.label}</option>
        ))}
      </select>
      {hint && <small className="form-hint">{hint}</small>}
    </label>
  );
}
