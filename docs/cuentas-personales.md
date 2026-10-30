# Cuenta personal del equipo

Cada empleado puede tener una cuenta Staff vinculada desde **Usuarios**.
Al entrar, accede a **Mi cuenta** y **Chat del equipo**. Los choferes también
tienen **Mis traslados**. Una cuenta personal solo puede consultar su propia
información; la API aplica la misma restricción.

**Mi cuenta** muestra por mes los trabajos finalizados, comisión por trabajo,
anticipos, pagos y saldo acumulado al cierre. Las comisiones y el dinero
efectivamente entregado se muestran por separado. Las tres participantes de
un trabajo comparten el porcentaje de la principal en partes iguales, con
reparto de los centavos sobrantes en orden. El porcentaje queda guardado al
finalizar para conservar las comisiones anteriores.

Administración entra por **Equipo → empleado → Liquidación, anticipos y pagos**.
Antes de la primera entrega debe definir la fecha de inicio y el saldo pendiente
anterior. Después registra anticipos y pagos y puede anular una entrega
indicando el motivo. Los registros anulados siguen visibles.

**Chat del equipo** permite privados y grupos, fotos, lectura, reacciones,
búsqueda, favoritos y silencio. Quien crea el grupo administra sus miembros.
La aplicación consulta periódicamente las novedades mientras está visible.

Fuentes reutilizadas: pantallas de pago y anticipos de
[AppTzReactChofer](https://github.com/azafe/AppTzReactChofer), reglas y formato
del chat de [ONG](https://github.com/azafe/ONG), y la identidad y agenda existentes
de Bandidos. El mapa técnico, las reglas contables y la activación están en
`Bandidos-backend/docs/cuentas-personales-y-chat.md`.

Requiere el backend actualizado y las migraciones **035** y **036** antes de
publicar este frontend.
