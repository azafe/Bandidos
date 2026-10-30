// Reutilizado de azafe/ONG, apps/panel-admin/src/staff/chat/formato.ts.
// Tipos TypeScript removidos para el proyecto JavaScript de Bandidos.
function compararFechasChat(a, b) {
  const diferencia = Date.parse(a) - Date.parse(b);
  if (diferencia !== 0) return diferencia;
  const fraccion = (s) => (s.match(/\.(\d+)/)?.[1] ?? "").padEnd(6, "0");
  return fraccion(a).localeCompare(fraccion(b));
}
function primerMensajeNoLeido(mensajes, hasta, miId) {
  return mensajes.find((m) => !m.eliminado && m.autorId !== miId && compararFechasChat(m.createdAt, hasta) > 0);
}
function filtrarChats(conversaciones, filtro, busqueda = "") {
  const normalizar = (s) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("es-AR");
  const texto = normalizar(busqueda.trim());
  return conversaciones.filter(
    (c) => (filtro === "archivados" ? c.archivado : !c.archivado && (filtro !== "favoritos" || c.favorito)) && (!texto || normalizar(c.nombre).includes(texto))
  ).sort((a, b) => Number(b.favorito) - Number(a.favorito) || b.ultimoMensajeAt.localeCompare(a.ultimoMensajeAt));
}
const hora = new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false });
const diaSemana = new Intl.DateTimeFormat("es-AR", { weekday: "long" });
const fechaCorta = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "2-digit" });
const fechaLarga = new Intl.DateTimeFormat("es-AR", { weekday: "long", day: "numeric", month: "long" });
const inicioDelDia = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const diasAtras = (d, hoy = /* @__PURE__ */ new Date()) => Math.round((inicioDelDia(hoy) - inicioDelDia(d)) / 864e5);
const mismoDia = (a, b) => inicioDelDia(new Date(a)) === inicioDelDia(new Date(b));
function horaLista(iso, hoy = /* @__PURE__ */ new Date()) {
  const d = new Date(iso);
  const dias = diasAtras(d, hoy);
  if (dias <= 0) return hora.format(d);
  if (dias === 1) return "Ayer";
  if (dias < 7) return diaSemana.format(d);
  return fechaCorta.format(d);
}
const horaMensaje = (iso) => hora.format(new Date(iso));
function etiquetaDia(iso, hoy = /* @__PURE__ */ new Date()) {
  const d = new Date(iso);
  const dias = diasAtras(d, hoy);
  if (dias <= 0) return "Hoy";
  if (dias === 1) return "Ayer";
  const texto = fechaLarga.format(d);
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
function textoUltimaVez(iso, hoy = /* @__PURE__ */ new Date()) {
  const d = new Date(iso);
  const dias = diasAtras(d, hoy);
  if (dias <= 0) return `\xFAlt. vez hoy a las ${hora.format(d)}`;
  if (dias === 1) return `\xFAlt. vez ayer a las ${hora.format(d)}`;
  return `\xFAlt. vez el ${fechaCorta.format(d)}`;
}
function vistaPrevia(c, miId, nombreDe) {
  if (!c.ultimoAutorId) return "Todav\xEDa no hay mensajes";
  const quien = c.ultimoAutorId === miId ? "Vos: " : c.tipo === "grupo" ? `${nombreDe(c.ultimoAutorId).split(" ")[0]}: ` : "";
  if (c.ultimoEliminado) return `${quien}Mensaje eliminado`;
  if (c.ultimoTieneFoto) return `${quien}\u{1F4F7} ${c.ultimoTexto || "Foto"}`;
  return `${quien}${c.ultimoTexto ?? ""}`;
}
function mensajeNuevo(previas, conversaciones, miId) {
  return conversaciones.filter(
    (c) => previas.get(c.id) !== c.ultimoMensajeAt && c.ultimoAutorId !== null && c.ultimoAutorId !== miId && c.noLeidos > 0 && !c.silenciado
  ).sort((a, b) => b.ultimoMensajeAt.localeCompare(a.ultimoMensajeAt))[0];
}
const URL_RE = String.raw`(?:https?:\/\/|www\.)[^\s<]+[^\s<.,;:!?)"'»]`;
const MAIL_RE = String.raw`[\w.+-]+@[\w-]+(?:\.[\w-]+)+`;
const TEL_RE = String.raw`(?<![\w-])\+?\d[\d\s-]{6,16}\d(?![\w-])`;
const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function esTelefono(valor) {
  const cifras = valor.replace(/\D/g, "");
  if (cifras.length < 10 || cifras.length > 13) return false;
  return !/^\d{2}-\d{8}-\d$/.test(valor.trim());
}
function partesDeTexto(texto, menciones = []) {
  const etiquetas = [...menciones].sort((a, b) => b.etiqueta.length - a.etiqueta.length);
  const alternativas = [
    etiquetas.length ? String.raw`(?<mencion>@(?:${etiquetas.map((m) => escapar(m.etiqueta)).join("|")}))(?![\p{L}\d])` : null,
    `(?<url>${URL_RE})`,
    `(?<mail>${MAIL_RE})`,
    `(?<tel>${TEL_RE})`
  ].filter(Boolean);
  const re = new RegExp(alternativas.join("|"), "giu");
  const partes = [];
  let desde = 0;
  const sumarTexto = (hasta) => {
    if (hasta > desde) partes.push({ tipo: "texto", valor: texto.slice(desde, hasta) });
  };
  for (const m of texto.matchAll(re)) {
    const valor = m[0];
    const inicio = m.index ?? 0;
    const g = m.groups ?? {};
    let parte = null;
    if (g.mencion) {
      const etiqueta = valor.slice(1).toLocaleLowerCase("es-AR");
      const quien = etiquetas.find((e) => e.etiqueta.toLocaleLowerCase("es-AR") === etiqueta);
      if (quien) parte = { tipo: "mencion", valor, id: quien.id };
    } else if (g.url) {
      parte = { tipo: "link", valor, href: valor.startsWith("www.") ? `https://${valor}` : valor };
    } else if (g.mail) {
      parte = { tipo: "link", valor, href: `mailto:${valor}` };
    } else if (g.tel && esTelefono(valor)) {
      parte = { tipo: "link", valor, href: `tel:${valor.replace(/[^\d+]/g, "")}` };
    }
    if (!parte) continue;
    sumarTexto(inicio);
    partes.push(parte);
    desde = inicio + valor.length;
  }
  sumarTexto(texto.length);
  return partes;
}
function mencionEnCurso(texto, cursor) {
  const antes = texto.slice(0, cursor);
  const m = /(^|\s)@([\p{L}]*)$/u.exec(antes);
  if (!m) return null;
  return { inicio: cursor - m[2].length - 1, busqueda: m[2] };
}
export {
  compararFechasChat,
  etiquetaDia,
  filtrarChats,
  horaLista,
  horaMensaje,
  mencionEnCurso,
  mensajeNuevo,
  mismoDia,
  partesDeTexto,
  primerMensajeNoLeido,
  textoUltimaVez,
  vistaPrevia
};
