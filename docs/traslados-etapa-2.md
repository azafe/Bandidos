# Bandimóviles — Etapa 2

## Uso

**Traslados del día** muestra las búsquedas y entregas por fecha, chofer y móvil.
La configuración de vehículos, zonas y condiciones sigue en
**Bandimóviles · Configuración**.

1. Desde Agenda cargá tramos con dirección, fecha, chofer y móvil. Si falta un
   dato, aparece pendiente; no se inventan horario ni teléfono.
2. En Traslados del día elegí fecha y filtros. Las paradas se agrupan por chofer
   y móvil. Un administrador puede subir/bajar paradas; el orden se guarda y se
   conserva al recargar. Si otra persona cambió la ruta, se avisa el conflicto.
3. En Usuarios creá una cuenta de Staff y elegí **Acceso exclusivo de chofer**.
   El integrante debe estar activo y marcado como chofer en Equipo. También
   podés vincular una cuenta existente desde su detalle, en **Acceso del chofer**.
4. Al ingresar con esa cuenta se abre **Mis traslados**. Solo muestra sus tramos
   y el menú propio; cambiar la URL no abre otras pantallas. Los permisos también
   se controlan en el servidor. No compartas una cuenta entre choferes.
5. Cada tramo avanza con **Salir · En camino**, **Marcar retirado** y
   **Confirmar entrega**. Búsqueda confirma llegada al local; entrega confirma
   llegada al dueño. Finalizar grooming y registrar el cobro siguen siendo
   acciones separadas.
6. **Google Maps** abre la dirección. **Avisar por WhatsApp** prepara el mensaje
   de llegada para revisar y enviar; no se envía automáticamente. Sin celular
   válido se indica que falta el dato.

Desactivar un chofer bloquea su acceso sin convertirlo en una cuenta general.
Quitar explícitamente el vínculo desde Usuarios devuelve los permisos del rol;
la pantalla pide confirmación antes de hacerlo. Un usuario no puede cambiar
su propio vínculo. Cada chofer admite una cuenta vinculada.

Los avisos generales de Agenda no se envían a cuentas de chofer. Suscripciones
antiguas de usuarios generales se renuevan al abrir el panel actualizado.

Los turnos históricos sin solicitud propia se avisan al equipo general, sin
importarlos ni convertirlos en rutas automáticamente.

## Despliegue y pruebas

Primero aplicar `026_traslados_operacion.sql` del backend, después desplegar
backend y frontend. La migración también es necesaria para la revalidación de
sesiones; no desplegar backend antes de aplicarla. No se ejecutó en producción.

`npm test` cubre agrupación, orden, estados y enlaces además de las pruebas
anteriores; `npm run build` incluye PWA. Comparar lint con la base existente.
Prueba de navegador: crear cuenta individual desde Usuarios, ordenar ruta y
recargar, ingresar como chofer en celular, comprobar su lista y menú, avanzar
estados, comprobar enlaces y acceso bloqueado por URL/filtros manipulados.

No incluye resultados económicos, simulador, seguimiento en vivo ni importación.
