# Roles y permisos

Adaptado del módulo Permisos de la ONG (`azafe/ONG`, panel staff › Permisos).
Necesita el backend con la migración `033_roles_permisos.sql`.

- **Usuarios › Permisos** (`/admin/permisos`, solo admin): qué secciones abre
  cada rol. En escritorio, matriz de secciones por rol, agrupadas (Negocio,
  Operación, Clientes, PetShop, Dinero, Configuración); en el celular, se elige
  el rol y se tildan sus secciones. Se guarda al tocar. Muestra cuántos
  usuarios tiene cada rol y permite volver un rol a sus permisos por defecto.
- **Roles**: Administrador (todo, siempre), Staff (arranca con lo que veía
  antes), Recepción, Peluquero/a y Administración. Se asignan en Usuarios.
- **Menú y pantallas**: el menú se arma con los permisos del rol y el
  interruptor del local (super admin). Cada pantalla tiene su puerta
  (`RequireModule`); sin el módulo vuelve al inicio, que lleva a la primera
  sección permitida. Un rol sin secciones ve un aviso en `/sin-acceso`.
- Usuarios, Permisos y las finanzas de Bandimóviles siguen siendo solo del
  administrador. La cuenta de chofer sigue limitada a su recorrido.
- Si los permisos no se pueden leer, el menú usa los del rol por defecto; el
  backend frena igual lo que no corresponda.

## Comprobaciones

- `npm test` (suite nueva `permissions`: menú de Staff igual al anterior,
  admin, chofer, interruptor del local, pantalla de llegada), ESLint de los
  archivos tocados y build/PWA. Los errores previos de ESLint de
  SuperAdminPage no se tocaron.
- Chromium contra el backend real con PostgreSQL embebido y la migración:
  Staff ve el mismo menú y no abre Gastos fijos; el admin le da Rendición de
  caja a Peluquero/a y le saca todo a Recepción, que cae en el aviso;
  Administración entra a Inicio y no abre Permisos; Usuarios ofrece los roles
  nuevos; matriz sin desborde a 1366px y lista por rol a 390px.
