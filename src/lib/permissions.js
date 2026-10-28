// Roles y permisos por módulo (backend: src/permissions.js), adaptado del
// módulo Permisos de la ONG. Quién entra a qué lo decide el admin de cada
// local en Usuarios › Permisos y lo hace cumplir el backend. Acá solo está lo
// que el panel necesita para armar el menú y no ofrecer pantallas que el
// backend va a rechazar.

export const ADMIN_ONLY = "__admin__";

export const ROLE_LABELS = {
  admin: "Administrador",
  staff: "Staff",
  recepcion: "Recepción",
  peluquero: "Peluquero/a",
  administracion: "Administración",
  user: "Staff",
  super_admin: "Super admin",
};

// Los que se asignan desde Usuarios. 'user' es un rol viejo: se sigue
// mostrando si alguien lo tiene, pero no se ofrece.
export const ROLE_OPTIONS = ["admin", "staff", "recepcion", "peluquero", "administracion"];

export function roleLabel(role) {
  return ROLE_LABELS[role] ?? role ?? "-";
}

// Lo mismo que usa el backend si el local no configuró el rol. Solo se usa si
// no se pudieron leer los permisos: el menú se arma igual y lo que no
// corresponda lo frena el backend.
export const DEFAULT_PERMISSIONS = {
  staff: ["agenda", "bandimoviles", "comunicaciones", "mascotas", "petshop", "caja", "gastos", "tipos_servicio"],
  recepcion: ["agenda", "bandimoviles", "comunicaciones", "mascotas", "petshop", "caja"],
  peluquero: ["agenda", "mascotas"],
  administracion: ["inicio", "servicios", "caja", "gastos", "gastos_fijos", "proveedores", "petshop", "tipos_servicio", "configuracion", "equipo"],
};

export function fallbackModules(role) {
  return DEFAULT_PERMISSIONS[role === "user" ? "staff" : role] ?? [];
}

// El menú, en orden. module: el permiso que lo muestra (ADMIN_ONLY = solo el
// admin). tenantModule: el interruptor del local que maneja el super admin.
export const NAV_ITEMS = [
  { to: "/", label: "Inicio", module: "inicio", tenantModule: "dashboard", end: true },
  { to: "/nueva-sucursal", label: "Nueva sucursal", module: "inicio", tenantModule: "dashboard" },
  { to: "/agenda", label: "Agenda", module: "agenda", tenantModule: "agenda" },
  { to: "/traslados", label: "Bandimóviles", module: "bandimoviles", tenantModule: "agenda" },
  { to: "/reservas-online", label: "Reservas online", module: "reservas", tenantModule: "agenda" },
  { to: "/comunicaciones", label: "Comunicaciones", module: "comunicaciones", tenantModule: "comunicaciones", badge: "comunicaciones" },
  { to: "/pets", label: "Mascotas", module: "mascotas", tenantModule: "pets" },
  { to: "/services", label: "Servicios", module: "servicios", tenantModule: "services" },
  { to: "/petshop", label: "PetShop", module: "petshop", tenantModule: "petshop" },
  { to: "/expenses/daily-incomes", label: "Rendición de Caja", module: "caja", tenantModule: "expenses" },
  { to: "/expenses/daily", label: "Gastos Diarios", module: "gastos", tenantModule: "expenses" },
  { to: "/expenses/fixed", label: "Gastos Fijos", module: "gastos_fijos", tenantModule: "expenses" },
  { to: "/catalog/service-types", label: "Tipos de Servicio", module: "tipos_servicio", tenantModule: "catalog" },
  { to: "/suppliers", label: "Proveedores", module: "proveedores", tenantModule: "suppliers" },
  { to: "/catalog/payment-methods", label: "Método de Pago", module: "configuracion" },
  { to: "/catalog/expense-categories", label: "Categoría Gastos", module: "configuracion" },
  { to: "/admin/users", label: "Usuarios", module: ADMIN_ONLY },
  { to: "/admin/permisos", label: "Permisos", module: ADMIN_ONLY },
  { to: "/employees", label: "Equipo", module: "equipo", tenantModule: "employees" },
];

// ¿Puede ver este módulo? El admin, todo; los demás, lo que tenga su rol.
export function canAccess(permissions, module) {
  if (!permissions) return false;
  if (permissions.is_admin) return true;
  // La cuenta de chofer solo abre su recorrido (el backend la limita igual).
  if (permissions.driver) return module === "bandimoviles";
  if (module === ADMIN_ONLY) return false;
  return (permissions.modules ?? []).includes(module);
}

// Lo que se ve en el menú: el permiso del rol y el interruptor del local.
export function visibleNav(permissions, enabledModules) {
  const tenantOn = (mod) => !mod || !enabledModules || enabledModules[mod] !== false;
  return NAV_ITEMS.filter((item) => canAccess(permissions, item.module) && tenantOn(item.tenantModule));
}

// Adónde cae cada uno al entrar: la primera pantalla que realmente puede abrir.
// null = no tiene ningún módulo.
export function landingPath(permissions, enabledModules) {
  return visibleNav(permissions, enabledModules)[0]?.to ?? null;
}
