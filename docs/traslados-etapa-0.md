# Traslados — Etapa 0

La rendición muestra **Cobrado por choferes (no entra a caja)** separado de
los totales por medio de pago y del total general. Ese importe se consulta en
`GET /v2/daily-incomes/traslados-summary?date=YYYY-MM-DD`. Un fallo al cargarlo
muestra un error; no presenta cero ni un importe de la fecha anterior.

En Agenda, al finalizar un turno con traslado, cargá un importe positivo o
marcá **Bonificado**. La bonificación pone el monto en cero y lo deshabilita;
al desmarcarla, cargá nuevamente el monto. Alta, edición y finalización usan
los mismos controles. Un turno reservado puede dejar el importe para después.
El backend valida la misma regla, incluso si el pedido no viene de esta UI.

Los históricos con monto cero no se marcan como bonificados automáticamente.
Editar sus notas o datos del servicio conserva la clasificación anterior;
modificar los datos del traslado de un finalizado exige resolver el importe o
la bonificación. El detalle informa cuándo faltan ambos datos.

## Despliegue

Requiere la Etapa 0 de `azafe/Bandidos-backend`: primero su migración 024,
después el backend y finalmente este frontend. Las columnas anteriores y el
cálculo del dashboard se conservan.

## Verificación

- `npm test`: booking y validación/payload de traslados.
- `npm run build`: frontend y service worker PWA.
- `npm run lint`: comparar con los 25 errores ya presentes en main; incluye
  `expenses` sin usar en `TabSituacion.jsx`. No se suprimieron esos errores.

Comprobaciones de navegador realizadas con respuestas API simuladas, sin
acceder a producción:

1. Con servicios de $25.000, señas de $2.000 y traslados de $13.000, la caja
   muestra $27.000 y los $13.000 aparecen únicamente en el bloque informativo.
2. Cambiá de fecha simulando un error del resumen: se muestra el error y se
   retira el importe anterior; los totales de caja siguen disponibles.
3. Finalizá un traslado con monto cero sin bonificar: no se envía el cierre.
   Repetí con un monto positivo y verificá el importe guardado.
4. Finalizá con Bonificado: monto cero, campo deshabilitado y marca persistida.
5. Editá notas de un histórico: no se envían cambios de traslado ni se
   reclasifica. Cambiar a cero un traslado pago exige bonificación explícita.
6. Desde el ancho de un celular, creá un turno con traslado bonificado.

La categoría **Traslados** ya puede crearse desde Categorías de gastos con un
usuario administrador y usarse en gastos diarios y fijos. No se crea por
migración. Esta etapa no corrige la posible duplicación de ingresos por
servicios entre agenda y `services`, ni crea el módulo operativo de traslados.
