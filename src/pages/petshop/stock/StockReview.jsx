// Revisión: lo que hay que mirar para que el sistema coincida con el estante.
// Lo que quedó en negativo, lo que nunca se contó o hace mucho, lo que está
// bajo mínimo y las diferencias que encontraron los conteos (dónde se pierde
// mercadería, valuado al costo).
import { useEffect, useState } from "react";
import { getReview } from "../../../services/petshopStockApi";
import { agoText, formatDelta, formatStock } from "../../../lib/petshopStock";

const money = (n) => {
  const v = Math.round(Number(n) || 0);
  return `${v < 0 ? "−" : ""}$${Math.abs(v).toLocaleString("es-AR")}`;
};
const who = (email) => (email ? email.split("@")[0] : null);

export default function StockReview({ onCountMany, reloadKey }) {
  const [review, setReview] = useState(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    getReview()
      .then((data) => {
        if (cancelled) return;
        setReview(data);
        setError("");
      })
      .catch((err) => !cancelled && setError(err?.message || "No se pudo cargar la revisión."));
    return () => {
      cancelled = true;
    };
  }, [reloadKey, retry]);

  if (error) {
    return (
      <div className="card ps-error" role="alert">
        {error} <button type="button" className="ps-link" onClick={() => setRetry((n) => n + 1)}>Reintentar</button>
      </div>
    );
  }
  if (!review) return <div className="card ps-empty">Cargando…</div>;

  const sections = [
    {
      id: "negativos",
      title: "En negativo",
      help: "El sistema dice que hay menos de cero: faltó registrar un ingreso o hay que contarlo.",
      rows: review.negatives,
      tone: "bad",
      render: (p) => <span className="is-negative">{formatStock(p.stock)}</span>,
    },
    {
      id: "sin-contar",
      title: "Nunca contados",
      help: "Su número viene de la carga del producto, nadie lo verificó en el estante.",
      rows: review.never_counted,
      tone: "warn",
      render: (p) => formatStock(p.stock),
    },
    {
      id: "recontar",
      title: `Contados hace más de ${review.recount_days} días`,
      help: "Tienen stock pero el número ya puede no ser real.",
      rows: review.recount,
      tone: "muted",
      render: (p) => `${formatStock(p.stock)} · ${agoText(p.last_counted_at)}`,
    },
    {
      id: "bajo-minimo",
      title: "Bajo mínimo",
      help: "Conviene reponer.",
      rows: review.below_min,
      tone: "warn",
      render: (p) => `${formatStock(p.stock)} / mín. ${p.stock_min}`,
      noCount: true,
    },
  ];

  return (
    <div className="ps-review">
      <div className="ps-cards">
        {sections.map((s) => (
          <a key={s.id} href={`#${s.id}`} className={`ps-card ps-card--link${s.rows.length ? ` has-items ps-card--tone-${s.tone}` : ""}`}>
            <strong>{s.rows.length}</strong>
            <span>{s.title}</span>
          </a>
        ))}
        <a href="#diferencias" className={`ps-card ps-card--link${review.differences.length ? " has-items ps-card--tone-bad" : ""}`}>
          <strong>{money(review.differences_value)}</strong>
          <span>Diferencias de conteo ({review.review_days} días)</span>
        </a>
      </div>

      <section id="diferencias" className="card ps-review__section">
        <h2 className="card-title">Diferencias encontradas al contar</h2>
        <p className="card-subtitle">
          Últimos {review.review_days} días. Valuadas al costo: en negativo es mercadería que faltó.
        </p>
        {review.differences.length === 0 ? (
          <p className="ps-ok-note">✓ Los conteos de este período coincidieron con el sistema.</p>
        ) : (
          <ul className="ps-diff-list">
            {review.differences.map((d) => (
              <li key={d.id}>
                <div>
                  <strong>{d.product_name}</strong>
                  <span className="ps-muted">
                    {[d.note, who(d.user_email), agoText(d.created_at)].filter(Boolean).join(" · ")}
                  </span>
                </div>
                <span className={`ps-delta${d.delta < 0 ? " is-negative" : ""}`}>
                  {formatDelta(d.delta)} · {money(d.value)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {sections.map((s) => (
        <section key={s.id} id={s.id} className="card ps-review__section">
          <div className="ps-review__head">
            <div>
              <h2 className="card-title">{s.title}</h2>
              <p className="card-subtitle">{s.help}</p>
            </div>
            {!s.noCount && s.rows.length > 0 && (
              <button type="button" className="btn-secondary" onClick={() => onCountMany(s.rows.map((p) => p.id))}>
                Contar {s.rows.length === 1 ? "este" : `estos ${s.rows.length}`}
              </button>
            )}
          </div>
          {s.rows.length === 0 ? (
            <p className="ps-ok-note">✓ Nada por acá.</p>
          ) : (
            <ul className="ps-simple-list">
              {s.rows.map((p) => (
                <li key={p.id}>
                  <span>{p.name}</span>
                  <span className="ps-simple-list__value">{s.render(p)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
