# PetShop: stock y conteo

Adaptado del módulo de stock de la ONG (`azafe/ONG`, panel staff › Productos).
Pantalla `/petshop/stock`, con acceso desde el encabezado de PetShop. Necesita
el backend con la migración `030_petshop_stock_conteo.sql`.

- **Stock:** tarjetas que filtran (en negativo, sin stock, bajo mínimo, para
  recontar), buscador y una fila por producto con saldo, último conteo y
  acciones. Valor del stock al costo.
- **Ingreso / Baja:** cantidad, costo opcional en el ingreso y motivo
  obligatorio en la baja. Anticipa cómo queda el stock.
- **Contar:** de a un producto, a ciegas (el número del sistema aparece recién
  al escribir lo contado). Si no coincide, el motivo es obligatorio. Cada
  producto se guarda antes de avanzar, con reintentos e id estable para no
  duplicar; el progreso queda en el navegador para retomar si se corta. Se
  puede contar lo que hace falta, todo o una categoría, saltear, volver y
  contar después los salteados.
- **Historial:** movimientos por día con tipo, diferencia, saldo, nota y
  usuario; filtros por producto, tipo y período.
- **Revisión:** negativos, nunca contados, contados hace más de 30 días, bajo
  mínimo y diferencias de conteo de 30 días valuadas al costo, con acceso
  directo a contarlos.

Lo que no se trajo de la ONG: presentaciones/variantes, armadores, gramos,
cierre del día por dispensas y archivado automático; no aplican al PetShop.

También se corrigió el título del encabezado móvil de Stock y conteo (tomaba
"Mascotas" por prefijo) y de Nueva sucursal (mostraba "Bandidos").

## Comprobaciones

- `npm test` (suite nueva `petshopStock`), ESLint de los archivos nuevos y
  build/PWA. Los avisos previos de ESLint de PetShopPage no se tocaron.
- Chromium a 1366px y 390px contra el **backend real** con PostgreSQL embebido
  y la migración aplicada: ingreso, baja con y sin motivo, conteo completo con
  diferencia, salteado y coincidencias, resumen, revisión, historial y conteo
  retomado tras recargar en el celular. Sin errores de consola ni scroll
  horizontal.
