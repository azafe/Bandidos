// Compartimos los controles para que crear, editar y finalizar usen la misma
// decisión explícita, sin confundir un campo vacío con un traslado bonificado.
export default function TrasladoFields({ value, onChange, id, required = false }) {
  const bonificado = value.traslado_bonificado === true;
  return (
    <div className="agenda-traslado-fields">
      <label className="form-field" htmlFor={`${id}-amount`}>
        <span>Monto traslado{required && !bonificado ? " *" : ""}</span>
        <div className="agenda-input-currency">
          <span>$</span>
          <input
            id={`${id}-amount`}
            type="text"
            inputMode="numeric"
            value={value.traslado_amount}
            disabled={bonificado}
            required={required && !bonificado}
            onChange={(event) => onChange({ traslado_amount: event.target.value.replace(/\D/g, "") })}
            placeholder={required ? "Ingresá el monto" : "Podés cargarlo al finalizar"}
          />
        </div>
      </label>
      <label className="agenda-traslado-toggle">
        <input
          type="checkbox"
          checked={bonificado}
          onChange={(event) => onChange({
            traslado_bonificado: event.target.checked,
            traslado_amount: event.target.checked ? "0" : "",
          })}
        />
        <span>Bonificado</span>
      </label>
      <small className="agenda-helper">{bonificado ? "Traslado sin cargo. No se registra un cobro." : "Al finalizar, cargá el monto o marcá Bonificado si fue sin cargo."}</small>
    </div>
  );
}
