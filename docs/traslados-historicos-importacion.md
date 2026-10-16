# Históricos hasta el 15/10/2026

El administrador puede revisar e incorporar el formato anterior desde el celular:

1. Abrí **Traslados del día** y buscá **Históricos hasta el 15/10/2026**.
2. Tocá **Revisar históricos hasta el 15/10**. Esta consulta no modifica nada.
3. Revisá cantidad, detalle e importes. En **Ver registros y SQL de la
   importación** están los cambios exactos y los parámetros de tu local.
4. Si están correctos, marcá la confirmación y tocá **Confirmar importación**.
   Si cambiaron los datos mientras tanto, volvé a revisar antes de confirmar.
5. Para verlos, elegí su fecha. Aparecen en **Historial importado**, separados de
   las paradas operativas. El detalle de Agenda también muestra su origen.

Solo abarca fechas hasta el **15/10/2026 inclusive**. Los del 16/10 en adelante
quedan intactos: el aviso de los 6 turnos de hoy continuará apareciendo porque
esa fecha está excluida. No se conoce el total de fechas anteriores hasta hacer
la revisión autenticada en la base real.

Se conservan importe y bonificación originales, incluso cero o clasificación
desconocida. No se generan cobros nuevos, ni se inventan chofer, móvil, horario
o estado operativo. Los totales anteriores de los informes se mantienen. Los
históricos se consultan sin acciones para convertirlos en viajes pendientes.

Las cuentas de chofer conservan su vista exclusiva; esta acción es de
administrador. Un error de red permite reintentar sin duplicar la importación.

## Despliegue

Aplicar primero `027_traslados_historicos.sql` del backend, después de 026,
luego desplegar backend y frontend. **027 es necesaria antes del backend**
porque los informes y la hoja de ruta consultan la tabla nueva.

La migración crea estructura. La importación de datos se realiza después,
únicamente al confirmar desde la pantalla de revisión. Este trabajo no la
ejecutó en producción.
