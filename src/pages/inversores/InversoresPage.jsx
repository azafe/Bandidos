// src/pages/inversores/InversoresPage.jsx
// Lista de inversores, cada uno con su propuesta para la sucursal nueva, y la
// comparación entre propuestas. La sucursal sale del simulador de
// /nueva-sucursal; los inversores se guardan en este navegador y se pueden
// exportar e importar en un archivo.
import { useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useInversores } from "../../hooks/useInversores";
import { DEAL_TIPOS, ESTADOS, newInvestor, PERFILES, PLAZO_MAXIMO, proposalView } from "../../lib/inversores";
import { ComparacionChart } from "../../components/inversores/InvestorCharts";
import { NumberField } from "../../components/inversores/fields";
import { makeFormat, multiple, pct, recuperoText } from "../../components/inversores/format";
import "../../styles/inversores.css";

const COMPARE_HORIZON = PLAZO_MAXIMO;
const pesos = makeFormat(null);

export default function InversoresPage() {
  const navigate = useNavigate();
  const { proyecto, inversores, branch, local, saveInvestor, setProyecto, importText, exportText } = useInversores();
  const [eligiendo, setEligiendo] = useState(false);
  const [aviso, setAviso] = useState("");
  const fileRef = useRef(null);

  const vistas = useMemo(
    () => (branch ? inversores.map((inv) => ({ inv, view: proposalView(branch, proyecto, inv) })) : []),
    [branch, proyecto, inversores]
  );
  // Para comparar, todas al mismo plazo.
  const comparacion = useMemo(
    () =>
      branch
        ? inversores.map((inv) => {
            const v = proposalView(branch, proyecto, { ...inv, horizonte: COMPARE_HORIZON });
            return {
              id: inv.id,
              nombre: inv.nombre || "Sin nombre",
              inv,
              view: v,
              queda: v.paraBandidos.gananciaTotal,
            };
          })
        : [],
    [branch, proyecto, inversores]
  );
  const base = useMemo(() => (branch ? proposalView(branch, proyecto, newInvestor("privado")) : null), [branch, proyecto]);

  function crear(perfilId) {
    const inv = saveInvestor(newInvestor(perfilId, { plataNecesaria: base?.sucursal.plataNecesaria ?? 0 }));
    navigate(`/inversores/${inv.id}`);
  }

  function exportar() {
    const blob = new Blob([exportText()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bandidos-inversores-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function importar(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const n = importText(await file.text());
    setAviso(n > 0 ? `Se importaron ${n} ${n === 1 ? "inversor" : "inversores"}.` : "El archivo no tiene inversores.");
  }

  return (
    <div className="page-content inv">
      <header className="page-header">
        <div>
          <h1 className="page-title">Inversores</h1>
          <p className="page-subtitle">Una propuesta para cada inversor, con los números de la sucursal nueva. Abrí el modo inversor para mostrársela.</p>
        </div>
        <div className="inv-actions">
          <button type="button" className="btn-secondary" onClick={exportar} disabled={!inversores.length}>Exportar</button>
          <button type="button" className="btn-secondary" onClick={() => fileRef.current?.click()}>Importar</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={importar} />
          {branch && <button type="button" className="btn-primary" onClick={() => setEligiendo((v) => !v)}>Nuevo inversor</button>}
        </div>
      </header>

      {aviso && <p className="inv-aviso" role="status">{aviso}</p>}

      {!branch && (
        <div className="card inv-empty">
          <h2 className="card-title">Primero armá la sucursal</h2>
          <p>Las propuestas usan los números de la sucursal nueva: inversión, gastos fijos, ticket y servicios esperados. Cargalos en Nueva sucursal y volvé.</p>
          <Link to="/nueva-sucursal" className="btn-primary">Ir a Nueva sucursal</Link>
        </div>
      )}

      {branch && eligiendo && (
        <section className="card inv-section" aria-labelledby="inv-perfil-title">
          <h2 id="inv-perfil-title" className="card-title">¿Qué tipo de inversor es?</h2>
          <p className="inv-muted">Arranca con la propuesta que mejor le suele cerrar a ese perfil. Después la cambiás como quieras.</p>
          <div className="inv-perfiles">
            {PERFILES.map((p) => (
              <button key={p.id} type="button" className="inv-perfil" onClick={() => crear(p.id)}>
                <strong>{p.label}</strong>
                <span>{p.hint}</span>
                <small>{DEAL_TIPOS.find((t) => t.id === p.deal.tipo).label}</small>
              </button>
            ))}
          </div>
        </section>
      )}

      {branch && base && (
        <section className="card inv-section" aria-labelledby="inv-suc-title">
          <div className="inv-section__head">
            <div>
              <span className="inv-step">La sucursal</span>
              <h2 id="inv-suc-title" className="card-title">Lo que comparten todas las propuestas</h2>
            </div>
            <Link to="/nueva-sucursal" className="btn-secondary">Cambiar en Nueva sucursal</Link>
          </div>
          <dl className="inv-stats">
            <Stat label="Inversión" value={pesos.money(base.sucursal.inversion)} />
            <Stat label="Plata necesaria" value={pesos.money(base.sucursal.plataNecesaria)} hint="Inversión más lo que se pierde en el arranque" />
            <Stat label="Ganancia por mes ya arrancada" value={pesos.money(base.sucursal.gananciaRegimen)} />
            <Stat label="Equilibrio" value={base.sucursal.equilibrio ? `${base.sucursal.equilibrio} servicios/mes` : "No hay"} />
          </dl>
          <div className="inv-inline">
            <NumberField label="Ingresos Brutos y tasas sobre lo facturado" percent value={proyecto.iibbPct} max={1}
              onChange={(v) => setProyecto({ iibbPct: v })} />
            <NumberField label="Impuesto a las Ganancias sobre la ganancia" percent value={proyecto.gananciasPct} max={1}
              onChange={(v) => setProyecto({ gananciasPct: v })} hint="0 si la sucursal es monotributo." />
          </div>
          {!local && (
            <p className="inv-note">
              Para mostrarle al inversor cómo está el local hoy, abrí Nueva sucursal una vez: guarda el resumen del local.
            </p>
          )}
        </section>
      )}

      {branch && vistas.length === 0 && !eligiendo && (
        <div className="card inv-empty">
          <h2 className="card-title">Todavía no hay inversores</h2>
          <p>Sumá uno con «Nuevo inversor». Cada uno tiene su propia propuesta: cuánto pone, cómo cobra y a qué plazo.</p>
        </div>
      )}

      {vistas.length > 0 && (
        <div className="inv-cards">
          {vistas.map(({ inv, view }) => (
            <InvestorCard key={inv.id} inv={inv} view={view} />
          ))}
        </div>
      )}

      {comparacion.length > 1 && (
        <section className="card inv-section" aria-labelledby="inv-cmp-title">
          <div className="inv-section__head">
            <div>
              <span className="inv-step">Comparar</span>
              <h2 id="inv-cmp-title" className="card-title">¿Qué propuesta le conviene más a Bandidos?</h2>
            </div>
          </div>
          <ComparacionChart rows={comparacion} fmt={pesos} horizon={COMPARE_HORIZON} />
          <div className="inv-table-wrap">
            <table className="inv-table">
              <thead>
                <tr>
                  <th>Inversor</th><th>Propuesta</th><th>Pone</th><th>Cobra en total</th><th>Le rinde</th>
                  <th>Recupera</th><th>Bandidos pone</th><th>Le queda a Bandidos</th><th>Si va peor, Bandidos pone</th>
                </tr>
              </thead>
              <tbody>
                {comparacion.map(({ id, nombre, inv, view: v }) => (
                  <tr key={id}>
                    <td>{nombre}</td>
                    <td>{DEAL_TIPOS.find((t) => t.id === inv.deal.tipo).corto}</td>
                    <td>{pesos.money(inv.deal.monto)}</td>
                    <td>{pesos.money(v.esperado.inversor.recibido)}</td>
                    <td>{pct(v.esperado.inversor.tirAnual)}</td>
                    <td>{recuperoText(v.esperado.inversor.payback, COMPARE_HORIZON)}</td>
                    <td>{pesos.money(v.paraBandidos.capitalPropio)}</td>
                    <td className={v.paraBandidos.gananciaTotal < 0 ? "is-negative" : undefined}>{pesos.money(v.paraBandidos.gananciaTotal)}</td>
                    <td>{pesos.money(v.paraBandidos.capitalPropioPeor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="inv-note">Todas a {COMPARE_HORIZON} meses y en pesos de hoy, para que se puedan comparar. «Le rinde» es la TIR anual del inversor.</p>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value, hint, tone }) {
  return (
    <div className={`inv-stat${tone ? ` inv-stat--${tone}` : ""}`}>
      <dt>{label}</dt>
      <dd>{value}</dd>
      {hint && <small>{hint}</small>}
    </div>
  );
}

function InvestorCard({ inv, view }) {
  const fmt = makeFormat(inv);
  const estado = ESTADOS.find((e) => e.id === inv.estado);
  const perfil = PERFILES.find((p) => p.id === inv.perfil);
  const r = view.esperado.inversor;
  return (
    <article className="card inv-card">
      <div className="inv-card__head">
        <div>
          <h3>{inv.nombre || "Sin nombre"}</h3>
          <span className="inv-muted">{perfil?.label} · {DEAL_TIPOS.find((t) => t.id === inv.deal.tipo).label}</span>
        </div>
        <span className={`inv-pill inv-pill--${inv.estado}`}>{estado?.label}</span>
      </div>
      <dl className="inv-card__stats">
        <div><dt>Pone</dt><dd>{fmt.money(inv.deal.monto)}</dd></div>
        <div><dt>Cobra en {view.horizon} meses</dt><dd>{fmt.money(r.recibido)}</dd></div>
        <div><dt>Múltiplo</dt><dd>{multiple(r.multiplo)}</dd></div>
        <div><dt>Le rinde por año</dt><dd>{pct(r.tirAnual)}</dd></div>
        <div><dt>Recupera</dt><dd>{recuperoText(r.payback, view.horizon)}</dd></div>
        <div><dt>Bandidos pone</dt><dd>{fmt.money(view.paraBandidos.capitalPropio)}</dd></div>
      </dl>
      <div className="inv-card__actions">
        <Link to={`/inversores/${inv.id}`} className="btn-secondary">Editar</Link>
        <Link to={`/presentacion/inversores/${inv.id}`} className="btn-primary">Modo inversor</Link>
      </div>
    </article>
  );
}
