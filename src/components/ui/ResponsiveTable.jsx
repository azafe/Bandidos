// Tabla en escritorio, tarjetas en el teléfono (patrón TablaResponsive de la
// ONG). Las columnas se declaran una sola vez y el componente decide cómo
// mostrarlas, así las dos versiones no dejan de coincidir. En el teléfono:
//
//   TÍTULO                    DESTACADO
//   etiqueta        valor
//   etiqueta        valor
//   [ acción ]
//
// Columna: { label, render(fila), align?, title?, highlight?, action?, desktopOnly? }
import "../../styles/responsive-table.css";

export default function ResponsiveTable({ columns, rows, rowKey, empty = "Sin resultados.", rowClassName }) {
  if (rows.length === 0) return <p className="rt-empty">{empty}</p>;

  const title = columns.find((c) => c.title);
  const highlight = columns.find((c) => c.highlight);
  const actions = columns.filter((c) => c.action);
  const detail = columns.filter((c) => !c.title && !c.highlight && !c.action && !c.desktopOnly);

  return (
    <>
      <div className="rt-cards">
        {rows.map((row) => (
          <div key={rowKey(row)} className={`rt-card ${rowClassName?.(row) ?? ""}`}>
            <div className="rt-card__head">
              <div className="rt-card__title">{title?.render(row)}</div>
              {highlight && <div className="rt-card__highlight">{highlight.render(row)}</div>}
            </div>
            {detail.length > 0 && (
              <dl className="rt-card__detail">
                {detail.map((c) => (
                  <div key={c.label}>
                    <dt>{c.label}</dt>
                    <dd>{c.render(row)}</dd>
                  </div>
                ))}
              </dl>
            )}
            {actions.length > 0 && (
              <div className="rt-card__actions">
                {actions.map((c) => (
                  <div key={c.label}>{c.render(row)}</div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="rt-table-wrap">
        <table className="rt-table">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c.label} className={c.align === "right" ? "is-right" : undefined}>
                  {c.action ? <span className="rt-visually-hidden">{c.label}</span> : c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={rowKey(row)} className={rowClassName?.(row)}>
                {columns.map((c) => (
                  <td key={c.label} className={c.align === "right" ? "is-right" : undefined}>
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
