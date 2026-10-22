import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import BandimovilesGuide from "../../components/traslados/BandimovilesGuide";
import { guardarGuia, guiaKey, leerGuia, NUEVO_TRASLADO } from "../../lib/bandimovilesInicio";

function Inicio({ user }) {
  const key = guiaKey(user);
  const [guia, setGuia] = useState(() => leerGuia(key));
  const [params, setParams] = useSearchParams();
  const ayuda = params.get("guia") === "1";
  const visible = ayuda || guia.estado === "activa";
  const actual = ayuda && guia.estado === "terminada" ? { paso: 0, estado: "activa" } : guia;
  useEffect(() => { guardarGuia(key, guia); }, [key, guia]);
  function change(value) {
    setGuia(value);
    // Guardar antes de navegar a Agenda, incluso si este componente se desmonta.
    guardarGuia(key, value);
    if (ayuda) setParams({}, { replace: true });
  }
  return <div className="page-content bandi-home">
    <header className="page-header"><div><h1>Bandimóviles</h1><p>Búsquedas, entregas y cobros, paso a paso.</p></div></header>
    {visible ? <BandimovilesGuide guia={actual} onChange={change} admin={user.role === "admin"} /> : <>
      <section className="bandi-start" aria-label="Empezar un traslado">
        <span className="bandi-eyebrow">Empezá por acá</span><h2>Agendá la próxima búsqueda o entrega</h2>
        <p>Creá el turno de la mascota con traslado. Después seguí el viaje desde el recorrido del día.</p>
        <Link className="btn-primary" to={NUEVO_TRASLADO}>Agendar un traslado</Link>
      </section>
      {guia.estado === "pausada" && <div className="bandi-resume"><p>Tu guía quedó en el paso {guia.paso + 1} de 4.</p><button className="btn-secondary" type="button" onClick={() => change({ ...guia, estado: "activa" })}>Retomar guía</button></div>}
      <div className="bandi-home__cards">
        <Link className="bandi-home__card" to="/traslados/dia"><span>Para el día a día</span><h2>Recorrido del día →</h2><p>Consultá las paradas, avisá al cliente y marcá las búsquedas y entregas.</p></Link>
        <Link className="bandi-home__card" to="/agenda"><span>Cuando te pagan</span><h2>Registrar un cobro →</h2><p>Abrí el turno en Agenda y tocá Registrar cobro en el detalle del traslado.</p></Link>
      </div>
      {user.role === "admin" && <details className="bandi-later"><summary>Cuentas y ajustes</summary><div className="bandi-home__cards">
        <Link className="bandi-home__card" to="/traslados/rendiciones"><h2>Rendiciones →</h2><p>Revisá cuánto entregar o pagar a cada chofer y socio.</p></Link>
        <Link className="bandi-home__card" to="/traslados/resultados"><h2>Resultados →</h2><p>Consultá los cobros, los costos y la ganancia del mes.</p></Link>
        <Link className="bandi-home__card" to="/traslados/configuracion"><h2>Configuración →</h2><p>Administrá móviles, zonas y condiciones de pago a choferes.</p></Link>
      </div></details>}
    </>}
  </div>;
}

export default function BandimovilesInicioPage() {
  const { user } = useAuth();
  return <Inicio key={guiaKey(user)} user={user} />;
}
