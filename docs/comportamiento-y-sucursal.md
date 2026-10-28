# Comportamiento de la mascota y cálculo de nueva sucursal

## Comportamiento con etiquetas

El formulario de mascota ofrece etiquetas rápidas agrupadas por nivel
(Precaución, Con cuidado, Tranquilidad) y una nota libre. Se guardan en el mismo
campo `behavior`, con las etiquetas primero y separadas por « · »
(«Muerde · Usar bozal · Se calma con premios»). No requiere migración: los
textos anteriores se leen enteros como nota y cualquier pantalla que muestre el
texto tal cual lo sigue entendiendo.

La ficha, la vista rápida y la tarjeta de la lista muestran las etiquetas con su
color. El aviso toma el tono de la etiqueta más delicada: rojo si hay alguna de
precaución, naranja si hay de cuidado o solo nota, verde si todo es tranquilizador.

## Nueva sucursal (`/nueva-sucursal`, solo admin)

1. **¿Este local está listo?** Promedio mensual de los últimos 3 meses cerrados,
   con las mismas métricas del Inicio. Evalúa margen (≥15% bien, ≥5% atención),
   ocupación de agenda con peluqueros y turnos por día (≥80% / ≥60%),
   crecimiento contra los 3 meses anteriores (≥+5% / ≥−5%) y meses de ganancia
   para juntar el capital necesario (≤12 / ≤24). Un dato faltante queda «Sin
   datos» y nunca cuenta como aprobado.
2. **La sucursal nueva.** Arranca con los números del local y se editan:
   inversión, fijos, ticket, comisión, insumos por servicio, servicios esperados,
   arranque gradual y capacidad. Se recuerda por navegador.
3. **Resultado.** Punto de equilibrio, ganancia mensual ya arrancada, plata
   necesaria (inversión + pérdidas del arranque), mes de recupero, caja
   acumulada a 36 meses y escenarios −30% / +20%. Avisa si la demanda supera la
   capacidad. No incluye impuestos, inflación, financiación ni PetShop.

## Comprobaciones

- `npm test` (nuevas suites `petBehavior` y `sucursal`), build/PWA y ESLint de
  los archivos nuevos y modificados. Los errores previos de ESLint en `sw.js`,
  `whatsapp.js` y otros archivos no se tocaron.
- Chromium a 390px y 1366px con API simulada: diagnóstico, simulador, gráfico,
  ficha, lista y edición de comportamiento (guardado verificado en el payload).
