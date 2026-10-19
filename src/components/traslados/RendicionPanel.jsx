export default function RendicionPanel({ id, title, description, badge, open, onToggle, children }) {
  return <details id={id} className="rendicion-panel" open={open} onToggle={(e) => onToggle(id, e.currentTarget.open)}>
    <summary>
      <span className="rendicion-panel__title"><strong>{title}</strong>{description && <span>{description}</span>}</span>
      {badge !== null && badge !== undefined && <span className="rendicion-panel__badge">{badge}</span>}
      <span className="rendicion-panel__chevron" aria-hidden="true">⌄</span>
    </summary>
    <div className="rendicion-panel__body">{children}</div>
  </details>;
}
