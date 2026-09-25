// Contenedor flotante del módulo Mascotas.
// - variant "drawer": panel lateral derecho en desktop.
// - variant "dialog": modal centrado en desktop.
// En mobile los dos se ven como bottom sheet con asa (se cierran deslizando
// hacia abajo), salvo con `fullscreenOnMobile`, que ocupa toda la pantalla
// (formularios largos).
// Se apilan: Esc cierra solo el de arriba.
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

const stack = [];
let bodyLocks = 0;

export default function Sheet({
  open,
  onClose,
  title,
  hideTitle = false,
  variant = "dialog",
  width,
  fullscreenOnMobile = false,
  footer,
  className = "",
  children,
}) {
  const id = useId();
  const titleId = `${id}-title`;
  const panelRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const [dragY, setDragY] = useState(0);
  const dragStart = useRef(null);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return undefined;
    stack.push(id);
    bodyLocks += 1;
    document.body.style.overflow = "hidden";
    const previousFocus = document.activeElement;
    panelRef.current?.focus({ preventScroll: true });

    function handleKey(event) {
      if (event.key === "Escape" && stack[stack.length - 1] === id) {
        event.stopPropagation();
        onCloseRef.current?.();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("keydown", handleKey);
      const idx = stack.lastIndexOf(id);
      if (idx >= 0) stack.splice(idx, 1);
      bodyLocks -= 1;
      if (bodyLocks <= 0) {
        bodyLocks = 0;
        document.body.style.overflow = "";
      }
      if (previousFocus && typeof previousFocus.focus === "function") {
        previousFocus.focus({ preventScroll: true });
      }
    };
  }, [open, id]);

  if (!open) return null;

  // Deslizar hacia abajo desde el asa o el encabezado (solo bottom sheet).
  function onTouchStart(event) {
    if (fullscreenOnMobile) return;
    dragStart.current = event.touches[0].clientY;
  }
  function onTouchMove(event) {
    if (dragStart.current === null) return;
    setDragY(Math.max(0, event.touches[0].clientY - dragStart.current));
  }
  function onTouchEnd() {
    if (dragStart.current === null) return;
    dragStart.current = null;
    if (dragY > 90) onClose?.();
    setDragY(0);
  }

  const classes = [
    "pv-sheet",
    `pv-sheet--${variant}`,
    fullscreenOnMobile ? "pv-sheet--fullscreen-mobile" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return createPortal(
    <div className="pv-sheet-root" role="presentation">
      <div className="pv-sheet-overlay" onClick={onClose} />
      <div
        ref={panelRef}
        className={classes}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        style={{
          ...(width ? { "--pv-sheet-width": `${width}px` } : null),
          ...(dragY ? { transform: `translateY(${dragY}px)`, transition: "none" } : null),
        }}
      >
        <div
          className="pv-sheet__head"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <span className="pv-sheet__handle" aria-hidden="true" />
          <div className="pv-sheet__titlebar">
            <h2 id={titleId} className={hideTitle ? "pv-visually-hidden" : "pv-sheet__title"}>
              {title}
            </h2>
            <button type="button" className="pv-icon-btn pv-sheet__close" onClick={onClose} aria-label="Cerrar">
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
        <div className="pv-sheet__body">{children}</div>
        {footer && <div className="pv-sheet__footer">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}
