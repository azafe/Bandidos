# Equipo: organigrama y personal

Adaptado del módulo Equipo de la ONG (`azafe/ONG`, panel staff › Equipo).
La pantalla Equipo (`/employees`) suma dos pestañas: **Personal** (lo de
antes) y **Organigrama** (`?vista=organigrama`). Necesita el backend con la
migración `031_equipo_organigrama.sql`. Solo admin, como hasta ahora.

Tres cosas separadas, igual que en la ONG:

- **Puesto**: la caja del organigrama, con qué hace, área (solo el color) y de
  quién depende. Una persona puede ocupar varios puestos y un puesto tener
  varias personas.
- **Persona**: el empleado de siempre (agenda, comisiones, Bandimóviles). Suma
  DNI, fecha de ingreso y fecha de baja (se completa sola al pasar a inactivo).
- **Permiso**: sigue en el usuario; el organigrama no da accesos.

## Organigrama

- Sin puestos, ofrece el **organigrama sugerido** (Dirección → Administración
  y Recepción → Peluquería, Bandimóviles y PetShop) con cada integrante activo
  ubicado según su rol, o empezar de cero.
- Escritorio: árbol de cajas con color por área, personas y vacantes; el "+"
  de cada caja agrega un puesto debajo. Celular y pantallas angostas: lista
  con sangría, sin scroll lateral.
- Al tocar un puesto: nombre, descripción, área, de quién depende (sin poder
  elegirse a sí mismo ni a lo que tiene debajo) y quiénes lo ocupan, viendo en
  qué otros puestos está cada uno. No se borra si tiene puestos debajo.
- Resumen: puestos, vacantes, personas activas y activas sin puesto. Las
  personas dadas de baja salen de las cajas y siguen en Personal.

En Personal, cada tarjeta muestra sus puestos y la ficha suma DNI, ingreso,
baja y puestos.

La ONG arma el árbol con un error: si dos puestos quedan en ciclo por un dato
viejo, el segundo aparece dos veces (`armarArbol` en `staff/api/equipo.ts`).
Acá está corregido y cubierto por un test.

## Comprobaciones

- `npm test` (suite nueva `team`), ESLint de los archivos nuevos y build/PWA.
- Chromium a 1440px y 390px contra el **backend real** con PostgreSQL embebido
  y la migración: organigrama vacío, sugerido, puesto nuevo debajo con persona,
  opciones de jefe sin ciclos, borrado bloqueado con hijos y permitido en una
  hoja, puestos en las tarjetas, DNI e ingreso en la ficha. Sin errores de
  consola ni scroll horizontal.
