import { Link } from "react-router-dom";
import { MOTIVOS_RESULTADO } from "../../../lib/trasladosResultados";

const ACCIONES = {
  categorias_sin_elegir: { title: "Elegir categorías de gastos", section: "categorias", label: "Elegir" },
  gastos_sin_revisar: { title: "Confirmar los gastos del mes", section: "gastos", label: "Revisar" },
  historicos_sin_costos: { title: "Registros anteriores sin costos conocidos", section: "historicos", label: "Ver detalle" },
  pago_sin_definir: { title: "Definir condiciones de los choferes", section: "condiciones", label: "Revisar" },
  jornales_sin_registrar: { title: "Registrar jornales pendientes", section: "jornales", label: "Registrar" },
  gastos_fijos_estimados: { title: "Revisar gastos fijos estimados", href: "/expenses/fixed", label: "Ver gastos" },
  importes_sin_distribuir: { title: "Distribuir importes entre móviles", section: "asignaciones", label: "Distribuir" },
  traslados_sin_cobrar: { title: "Registrar cobros de los traslados", href: "/agenda", label: "Ver agenda" },
  cobros_con_operacion_pendiente: { title: "Completar recorridos ya cobrados", href: "/traslados/dia", label: "Ver ruta" },
  operaciones_en_curso: { title: "Completar los recorridos en curso", href: "/traslados/dia", label: "Ver ruta" },
  jornales_sin_chofer: { title: "Asignar chofer a los recorridos", href: "/traslados/dia", label: "Ver ruta" },
};

export default function ResultadosPendientes({ pendientes, onOpen }) {
  if (!pendientes.length) return null;
  return <section className="resultados-pendientes" aria-label="Pendientes del resultado">
    <div className="resultados-pendientes__heading"><h2>Para completar el resultado</h2><span>{pendientes.length}</span></div>
    <ul>{pendientes.map((key) => {
      const action = ACCIONES[key];
      return <li key={key}>
        <span>{action?.title || MOTIVOS_RESULTADO[key] || "Revisar información del período"}</span>
        {action?.href ? <Link to={action.href}>{action.label}<span className="sr-only">: {action.title}</span></Link>
          : <button type="button" onClick={() => onOpen(action?.section || "cuenta")}>{action?.label || "Revisar"}<span className="sr-only">: {action?.title || "información del período"}</span></button>}
      </li>;
    })}</ul>
  </section>;
}
