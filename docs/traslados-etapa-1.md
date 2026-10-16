# Bandimóviles — Etapa 1

## Uso

En **Bandimóviles** (solo administrador), cargá vehículos y zonas. La propiedad
del auto y las tarifas sugeridas son opcionales; elegir una zona no cambia el
precio acordado. Guardá el modelo de pago al chofer y el costo de referencia
cuando estén definidos. Sin datos, el costo queda pendiente y no se interpreta
como cero. Los cambios conservan versiones para no recalcular traslados previos.

En **Equipo**, un integrante puede tener la marca **También realiza traslados
(chofer)** además de su rol laboral. Los socios no necesitan una cuenta de
usuario ni figurar como Groomer. Los choferes nuevos no se ofrecen como
peluqueros por defecto; se conservan las selecciones históricas y quienes
cumplen ambas funciones.

En **Agenda**, marcá Necesita traslado y elegí búsqueda, entrega o ambas. Cada
tramo puede tener chofer, móvil, zona, dirección y horario propios. Las
asignaciones y el horario pueden quedar pendientes. El precio es **único por
ida y vuelta**, no se repite por tramo. Un turno reservado puede dejar el
precio pendiente; al finalizar exige precio positivo o **Bonificado** explícito.

Desde el detalle, **Editar traslado** permite completar precio, tramos y notas.
**Registrar cobro** confirma un solo pago por el importe total pactado: elegí
fecha, quién cobró y medio de pago del traslado. Si cobró un chofer, indicá cuál.
Finalizar la peluquería no cobra automáticamente ni da por realizada la entrega.
Una vez cobrado, el precio se conserva; esta etapa no implementa reversión de
cobros ni cancelaciones de operaciones ya cobradas.

En **Rendición de Caja**, los cobros de traslados recibidos por el local aparecen
en la matriz por su fecha y medio de cobro. Los recibidos por choferes aparecen
en **Cobrado por choferes (no entra a caja)**. El medio de pago del grooming no
se reutiliza para el traslado. La tarjeta del home muestra cobros registrados
en el período, en lugar de sumar precios todavía pendientes de pago.

## Históricos y despliegue

Los turnos anteriores sin detalle mantienen la interpretación de Etapa 0. Editar
sus notas no crea solicitudes ni inventa chofer, móvil, bonificación o cobro.
No se ejecuta importación automática; la consulta y cantidad de filas deben
revisarse antes de autorizar cualquier traspaso. Una operación con detalle
reemplaza su resumen en los cálculos para no duplicar ingresos.

Antes de desplegar: aplicar migración **025** del backend (requiere 024),
después desplegar backend y finalmente frontend. No se ejecutó esa migración
en producción desde este trabajo. La hoja de ruta y la vista del chofer son
Etapa 2; el resultado de la unidad y el simulador son Etapa 3.

## Pruebas

- `npm test`: booking, validación/payload de traslados, separación entre precio y
  cobro en dashboard y selección de groomers sin confundir choferes.
- `npm run build`: aplicación y PWA.
- `npm run lint`: comparar con los 25 errores anteriores; no se ocultan ni
  corrigen errores ajenos a la etapa.

Prueba funcional en un entorno de prueba:

1. Creá vehículo, zona y configuración; agregá un socio con marca de chofer.
2. Agendá ida y vuelta por $8.000,50 con direcciones distintas en cada tramo.
   Verificá precio único, dos tramos y cobro pendiente.
3. Registrá el cobro a un chofer. Repetir el pedido no debe duplicar el cobro.
4. Agendá otro traslado por $9.000 y finalizá la peluquería: no debe haber cobro
   ni entrega automáticos. Registrá luego el cobro recibido por el local.
5. En Rendición, comprobá $9.000 del local en la fila de traslados y $8.000,50
   de choferes fuera de caja. Probá una fecha de cobro distinta al turno.
6. Desde un celular, creá un bonificado: precio cero y ningún cobro ficticio.
7. Editá notas de un turno histórico y verificá que no se cree detalle nuevo.

Estos flujos se comprobaron en Chromium/Playwright con API local y PostgreSQL
embebido descartable; las rutas ajenas a esta etapa se simularon como datos de
consulta. No se accedió a producción. Sigue fuera del alcance la posible
duplicación previa de ingresos de grooming entre agenda y services.
