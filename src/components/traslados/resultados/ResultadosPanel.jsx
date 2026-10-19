export default function ResultadosPanel({ id, title, description, badge, open, onToggle, children }) {
  return <details id={id} className="resultados-panel" open={open} onToggle={(e) => onToggle(id, e.currentTarget.open)}>
    <summary>
      <span className="resultados-panel__title"><strong>{title}</strong>{description && <span>{description}</span>}</span>
      {badge !== null && badge !== undefined && <span className="resultados-panel__badge">{badge}</span>}
      <span className="resultados-panel__chevron" aria-hidden="true">⌄</span>
    </summary>
    <div className="resultados-panel__body">{children}</div>
  </details>;
}
