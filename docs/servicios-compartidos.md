# Finalizar un turno con hasta tres peluqueros

En el detalle del turno, elegí **Dar por finalizado** y marcá **Trabajaron varios peluqueros**. Seleccioná al segundo y, si corresponde, al **Tercer peluquero (opcional)**. Los participantes deben ser personas distintas de la misma sucursal. Sin marcar la opción, el cierre conserva un solo peluquero.

La comisión del principal se divide en partes iguales: la mitad para cada uno si son dos, o un tercio si son tres, aunque los otros tengan porcentajes distintos. Ejemplo: servicio de $30.000 con comisión del principal de 40% → paga total $12.000 → $4.000 para cada uno si son tres. El precio, la seña y el cobro al cliente no cambian.

Los participantes se guardan en el turno y en el servicio generado. La liquidación diaria, los filtros, Servicios y las fichas de los empleados incluyen a todos. Los agregados atribuyen medio servicio o un tercio a cada uno, junto con su proporción de la facturación, para conservar los totales. Los listados generales mantienen un solo turno.

## Puesta en producción

1. La migración `033_shared_groomer.sql` debe estar aplicada. Si ya se ejecutó el SQL compartido originalmente como migración 030, no repetirlo: crea las mismas columnas y restricciones.
2. Aplicar `Bandidos-backend/db/migrations/034_third_groomer.sql` antes de desplegar esta ampliación. Es repetible y conserva los históricos con uno o dos peluqueros.
3. Desplegar el backend actualizado y luego el frontend.
4. Verificar un cierre con tres participantes y su reparto en la liquidación diaria.

## Verificación

- Frontend: `npm test` y `npm run build`.
- Backend: `node --test tests/shared-groomer.test.js tests/traslados-api.test.js`.
- Pruebas del formulario en Chromium a 1366×900 y 390×844, con respuestas API simuladas.
