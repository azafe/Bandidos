// Equipo: organigrama y personal, adaptado del módulo Equipo de la ONG.
// El backend manda tres listas planas (puestos, empleados, asignaciones) y el
// árbol se arma acá: son decenas de cajas, no vale un pedido por nivel.

// El color deja ver de un vistazo qué parte del negocio es cada caja. No
// agrupa ni da permisos.
export const TEAM_AREAS = [
  { value: "direccion", label: "Dirección", color: "#8356ff" },
  { value: "administracion", label: "Administración", color: "#2563eb" },
  { value: "recepcion", label: "Recepción", color: "#0891b2" },
  { value: "peluqueria", label: "Peluquería", color: "#d946ef" },
  { value: "bandimoviles", label: "Bandimóviles", color: "#ea580c" },
  { value: "petshop", label: "PetShop", color: "#16a34a" },
  { value: "otro", label: "Otro", color: "#6b7180" },
];

const AREA_BY_VALUE = new Map(TEAM_AREAS.map((a) => [a.value, a]));

export function areaOf(value) {
  return AREA_BY_VALUE.get(value) || AREA_BY_VALUE.get("otro");
}

export function isActiveEmployee(employee) {
  return employee?.status === "active" || employee?.status === "Activo";
}

export function initials(name) {
  return String(name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("") || "?";
}

// puesto → personas y persona → puestos.
export function indexAssignments(assignments = []) {
  const byPosition = new Map();
  const byEmployee = new Map();
  for (const a of assignments) {
    const p = String(a.position_id);
    const e = String(a.employee_id);
    byPosition.set(p, [...(byPosition.get(p) ?? []), e]);
    byEmployee.set(e, [...(byEmployee.get(e) ?? []), p]);
  }
  return { byPosition, byEmployee };
}

const bySortThenName = (a, b) =>
  (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0) || String(a.name).localeCompare(String(b.name), "es");

// Un puesto cuyo jefe ya no existe (o que quedó en un ciclo por un dato viejo)
// igual tiene que verse: se cuelga de la raíz en vez de desaparecer. En las
// cajas solo aparecen las personas activas; las dadas de baja siguen en el
// personal.
export function buildTree({ positions = [], employees = [], assignments = [] }) {
  const employeeById = new Map(employees.map((e) => [String(e.id), e]));
  const { byPosition } = indexAssignments(assignments);
  const ids = new Set(positions.map((p) => String(p.id)));
  const childrenOf = new Map();
  for (const position of positions) {
    const parent = position.parent_id && ids.has(String(position.parent_id)) ? String(position.parent_id) : null;
    childrenOf.set(parent, [...(childrenOf.get(parent) ?? []), position]);
  }

  const visited = new Set();
  const build = (position) => {
    visited.add(String(position.id));
    return {
      position,
      people: (byPosition.get(String(position.id)) ?? [])
        .map((id) => employeeById.get(id))
        .filter((e) => e && isActiveEmployee(e))
        .sort((a, b) => String(a.name).localeCompare(String(b.name), "es")),
      children: [...(childrenOf.get(String(position.id)) ?? [])]
        .sort(bySortThenName)
        .filter((child) => !visited.has(String(child.id)))
        .map(build),
    };
  };

  const roots = [...(childrenOf.get(null) ?? [])].sort(bySortThenName).map(build);
  // Lo que quedó afuera (ciclos): se recorre de a uno, porque armar uno puede
  // visitar a otro de la lista.
  const loose = [];
  for (const position of [...positions].sort(bySortThenName)) {
    if (!visited.has(String(position.id))) loose.push(build(position));
  }
  return [...roots, ...loose];
}

// El puesto y todos los que tiene debajo: no pueden ser su nuevo jefe.
export function descendants(positions, positionId) {
  const result = new Set([String(positionId)]);
  let added = true;
  while (added) {
    added = false;
    for (const p of positions) {
      if (p.parent_id && result.has(String(p.parent_id)) && !result.has(String(p.id))) {
        result.add(String(p.id));
        added = true;
      }
    }
  }
  return result;
}

// "Dirección › Recepción › Peluquería": para elegir de quién depende sin ver
// el árbol.
export function positionPath(positions, positionId) {
  const byId = new Map(positions.map((p) => [String(p.id), p]));
  const names = [];
  const seen = new Set();
  let current = byId.get(String(positionId));
  while (current && !seen.has(String(current.id))) {
    seen.add(String(current.id));
    names.unshift(current.name);
    current = current.parent_id ? byId.get(String(current.parent_id)) : null;
  }
  return names.join(" › ");
}

export function teamStats({ positions = [], employees = [], assignments = [] }) {
  const { byPosition, byEmployee } = indexAssignments(assignments);
  const active = employees.filter(isActiveEmployee);
  const activeIds = new Set(active.map((e) => String(e.id)));
  return {
    positions: positions.length,
    vacant: positions.filter((p) => !(byPosition.get(String(p.id)) ?? []).some((id) => activeIds.has(id))).length,
    active: active.length,
    withoutPosition: active.filter((e) => !(byEmployee.get(String(e.id)) ?? []).length).length,
  };
}

// "2024-03-01" → "01/03/2024", sin pasar por Date (no corre el día por UTC).
export function formatDay(value) {
  const [y, m, d] = String(value ?? "").slice(0, 10).split("-");
  return y && m && d ? `${d}/${m}/${y}` : "";
}

// Las asignaciones se guardan por puesto (quiénes lo ocupan), así que cambiar
// los puestos de una persona es rehacer la lista de cada puesto que la ganó o
// la perdió. Las personas dadas de baja que sigan asignadas se limpian: el
// backend solo acepta activas. Devuelve [{ positionId, employeeIds }].
export function assignmentChanges(team, employeeId, selectedPositionIds) {
  const id = String(employeeId);
  const selected = new Set(selectedPositionIds.map(String));
  const activeIds = new Set(team.employees.filter(isActiveEmployee).map((e) => String(e.id)));
  const { byPosition } = indexAssignments(team.assignments);
  const changes = [];
  for (const position of team.positions) {
    const pid = String(position.id);
    const current = byPosition.get(pid) ?? [];
    const had = current.includes(id);
    const wants = selected.has(pid);
    if (had === wants) continue;
    const others = current.filter((x) => x !== id && activeIds.has(x));
    changes.push({ positionId: pid, employeeIds: wants ? [...others, id] : others });
  }
  return changes;
}

export function positionsOfEmployee(team, employeeId) {
  const { byEmployee } = indexAssignments(team?.assignments);
  return byEmployee.get(String(employeeId)) ?? [];
}

// Roles del personal (los mismos que usaba el formulario anterior).
export const EMPLOYEE_ROLES = ["Groomer", "Recepción", "Ayudante", "Administración", "Socio", "Chofer", "Otro"];
