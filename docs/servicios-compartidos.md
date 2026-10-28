# Finalizar un turno con dos peluqueros

En el detalle del turno, elegí **Dar por finalizado** y marcá **Trabajaron dos peluqueros**. Seleccioná al principal y a un segundo peluquero distinto. Si no marcás la opción, el cierre sigue funcionando con una sola persona.

La comisión del principal se divide en partes iguales. Ejemplo: servicio de $20.000 con comisión del principal de 40% → paga total $8.000 → $4.000 para cada uno, incluso si el segundo tiene otro porcentaje configurado. El precio, la seña y el cobro al cliente no cambian.

Ambos participantes quedan guardados en el turno y en el servicio generado. La liquidación diaria, los filtros, Servicios y la ficha del empleado incluyen al segundo participante. Los agregados por peluquero atribuyen medio servicio y la mitad de la facturación a cada uno para conservar los totales; los listados generales mantienen un solo turno.

## Puesta en producción

1. Aplicar `Bandidos-backend/db/migrations/033_shared_groomer.sql` en la base de datos antes de desplegar el backend.
   Si ya se aplicó el SQL compartido originalmente como migración 030, no repetirlo: crea las mismas columnas y restricciones. El archivo se renumeró por una migración de stock existente en el remoto.
2. Desplegar el backend actualizado y luego el frontend. El frontend anterior sigue funcionando con el backend actualizado.
3. Verificar un cierre compartido y su reparto en la liquidación diaria.

La migración agrega un campo opcional, conserva los históricos sin cambios y bloquea participantes repetidos y segundos peluqueros de otra sucursal.

## Verificación

- Frontend: `npm test` y `npm run build`.
- Backend: `node --test tests/shared-groomer.test.js tests/traslados-api.test.js`.
- Flujo del formulario comprobado en Chromium a 1366×900 y 390×844, con respuestas API simuladas.
