import { useState } from "react";
import { simularMovil } from "../../lib/trasladosResultados";

const fmt = (n) => n.toLocaleString("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });

export default function SimuladorMovil({ promedio, embedded = false }) {
  const [form, setForm] = useState({ precio: "", dias: "", costoFijo: "", costoVariable: "", modelo: "", valorChofer: "" });
  const change = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const result = simularMovil(form);
  return <section className={embedded ? "resultados-simulador" : "card traslados-resultados-seccion"} aria-label="Simulador de otro móvil">
    {!embedded && <h2>¿Conviene sumar otro móvil?</h2>}
    <p>Probá los costos de un mes. El precio corresponde a un viaje completo de ida y vuelta. La simulación no guarda gastos ni cambia tarifas.</p>
    <div className="form-grid">
      <label className="form-field">Precio promedio por traslado ($)<input type="number" min="0.01" step="0.01" value={form.precio} onChange={change("precio")} /></label>
      <label className="form-field">Días de trabajo por mes<input type="number" min="1" max="31" step="1" value={form.dias} onChange={change("dias")} /></label>
      <label className="form-field">Costo fijo del vehículo por mes ($)<input type="number" min="0" step="0.01" value={form.costoFijo} onChange={change("costoFijo")} /><small>Seguro, patente y financiación o amortización que quieras contemplar.</small></label>
      <label className="form-field">Costo variable por traslado ($)<input type="number" min="0" step="0.01" value={form.costoVariable} onChange={change("costoVariable")} /><small>Nafta y mantenimiento por viaje, sin repetir los costos fijos.</small></label>
      <label className="form-field">Pago al chofer<select value={form.modelo} onChange={change("modelo")}><option value="">Elegí un modelo</option><option value="ninguno">Sin pago al chofer</option><option value="porcentaje">Porcentaje del precio</option><option value="jornal">Jornal por día</option></select></label>
      {form.modelo && form.modelo !== "ninguno" && <label className="form-field">{form.modelo === "porcentaje" ? "Porcentaje (%)" : "Jornal ($)"}<input type="number" min="0" max={form.modelo === "porcentaje" ? 100 : undefined} step="0.01" value={form.valorChofer} onChange={change("valorChofer")} /></label>}
    </div>
    {promedio > 0 && <button type="button" className="btn-secondary" onClick={() => setForm((f) => ({ ...f, precio: promedio.toFixed(2) }))}>Usar promedio cobrado: {fmt(promedio)}</button>}
    <div className="traslados-simulacion" aria-live="polite">
      {result.estado === "pendiente" && <p>Completá los valores para calcular. Si un costo es cero, cargá 0 explícitamente.</p>}
      {result.estado === "invalido" && <p>Revisá los importes, el modelo de pago y los días de trabajo.</p>}
      {result.estado === "sin_margen" && <p>Con estos valores, cada traslado deja {fmt(result.margen)} antes de costos fijos. Aumentar la cantidad de viajes no permite cubrir el costo del móvil.</p>}
      {result.estado === "calculado" && <>
        <strong>{result.porMes} traslados por mes para cubrir los costos</strong>
        <p>Equivale a {result.promedioDiario.toLocaleString("es-AR", { maximumFractionDigits: 2 })} por día en promedio. Una meta diaria constante sería {result.porDia}.</p>
        <p>Cada viaje aporta {fmt(result.margen)} para cubrir {fmt(result.fijos)} mensuales de costos fijos y jornales.</p>
        <small>Este punto de equilibrio no incluye una ganancia objetivo ni garantiza que exista esa demanda.</small>
      </>}
    </div>
  </section>;
}
