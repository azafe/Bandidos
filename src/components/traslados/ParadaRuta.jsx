import { Link } from "react-router-dom";
import { ESTADOS_TRAMO, SIGUIENTE_ESTADO, faltantesParada } from "../../lib/trasladosRuta";
import { mapsLink } from "../../lib/booking/format";
import { bandimovilWhatsAppLink } from "../../utils/whatsapp";

export default function ParadaRuta({ tramo, numero, destacada, driver, busy, onAdvance, orden }) {
  const busqueda = tramo.tipo === "busqueda";
  const terminada = tramo.estado === "entregado";
  const faltantes = faltantesParada(tramo);
  const next = SIGUIENTE_ESTADO[tramo.estado];
  const maps = mapsLink(tramo.direccion?.trim());
  const whatsapp = bandimovilWhatsAppLink(tramo.owner_phone, tramo.owner_name, tramo.pet_name, tramo.tipo);
  const accion = next === "en_camino" ? "Iniciar viaje" : next === "retirado" ? "Confirmar mascota a bordo" : busqueda ? "Confirmar llegada al local" : "Confirmar entrega al dueño";
  return <li className={`recorrido-parada${destacada ? " recorrido-parada--next" : ""}${terminada ? " recorrido-parada--done" : ""}`}>
    <div className="recorrido-parada__numero" aria-label={`Parada ${numero}`}>{terminada ? "✓" : numero}</div>
    <article id={`parada-${tramo.id}`} tabIndex={-1} className="recorrido-parada__card" aria-label={`${busqueda ? "Búsqueda" : "Entrega"} de ${tramo.pet_name || "mascota"}`}>
      <div className="recorrido-parada__heading">
        <div><span className={`recorrido-tipo recorrido-tipo--${tramo.tipo}`}>{busqueda ? "Buscar mascota" : "Llevar a casa"}</span><h3>{tramo.pet_name || "Mascota sin nombre"}</h3></div>
        <div className="recorrido-parada__estado"><span className={`traslados-estado traslados-estado--${tramo.estado}`}>{tramo.estado === "retirado" ? "Mascota a bordo" : terminada ? "Completada" : ESTADOS_TRAMO[tramo.estado] || "Sin estado"}</span><span>{tramo.hora_programada?.slice(0, 5) || "Sin horario"}</span></div>
      </div>
      {destacada && !faltantes.length && <span className="recorrido-proxima">{tramo.estado === "pendiente" ? "Próxima parada de esta ruta" : "Viaje en curso"}</span>}
      <div className="recorrido-parada__info"><p className="recorrido-direccion">{tramo.direccion || "Falta cargar la dirección"}</p><p>{tramo.owner_name || "Dueño sin registrar"}{tramo.owner_phone ? ` · ${tramo.owner_phone}` : " · Sin teléfono"}</p></div>
      {tramo.notas && !terminada && <p className="recorrido-notas">{tramo.notas}</p>}
      {!terminada && faltantes.length > 0 && <div className="recorrido-faltantes"><strong>Antes de salir: completá {faltantes.join(", ")}.</strong>{driver ? <span>Pedile al administrador que complete los datos del traslado.</span> : <Link to="/agenda">Completar en Agenda →</Link>}</div>}
      {!terminada && <div className="recorrido-parada__actions">
        <div className="recorrido-contacto">
          {maps ? <a href={maps} target="_blank" rel="noopener noreferrer">Abrir Maps →</a> : <span>Maps: falta dirección</span>}
          {whatsapp ? <a href={whatsapp} target="_blank" rel="noopener noreferrer">Avisar por WhatsApp →</a> : <span>WhatsApp: falta celular válido</span>}
        </div>
        {next && <button type="button" className="btn-primary" disabled={busy || faltantes.length > 0} onClick={() => onAdvance(tramo, next)}>{accion}<span aria-hidden="true"> →</span></button>}
      </div>}
      {terminada && <p className="recorrido-completada">{busqueda ? "Mascota entregada en el local." : "Mascota entregada al dueño."}</p>}
      {orden}
    </article>
  </li>;
}
