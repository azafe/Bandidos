import { useEffect, useRef } from "react";

// Ventana de la planilla: centrada en compu, desde abajo en celular.
export default function Panel({ titulo, subtitulo, onClose, children, id = "pl-panel" }) {
  const ref = useRef(null);
  useEffect(() => {
    const previo = document.activeElement;
    ref.current?.querySelector("[data-autofocus]")?.focus() || ref.current?.querySelector(".pl-close")?.focus();
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      if (previo && typeof previo.focus === "function") previo.focus();
    };
  }, [onClose]);
  return (
    <>
      <div className="pl-scrim" onClick={onClose} />
      <section className="pl-panel" role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} ref={ref}>
        <div className="pl-panel-head">
          <div>
            <h3 id={`${id}-title`}>{titulo}</h3>
            {subtitulo && <p>{subtitulo}</p>}
          </div>
          <button type="button" className="pl-close" onClick={onClose}>× Cerrar</button>
        </div>
        {children}
      </section>
    </>
  );
}

export function Opciones({ opciones, valor, onChange, etiqueta, className = "" }) {
  return (
    <div className="pl-opts" role="group" aria-label={etiqueta}>
      {opciones.map((o) => (
        <button key={String(o.value)} type="button" className={`pl-opt ${o.danger ? "danger" : ""} ${className}`} aria-pressed={String(valor) === String(o.value)} onClick={() => onChange(o.value)}>
          {o.color && <span className="pl-dot" style={{ background: o.color }} />}
          {o.label}
        </button>
      ))}
    </div>
  );
}
