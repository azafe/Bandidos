// src/pages/inversores/PresentacionInversorPage.jsx
// Modo inversor: la propuesta en diapositivas, a pantalla completa y sin el
// menú de la app, para mostrársela a un inversor. Solo muestra lo que le
// corresponde a él: lo que le queda a Bandidos y las notas internas no salen.
// Se pasa con las flechas del teclado, los botones o tocando los puntos.
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useInversores } from "../../hooks/useInversores";
import { dealSummary, proposalView } from "../../lib/inversores";
import {
  CobradoChart,
  CobrosMensualesChart,
  EscenariosChart,
  ServiciosChart,
  UsoFondosChart,
} from "../../components/inversores/InvestorCharts";
import { makeFormat, multiple, oneDecimal, pct, recuperoText } from "../../components/inversores/format";
import "../../styles/inversores.css";

const fecha = () => new Date().toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });

export default function PresentacionInversorPage() {
  const { id } = useParams();
  const { proyecto, inversores, branch, local } = useInversores();
  const inv = inversores.find((i) => i.id === id);
  const view = useMemo(() => (branch && inv ? proposalView(branch, proyecto, inv) : null), [branch, proyecto, inv]);
  const [index, setIndex] = useState(0);

  const slides = useMemo(() => (view ? buildSlides(view, local) : []), [view, local]);
  const total = slides.length;
  const go = useCallback((i) => setIndex(Math.max(0, Math.min(total - 1, i))), [total]);

  useEffect(() => {
    function onKey(e) {
      if (e.target instanceof HTMLElement && e.target.closest("details, input, textarea, select")) return;
      if (e.key === "ArrowRight" || e.key === "PageDown" || e.key === " ") {
        e.preventDefault();
        go(index + 1);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        go(index - 1);
      } else if (e.key === "Home") go(0);
      else if (e.key === "End") go(total - 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, index, total]);

  if (!inv || !view) {
    return (
      <div className="pres pres--empty">
        <div className="card inv-empty">
          <h2 className="card-title">{inv ? "Faltan los números de la sucursal" : "No encontramos este inversor"}</h2>
          <Link to="/inversores" className="btn-primary">Volver a Inversores</Link>
        </div>
      </div>
    );
  }

  function fullscreen() {
    const el = document.documentElement;
    if (document.fullscreenElement) document.exitFullscreen?.();
    else el.requestFullscreen?.();
  }

  const current = slides[Math.min(index, total - 1)];

  return (
    <div className="pres">
      <header className="pres__bar">
        <Link to={`/inversores/${inv.id}`} className="pres__exit">← Salir</Link>
        <span className="pres__counter" aria-live="polite">{index + 1} / {total} · {current.titulo}</span>
        <div className="pres__bar-actions">
          <button type="button" className="pres__btn" onClick={() => window.print()}>Imprimir / PDF</button>
          <button type="button" className="pres__btn" onClick={fullscreen}>Pantalla completa</button>
        </div>
      </header>

      <main className="pres__stage">
        {slides.map((s, i) => (
          <section key={s.id} className={`pres__slide${i === index ? " is-active" : ""}`} aria-hidden={i !== index} aria-label={s.titulo}>
            {s.render()}
          </section>
        ))}
      </main>

      <nav className="pres__nav" aria-label="Diapositivas">
        <button type="button" className="pres__arrow" onClick={() => go(index - 1)} disabled={index === 0} aria-label="Anterior">←</button>
        <ol className="pres__dots">
          {slides.map((s, i) => (
            <li key={s.id}>
              <button type="button" className={i === index ? "is-active" : undefined} onClick={() => go(i)} aria-label={`${i + 1}. ${s.titulo}`} aria-current={i === index ? "step" : undefined} />
            </li>
          ))}
        </ol>
        <button type="button" className="pres__arrow" onClick={() => go(index + 1)} disabled={index === total - 1} aria-label="Siguiente">→</button>
      </nav>
    </div>
  );
}

function Big({ label, value, hint }) {
  return (
    <div className="pres__big">
      <span>{label}</span>
      <strong>{value}</strong>
      {hint && <small>{hint}</small>}
    </div>
  );
}

function Head({ kicker, title, lead }) {
  return (
    <div className="pres__head">
      {kicker && <span className="pres__kicker">{kicker}</span>}
      <h2>{title}</h2>
      {lead && <p>{lead}</p>}
    </div>
  );
}

function buildSlides(view, local) {
  const { investor: inv, esperado, escenarios, sucursal, horizon } = view;
  const fmt = makeFormat(inv);
  const r = esperado.inversor;
  const peor = escenarios[0].inversor;
  const nombre = inv.nombre || "vos";
  const compromisos = inv.compromisos.split("\n").map((l) => l.trim()).filter(Boolean);
  const supera = r.tirAnual !== null && r.tirAnual >= inv.tasaExigida;

  const slides = [
    {
      id: "portada",
      titulo: "Portada",
      render: () => (
        <div className="pres__cover">
          <img src="/bandidos-logo.jpg" alt="Bandidos" className="pres__logo" />
          <span className="pres__kicker">Propuesta de inversión · {fecha()}</span>
          <h1>Una nueva sucursal de Bandidos</h1>
          <p className="pres__for">Preparada para {nombre}</p>
          <div className="pres__bigs">
            <Big label="Tu aporte" value={fmt.money(inv.deal.monto)} />
            <Big label={`Cobrás en ${horizon} meses`} value={fmt.money(r.recibido)} hint={`${multiple(r.multiplo)} lo que ponés`} />
            <Big label="Recuperás tu plata" value={recuperoText(r.payback, horizon)} />
          </div>
        </div>
      ),
    },
  ];

  if (local) {
    slides.push({
      id: "hoy",
      titulo: "Bandidos hoy",
      render: () => (
        <>
          <Head kicker="Por qué nosotros" title="El modelo ya funciona"
            lead={`Promedio mensual del local actual${local.periodo ? ` (${local.periodo})` : ""}, sacado del sistema de gestión.`} />
          <div className="pres__bigs pres__bigs--grid">
            <Big label="Ingresos por mes" value={fmt.money(local.ingresosMes)} />
            <Big label="Servicios por mes" value={Math.round(local.serviciosMes).toLocaleString("es-AR")} hint={`Ticket promedio ${fmt.money(local.ticket)}`} />
            <Big label="Margen" value={pct(local.margen)} hint="De cada peso que entra, lo que queda" />
            {local.ocupacion !== null && local.ocupacion !== undefined && (
              <Big label="Agenda ocupada" value={pct(local.ocupacion)} hint={local.ocupacion >= 0.8 ? "Hay clientes que hoy no entran" : undefined} />
            )}
            {local.crecimiento !== null && local.crecimiento !== undefined && (
              <Big label="Crecimiento" value={`${local.crecimiento >= 0 ? "+" : ""}${pct(local.crecimiento)}`} hint="Contra los 3 meses anteriores" />
            )}
          </div>
        </>
      ),
    });
  }

  slides.push(
    {
      id: "sucursal",
      titulo: "La sucursal nueva",
      render: () => (
        <>
          <Head kicker="El proyecto" title="Cómo crece la sucursal nueva"
            lead={sucursal.equilibrio
              ? `Necesita ${sucursal.equilibrio} servicios por mes (${oneDecimal(sucursal.equilibrioDiario || 0)} por día) para cubrir sus gastos. Esperamos ${Math.round(sucursal.serviciosRegimen)} una vez arrancada.`
              : undefined} />
          <div className="pres__split">
            <ServiciosChart view={view} fmt={fmt} height={300} />
            <div className="pres__bigs pres__bigs--stack">
              <Big label="Ganancia por mes ya arrancada" value={fmt.money(sucursal.gananciaRegimen)} hint="Después de comisiones, insumos e impuestos" />
              {sucursal.capacidad && <Big label="Capacidad" value={`${Math.round(sucursal.capacidad)} servicios/mes`} hint={`Esperamos usar ${pct(sucursal.serviciosRegimen / sucursal.capacidad)}`} />}
            </div>
          </div>
        </>
      ),
    },
    {
      id: "fondos",
      titulo: "Cuánto se necesita",
      render: () => (
        <>
          <Head kicker="La inversión" title={`Se necesitan ${fmt.money(sucursal.plataNecesaria)}`}
            lead="Incluye lo que se pierde en los primeros meses, mientras la sucursal se llena: no hay que volver a pedir plata." />
          <div className="pres__split">
            <UsoFondosChart view={view} fmt={fmt} />
            <div className="pres__bigs pres__bigs--stack">
              <Big label="Tu aporte" value={fmt.money(sucursal.aporteInversor)} hint={pct(sucursal.aporteInversor / sucursal.plataNecesaria) + " del total"} />
              {sucursal.aporteBandidos > 0 && <Big label="Pone Bandidos" value={fmt.money(sucursal.aporteBandidos)} hint="También arriesgamos lo nuestro" />}
            </div>
          </div>
        </>
      ),
    },
    {
      id: "propuesta",
      titulo: "La propuesta",
      render: () => (
        <>
          <Head kicker="Qué te ofrecemos" title="La propuesta" lead={dealSummary(inv, fmt.money, pct)} />
          <CobrosMensualesChart view={view} fmt={fmt} height={300} />
        </>
      ),
    },
    {
      id: "retorno",
      titulo: "Tu retorno",
      render: () => (
        <>
          <Head kicker="Tu retorno" title={r.payback ? `Recuperás tu plata en el mes ${r.payback}` : `Lo que cobrás en ${horizon} meses`}
            lead={supera
              ? `Te rinde ${pct(r.tirAnual)} por año, por encima del ${pct(inv.tasaExigida)} con el que lo comparás.`
              : `Te rinde ${pct(r.tirAnual)} por año.`} />
          <div className="pres__bigs">
            <Big label={`Cobrás en ${horizon} meses`} value={fmt.money(r.recibido)} />
            <Big label="Multiplicás lo que ponés" value={multiple(r.multiplo)} />
            <Big label="Rendimiento anual (TIR)" value={pct(r.tirAnual)} hint="Sin inflación" />
          </div>
          <CobradoChart view={view} fmt={fmt} height={280} />
        </>
      ),
    },
    {
      id: "riesgos",
      titulo: "Si no sale como esperamos",
      render: () => (
        <>
          <Head kicker="Los riesgos, a la vista" title="¿Y si no sale como esperamos?"
            lead={inv.deal.tipo === "prestamo"
              ? "Con un préstamo, tus cuotas no dependen de cómo le vaya a la sucursal: las garantiza el local que ya funciona."
              : `Si llegan 30% menos clientes de lo esperado, en ${horizon} meses cobrás ${fmt.money(peor.recibido)} (${multiple(peor.multiplo)} lo que ponés). Te lo mostramos para que decidas con todo a la vista.`} />
          <EscenariosChart view={view} fmt={fmt} height={300} />
        </>
      ),
    },
    {
      id: "compromisos",
      titulo: "Compromisos",
      render: () => (
        <>
          <Head kicker="Cómo trabajamos" title="Nuestros compromisos" />
          <ul className="pres__list">
            {compromisos.map((c) => <li key={c}>{c}</li>)}
          </ul>
          <p className="pres__fine">
            Proyección en {fmt.usd ? "dólares" : "pesos de hoy"}, sin inflación, a {horizon} meses. Escenario esperado salvo donde se indica.
            Es una estimación sobre los números del local actual, no una promesa de resultado.
          </p>
        </>
      ),
    },
  );

  return slides;
}
