# Inicio simple de Bandimóviles

La entrada del menú es **Bandimóviles**, en `/traslados`. Las rutas anteriores
de recorrido, rendiciones, resultados y configuración siguen disponibles y
comparten navegación. Los choferes conservan su acceso a Mis traslados.

La primera visita al inicio abre una guía de cuatro pasos:

1. Cargar un móvil con nombre y patente, o usar los móviles activos existentes.
2. Habilitar a alguien del equipo como chofer (sin cambiar su rol laboral),
   cargar una persona nueva, o usar los choferes activos existentes.
3. Abrir Agenda con un turno nuevo y Traslado activado.
4. Explicar el recorrido y el registro explícito del cobro.

Se puede pausar, retomar, retroceder y volver a abrir desde Guía paso a paso.
El avance se guarda por usuario y local en el navegador, con formato versionado;
no se sincroniza entre dispositivos. Completar la guía no certifica que se haya
guardado un turno o cobrado un viaje. Un problema de almacenamiento no impide
usar la guía durante la visita.

Los pasos de alta usan las APIs existentes y solo muestran formularios al
administrador. Para otros usuarios se explica quién realiza la preparación;
no se ofrecen escrituras de configuración. No se configuran costos o tarifas
automáticamente ni se exige completar zonas o condiciones de pago para agendar.

El inicio habitual destaca Agendar un traslado y el recorrido del día. Los
ajustes y las cuentas se agrupan aparte. Un recorrido vacío explica cómo crear
el primer viaje. La guía aclara que finalizar la peluquería no cobra el traslado.

En el formulario de traslado, fecha y zona quedan en un desplegable que informa
si hay una fecha diferente o una zona asignada. El botón de copia de búsqueda a
entrega copia solamente dirección, chofer y móvil. Conserva fecha, hora, zona,
estado y notas de cada tramo. El precio sigue siendo único por solicitud.

## Verificación

- Build de producción y las cinco suites de `npm test` aprobados.
- Navegador con API simulada: alta de móvil con error y reintento; habilitación
  de un socio conservando su rol; alta de chofer nuevo; apertura de Agenda sin
  mascotas; guardado del primer turno con dos tramos y precio pendiente;
  copia sin alterar fecha, hora o zona; pausa y reanudación después de recargar;
  reapertura de la guía sin duplicar registros; progreso independiente por
  usuario; error de carga con reintento; enlaces de mascota preexistentes;
  navegación de secciones; accesos de staff y chofer.
- Capturas a 390 y 1440 píxeles, sin desbordes ni errores JavaScript.
- ESLint de archivos nuevos y demás archivos modificados aprobado, salvo
  Agenda que conserva sus cuatro errores de variables/funciones sin usar,
  verificados también contra HEAD. El lint general conserva 24 errores previos.

Las comprobaciones de navegador no accedieron a producción. No hay cambios de
backend, migraciones ni despliegue incluidos.
