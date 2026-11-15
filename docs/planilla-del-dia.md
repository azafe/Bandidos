# Planilla del día (Agenda)

Desde esta versión, **Agenda** (`/agenda`) abre la Planilla del día: la hoja
del cuaderno de recepción pasada a la app, conectada a la agenda real. La
agenda anterior sigue disponible en **Agenda clásica** (`/agenda/clasica`),
con semana, mes, bloqueos, cierre del día, fotos y la edición completa de
traslados.

## Qué hace

- **Cambiar de día:** flechas ‹ ›, «Hoy», el calendario o las flechas del
  teclado. La fecha queda en la URL (`/agenda?date=2026-11-16`).
- **Renglones libres:** cada día trae las horas del cuaderno (9 ×3, 10 ×2,
  11 ×2, 12, 12:30, 15 ×2, 16 ×2, 17 ×2, 18 ×2 y 19). Un turno ocupa su lugar;
  uno cancelado o que no vino lo libera. «+ Agregar renglón» suma lugares.
- **Agendar:** escribir en un renglón libre muestra los bandidos con el dueño
  entre paréntesis (homónimos). Al elegir uno se completa servicio, traslado
  (dirección y precio, crea la solicitud de Bandimóviles con sus dos tramos) y
  seña (monto y medio). «+ es un bandido nuevo» usa `/v2/agenda/with-new-pet`.
- **Tocar un turno:** cuántas peluqueras (1 a 3) y quiénes, estado
  (Agendado, Terminado, No vino, Canceló) y, si terminó, precio, traslado y
  medios de pago combinados. Usa las mismas reglas y la misma API que el
  cierre de la agenda clásica (los pagos suman precio menos seña).
- **Peluqueras:** el chip abre si viene ese día, su horario (rápidos o
  desde/hasta, con «próximos días») y su color. El renglón se pinta con el
  color de cada peluquera que participó, dividido a lo largo.
- **Lugares libres** copiables para WhatsApp, **lista de espera** con aviso
  cuando se libera un lugar, y **notas del día** (se guardan en la base).
- Los enlaces de otras pantallas siguen funcionando: `?turno=ID` abre el
  turno y `?nuevoTurno=1&petId=ID[&traslado=1]` abre el alta con esa mascota.

## Qué se guarda solo en el dispositivo

La base todavía no tiene dónde guardar quién viene cada día, los horarios de
las peluqueras, sus colores, los renglones agregados ni la lista de espera.
Eso queda en el navegador (`localStorage`, clave `bandidos_planilla_local_v1`):
cada tablet o compu tiene lo suyo. Los turnos, cobros y notas sí van a la base.

## Volver a la agenda anterior

En `src/App.jsx`, intercambiar los elementos de las rutas:

```jsx
<Route path="/agenda" element={<AgendaPage />} />
<Route path="/agenda/clasica" element={<PlanillaPage />} />
```

No hay migraciones ni cambios en el backend: revertir es solo eso y desplegar.
