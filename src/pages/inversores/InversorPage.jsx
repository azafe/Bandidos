// src/pages/inversores/InversorPage.jsx
// La propuesta de un inversor: los datos, las condiciones y una vista previa
// con lo que va a ver él y lo que le queda a Bandidos (eso no se muestra en el
// modo inversor). Se guarda sola en este navegador.
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useInversores } from "../../hooks/useInversores";
import {
  dealSummary,
  DEAL_TIPOS,
  defaultCompromisos,
  ESTADOS,
  newInvestor,
  PERFILES,
  PLAZOS,
  proposalView,
} from "../../lib/inversores";
import { CobradoChart, EscenariosChart } from "../../components/inversores/InvestorCharts";
import { NumberField, SelectField } from "../../components/inversores/fields";
import { makeFormat, monthsText, multiple, pct, recuperoText } from "../../components/inversores/format";
import "../../styles/inversores.css";

const HORIZONTES = PLAZOS.map((m) => ({
  id: String(m),
  label: m % 12 === 0 ? `${m / 12} ${m === 12 ? "año" : "años"} (${m} meses)` : `${m} meses`,
}));
const MONEDAS = [
  { id: "ARS", label: "Pesos de hoy" },
  { id: "USD", label: "Dólares" },
];

export default function InversorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { proyecto, inversores, branch, saveInvestor, removeInvestor } = useInversores();
  const inv = inversores.find((i) => i.id === id);
  const [confirmar, setConfirmar] = useState(false);

  const view = useMemo(() => (branch && inv ? proposalView(branch, proyecto, inv) : null), [branch, proyecto, inv]);

  if (!inv) {
    return (
      <div className="page-content inv">
        <div className="card inv-empty">
          <h2 className="card-title">No encontramos este inversor</h2>
          <p>Puede que se haya borrado o que esté guardado en otro navegador. Si tenés el archivo exportado, importalo.</p>
          <Link to="/inversores" className="btn-primary">Volver a Inversores</Link>
        </div>
      </div>
    );
  }

  const fmt = makeFormat(inv);
  const set = (patch) => saveInvestor({ ...inv, ...patch });
  const setDeal = (patch) => saveInvestor({ ...inv, deal: { ...inv.deal, ...patch } });
  const tipo = inv.deal.tipo;

  function cambiarTipo(nuevo) {
    // Si los compromisos son los sugeridos, se cambian con el tipo.
    const sugeridos = inv.compromisos.trim() === defaultCompromisos(tipo).trim();
    saveInvestor({ ...inv, deal: { ...inv.deal, tipo: nuevo }, compromisos: sugeridos ? defaultCompromisos(nuevo) : inv.compromisos });
  }

  function usarSugerida() {
    const sugerido = newInvestor(inv.perfil, { plataNecesaria: view?.sucursal.plataNecesaria ?? 0 });
    saveInvestor({ ...inv, deal: sugerido.deal, tasaExigida: sugerido.tasaExigida, horizonte: sugerido.horizonte,
      valorFinalMeses: sugerido.valorFinalMeses, compromisos: sugerido.compromisos });
  }

  function duplicar() {
    const copia = saveInvestor({ ...inv, id: newInvestor(inv.perfil).id, nombre: `${inv.nombre || "Sin nombre"} (copia)`, estado: "borrador" });
    navigate(`/inversores/${copia.id}`);
  }

  function borrar() {
    removeInvestor(inv.id);
    navigate("/inversores");
  }

  return (
    <div className="page-content inv">
      <header className="page-header">
        <div>
          <Link to="/inversores" className="inv-back">← Inversores</Link>
          <h1 className="page-title">{inv.nombre || "Inversor sin nombre"}</h1>
          <p className="page-subtitle">{dealSummary(inv, fmt.money, pct)}</p>
        </div>
        <div className="inv-actions">
          <button type="button" className="btn-secondary" onClick={duplicar}>Duplicar</button>
          {view && <Link to={`/presentacion/inversores/${inv.id}`} className="btn-primary">Modo inversor</Link>}
        </div>
      </header>

      {!branch && (
        <div className="card inv-empty">
          <p>Faltan los números de la sucursal. Cargalos en <Link to="/nueva-sucursal">Nueva sucursal</Link>.</p>
        </div>
      )}

      <div className="inv-editor">
        <div className="inv-editor__form">
          <section className="card inv-section" aria-labelledby="inv-datos-title">
            <h2 id="inv-datos-title" className="card-title">El inversor</h2>
            <label className="form-field inv-field">
              <span>Nombre</span>
              <input type="text" value={inv.nombre} placeholder="Cómo aparece en la presentación" onChange={(e) => set({ nombre: e.target.value })} />
            </label>
            <div className="inv-inline">
              <SelectField label="Perfil" value={inv.perfil} options={PERFILES} onChange={(v) => set({ perfil: v })} />
              <SelectField label="Estado" value={inv.estado} options={ESTADOS} onChange={(v) => set({ estado: v })} />
            </div>
            <label className="form-field inv-field">
              <span>Notas internas</span>
              <textarea rows={3} value={inv.notas} placeholder="Qué le importa, qué preguntó, cuándo lo volvés a ver. No se muestra en el modo inversor."
                onChange={(e) => set({ notas: e.target.value })} />
            </label>
          </section>

          <section className="card inv-section" aria-labelledby="inv-prop-title">
            <div className="inv-section__head">
              <h2 id="inv-prop-title" className="card-title">La propuesta</h2>
              <button type="button" className="inv-link" onClick={usarSugerida}>Usar la sugerida para el perfil</button>
            </div>
            <SelectField label="Tipo" value={tipo} options={DEAL_TIPOS} onChange={cambiarTipo} />
            <NumberField label="Cuánto pone" money value={inv.deal.monto} onChange={(v) => setDeal({ monto: v })}
              hint={view ? `La sucursal necesita ${fmt.money(view.sucursal.plataNecesaria)}. ${view.sucursal.aporteBandidos > 0 ? `Bandidos pone ${fmt.money(view.sucursal.aporteBandidos)}.` : "Cubre todo."}${fmt.usd ? ` Se carga en pesos de hoy (${makeFormat({ moneda: "ARS" }).money(inv.deal.monto)}).` : ""}` : undefined} />

            {(tipo === "prestamo" || tipo === "mixto") && (
              <div className="inv-inline">
                <NumberField label="Tasa anual" percent value={inv.deal.tasaAnual} max={5}
                  hint={tipo === "mixto" ? "Baja: el resto lo cobra con la parte de la ganancia." : "Sin inflación si los montos son en pesos de hoy."}
                  onChange={(v) => setDeal({ tasaAnual: v })} />
                <NumberField label="Cuotas" integer min={1} max={120} value={inv.deal.cuotas} onChange={(v) => setDeal({ cuotas: v })} />
                <NumberField label="Meses de gracia" integer max={24} value={inv.deal.gracia}
                  hint="Paga solo interés mientras la sucursal arranca." onChange={(v) => setDeal({ gracia: v })} />
              </div>
            )}
            {(tipo === "prestamo" || tipo === "mixto") && inv.deal.gracia + inv.deal.cuotas > inv.horizonte && view && (
              <p className="inv-note">
                Las cuotas terminan en el mes {inv.deal.gracia + inv.deal.cuotas}, después del plazo de {inv.horizonte} meses:
                al terminar el plazo Bandidos devuelve el saldo que quede ({fmt.money(view.paraBandidos.saldoAlFinal)}).
                Para que no pase, bajá las cuotas o la gracia.
              </p>
            )}

            {tipo === "participacion" && (
              <>
                <label className="inv-check">
                  <input type="checkbox" checked={Boolean(inv.deal.pctHastaRecuperar)}
                    onChange={(e) => setDeal({ pctHastaRecuperar: e.target.checked ? Math.min(1, inv.deal.pct * 2) : null })} />
                  <span>Cobra más hasta recuperar lo que puso</span>
                </label>
                <div className="inv-inline">
                  {inv.deal.pctHastaRecuperar && (
                    <NumberField label="Hasta recuperar" percent max={1} value={inv.deal.pctHastaRecuperar}
                      hint="De la ganancia mensual de la sucursal." onChange={(v) => setDeal({ pctHastaRecuperar: v })} />
                  )}
                  <NumberField label={inv.deal.pctHastaRecuperar ? "Después" : "Parte de la ganancia"} percent max={1} value={inv.deal.pct}
                    onChange={(v) => setDeal({ pct: v })} />
                </div>
              </>
            )}

            {tipo === "mixto" && (
              <NumberField label="Parte de la ganancia" percent max={1} value={inv.deal.pct}
                hint="Además de la cuota." onChange={(v) => setDeal({ pct: v })} />
            )}

            <div className="inv-inline">
              <SelectField label="Plazo de la propuesta" value={String(inv.horizonte)} options={HORIZONTES} onChange={(v) => set({ horizonte: Number(v) })} />
              <NumberField label="Contra qué tasa compara" percent max={5} value={inv.tasaExigida}
                hint="Lo que ganaría en otra inversión parecida, por año y sin inflación." onChange={(v) => set({ tasaExigida: v })} />
            </div>
            {tipo !== "prestamo" && (
              <NumberField label="Recompra al final, en meses de ganancia" integer max={60} value={inv.valorFinalMeses}
                hint="Lo que vale el negocio al terminar el plazo; el inversor cobra su parte. 0 = no se cuenta." onChange={(v) => set({ valorFinalMeses: v })} />
            )}
          </section>

          <section className="card inv-section" aria-labelledby="inv-mostrar-title">
            <h2 id="inv-mostrar-title" className="card-title">Cómo se le muestra</h2>
            <div className="inv-inline">
              <SelectField label="Moneda" value={inv.moneda} options={MONEDAS} onChange={(v) => set({ moneda: v })} />
              {inv.moneda === "USD" && (
                <NumberField label="Tipo de cambio" money value={inv.tipoCambio} hint="Pesos por dólar de hoy."
                  onChange={(v) => set({ tipoCambio: v })} />
              )}
            </div>
            {inv.moneda === "USD" && !fmt.usd && <p className="inv-note">Cargá el tipo de cambio para mostrar en dólares.</p>}
            <label className="form-field inv-field">
              <span>Compromisos de Bandidos</span>
              <textarea rows={6} value={inv.compromisos} onChange={(e) => set({ compromisos: e.target.value })} />
              <small className="form-hint">Uno por línea. Se muestran en la última diapositiva.</small>
            </label>
          </section>

          <div className="inv-danger">
            {confirmar ? (
              <>
                <span>¿Borrar a {inv.nombre || "este inversor"}? No se puede deshacer.</span>
                <button type="button" className="btn-secondary" onClick={() => setConfirmar(false)}>Cancelar</button>
                <button type="button" className="btn-danger" onClick={borrar}>Borrar</button>
              </>
            ) : (
              <button type="button" className="inv-link inv-link--danger" onClick={() => setConfirmar(true)}>Borrar inversor</button>
            )}
          </div>
        </div>

        {view && (
          <div className="inv-editor__preview">
            <section className="card inv-section" aria-labelledby="inv-ve-title">
              <span className="inv-step">Lo que ve el inversor</span>
              <h2 id="inv-ve-title" className="card-title">Su retorno en {view.horizon} meses</h2>
              <dl className="inv-stats">
                <Stat label="Cobra en total" value={fmt.money(view.esperado.inversor.recibido)} />
                <Stat label="Múltiplo" value={multiple(view.esperado.inversor.multiplo)} />
                <Stat label="Le rinde por año (TIR)" value={pct(view.esperado.inversor.tirAnual)}
                  tone={view.esperado.inversor.tirAnual !== null && view.esperado.inversor.tirAnual >= inv.tasaExigida ? "ok" : "warn"}
                  hint={`Compara contra ${pct(inv.tasaExigida)}`} />
                <Stat label="Recupera" value={recuperoText(view.esperado.inversor.payback, view.horizon)} />
              </dl>
              <CobradoChart view={view} fmt={fmt} height={240} />
              <EscenariosChart view={view} fmt={fmt} height={240} />
            </section>

            <section className="card inv-section inv-section--internal" aria-labelledby="inv-band-title">
              <span className="inv-step">Solo para Bandidos</span>
              <h2 id="inv-band-title" className="card-title">Lo que le queda a Bandidos</h2>
              <dl className="inv-stats">
                <Stat label="Plata propia que pone" value={fmt.money(view.paraBandidos.capitalPropio)} />
                <Stat label={`Le queda en ${view.horizon} meses`} value={fmt.money(view.paraBandidos.gananciaTotal)}
                  tone={view.paraBandidos.gananciaTotal < 0 ? "bad" : undefined} />
                <Stat label="Le paga al inversor" value={fmt.money(view.paraBandidos.cedido)} />
                <Stat label="Si va peor, pone" value={fmt.money(view.paraBandidos.capitalPropioPeor)}
                  tone={view.paraBandidos.capitalPropioPeor > view.paraBandidos.capitalPropio * 2 ? "warn" : undefined} />
              </dl>
              <ul className="inv-alerts">
                {view.paraBandidos.mesesSinCubrir > 0 && (
                  <li>En {monthsText(view.paraBandidos.mesesSinCubrir)} la ganancia de la sucursal no alcanza para la cuota: la diferencia sale del local actual.</li>
                )}
                {view.paraBandidos.coberturaMinima !== null && view.paraBandidos.mesesSinCubrir === 0 && (
                  <li>La ganancia cubre la cuota todos los meses (en el peor mes, {view.paraBandidos.coberturaMinima.toLocaleString("es-AR", { maximumFractionDigits: 1 })} veces).</li>
                )}
                {view.esperado.inversor.tirAnual !== null && view.esperado.inversor.tirAnual < inv.tasaExigida && (
                  <li>Al inversor le rinde menos que la tasa con la que compara: es probable que no le cierre. Probá un plazo más largo, una recompra o un porcentaje mayor.</li>
                )}
                {view.sucursal.aporteBandidos === 0 && <li>El inversor pone toda la plata: suele dar más confianza que Bandidos ponga una parte.</li>}
              </ul>
            </section>
          </div>
        )}
      </div>
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
