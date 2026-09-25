# Brief de diseño — Módulo "Mascotas" y "Ficha de mascota" (Bandidos)

## Contexto del producto

**Bandidos** es un sistema de gestión para peluquerías caninas (grooming) en Argentina. Lo usan la dueña/admin y el staff (groomers) desde la compu y el celular. Tiene agenda de turnos, clientes, PetShop, gastos, empleados, etc. La app es multi-negocio: cada peluquería ve solo sus datos.

Idioma de la interfaz: **español rioplatense** (voseo: "Registrá", "Hacé clic", "Archivala"). Moneda: pesos, formato `$12.500`. Fechas: `dd/mm/aaaa`.

El módulo **Mascotas** es el registro de perros atendidos. Cada mascota tiene una **Ficha** con sus datos y todo su historial de servicios (turnos de la agenda).

---

## Sistema visual actual (para mantener coherencia)

- Tipografía: **Poppins**.
- Fondo de la app `#f4f5fa`, tarjetas blancas `#ffffff`, fondo suave `#eef0f6`, bordes `#ececf3`.
- Texto fuerte `#14151c`, texto secundario `#6b7180`, texto tenue `#9aa0b4`.
- Marca: magenta `#d948ef`, rosa `#ff4fa8`, violeta `#8356ff`. Gradiente de marca `135deg, #ff4fa8 → #8356ff`.
- Estados: ok `#16a34a` / fondo `#e7f6ee` · alerta `#d97706` / `#fdf1e3` · error `#dc2626` / `#fdecec`.
- Píldoras: groomer azul `#2563eb` sobre `#e8eefc`; método de pago gris `#5b6170` sobre `#eef0f6`.
- Radio de tarjetas 16px, píldoras totalmente redondas, sombra suave.
- Sidebar oscuro `#0f1016` a la izquierda (fuera del alcance de este brief).
- **Color por mascota:** cada mascota tiene un color fijo derivado de su nombre, elegido de esta paleta: `#ff4fa8 #f97316 #22c55e #38bdf8 #a855f7 #eab308 #ef4444 #14b8a6 #6366f1 #ec4899`. Se usa en su avatar (círculo con la inicial cuando no hay foto) y como acento de sus tarjetas.

---

## Modelo de datos: qué es una mascota

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| Nombre | texto | **Sí** | Ej. "Rocco" |
| Raza | texto | No | Ej. "Caniche toy" |
| Dueño | texto | **Sí** | Nombre del dueño/a |
| Celular | texto | No | Se usa para WhatsApp |
| Dirección | texto | No | Para traslados a domicilio |
| Castrado | sí/no | — | Por defecto "No" |
| Comportamiento | texto libre | No | Ej. "Muerde", "Nervioso con el secador" |
| Edad | texto libre | No | Ej. "3 años". Se usa solo si no hay fecha de nacimiento |
| Fecha de nacimiento | fecha | No | Si existe, la edad se calcula sola y se muestra el cumpleaños |
| Observaciones | texto largo | No | |
| Foto | imagen | No | JPG/PNG/WEBP, máx 4 MB. Una sola foto |
| Tamaño | texto | No | Existe en la base pero hoy **no aparece en ninguna pantalla** (oportunidad) |
| Archivada | sí/no | — | Ver "Archivar vs. eliminar" |

Dato calculado que se muestra: **cantidad de servicios** (turnos) que tuvo la mascota.

### Qué es un "servicio" (turno del historial)

Cada turno de la agenda asociado a la mascota tiene: fecha, hora, duración (min), tipo de servicio (ej. "Baño y corte"), precio, seña pagada, saldo pendiente (precio − seña), groomer que la atendió, método de pago, estado (**Reservado** azul · **Finalizado** verde · **Cancelado** rojo) y notas.

---

## Pantalla 1 — Lista de mascotas (`/pets`)

**Objetivo:** encontrar rápido una mascota, ver quiénes son los clientes más fieles y dar de alta perros nuevos.

### Encabezado
- Título "Mascotas". Subtítulo: "Registro de perros y datos básicos." (o "Mascotas archivadas. Conservan su ficha y su historial." en la vista de archivadas).
- Acciones a la derecha:
  - **Buscador** ("Buscar por mascota, dueño o celular…"). Hoy busca solo por nombre y raza.
  - **Botón alternar** "Ver archivadas" ↔ "Ver activas".
  - **Botón principal** "+ Nueva mascota" (cambia a "Cancelar" cuando el formulario está abierto).

### Formulario de alta (se despliega debajo del encabezado)
- Título "Nueva mascota", ayuda: "Registrá los datos básicos para identificar a la mascota y su dueño."
- Carga de foto con avatar de inicial como vista previa.
- Campos en grilla: Nombre mascota*, Raza, Dueño*, Celular, Castrado (No/Sí), Comportamiento, Edad (placeholder "Ej: 3 años"), Fecha de nacimiento (opcional, "Si no la sabés, podés dejarlo vacío", no permite fechas futuras), Dirección (ancho completo), Observaciones (ancho completo, textarea).
- Botones: "Guardar mascota" (muestra "Guardando…") y "Cancelar".
- Si faltan nombre o dueño: aviso "Ingresá el nombre de la mascota y el dueño."

### Grilla de tarjetas
- Encabezado de sección: "Mascotas registradas" + "N registros · Mostrando 1–24 · Hacé clic para ver detalle."
- **Orden:** primero las que tienen más servicios (clientes fieles), después las más nuevas.
- 24 tarjetas por página, con paginación "← Anterior · 1 2 … 9 · Siguiente →".
- **Cada tarjeta** muestra:
  - Barra/acento con el color de la mascota.
  - Foto circular o círculo de color con la inicial + **nombre**.
  - Raza.
  - Ícono persona + nombre del dueño; ícono teléfono + celular.
  - Etiquetas (píldoras): "★ 12 servicios" (destacada, solo si tiene), "Castrado"/"Sin castrar" (verde si castrado), comportamiento, edad ("5 años").
  - Enlace "Ver ficha →" que lleva a la ficha completa.
  - Clic en el resto de la tarjeta → abre el **modal de detalle**.
- Estados: "Cargando...", vacío ("Sin mascotas cargadas. Usá el botón "+ Nueva mascota"."), error en rojo.

### Modal "Detalle de la mascota"
- **Modo lectura:** avatar/foto (clic en la foto → la ve grande en otro modal), nombre, raza, y filas: Dueño, Celular, Edad, Cumpleaños (si hay fecha), Castrado, Comportamiento, Dirección, Observaciones.
- Acciones:
  - **Archivar** (o **Restaurar** si ya está archivada), con confirmación.
  - **Eliminar** (rojo; **solo visible para administradores**), con confirmación.
  - **Ver ficha** → lleva a la Pantalla 2.
  - **Editar** (principal) → pasa a modo edición.
- **Modo edición:** los mismos campos del alta + cambiar foto. Botones "Cancelar" y "Guardar cambios".

---

## Pantalla 2 — Ficha de mascota (`/pets/:id`)

**Objetivo:** ver todo sobre un perro antes o durante la atención: quién es, cómo se comporta, cuánto facturó y qué se le hizo cada vez.

### Encabezado
- Título "Ficha de mascota". Subtítulo "Información general e historial de servicios." (si está archivada: "Mascota archivada · no aparece en las listas, pero conserva su historial.").
- Acciones: **Archivar/Restaurar** y **"← Volver"** a la lista.

### Bloque 1 — Perfil
- Barra superior con el color de la mascota.
- Izquierda: foto grande (con opción "Cambiar foto") o avatar de inicial; nombre grande; raza; etiquetas (Castrado/Sin castrar, comportamiento, edad).
- Derecha: filas con Dueño, Celular, Dirección, Notas (solo las que tienen dato).

### Bloque 2 — Indicadores (4 KPIs en fila)
1. **Ingresos acumulados** (destacado): suma del precio de todos sus servicios.
2. **Servicios totales.**
3. **Promedio por servicio.**
4. **Último servicio:** fecha + tipo de servicio debajo.

### Bloque 3 — Historial de servicios
- Título + "N servicios registrados · Del más reciente al más antiguo."
- Grilla de tarjetas, una por turno, con el acento del color de la mascota:
  - Tipo de servicio + píldora con la fecha.
  - Precio grande.
  - Píldora del groomer + método de pago.
- Vacío: "No hay servicios registrados para esta mascota."
- Clic en una tarjeta → **modal "Detalle del servicio"**:
  - Encabezado: fecha · hora · duración; "Rocco — Baño y corte"; dueño · raza · Groomer; píldora de estado (Reservado/Finalizado/Cancelado).
  - 3 métricas: Precio del servicio · Seña registrada · **Saldo pendiente** (en alerta si es > 0, en verde si está saldado).
  - Panel "Detalle operativo" (fecha, hora, duración, mascota, dueño, raza, groomer, método de pago) y panel "Notas" ("Sin notas para este turno." si está vacío).

---

## Reglas de negocio que el diseño tiene que respetar

1. **Archivar vs. eliminar.** Archivar saca a la mascota de listas y búsquedas pero **conserva ficha e historial**; se puede restaurar. Eliminar es definitivo, solo para admins, y el sistema lo bloquea si la mascota tiene servicios ("No se puede eliminar: la mascota tiene servicios registrados. Archivala…"). El diseño debería guiar hacia **archivar** como acción normal y dejar eliminar como algo secundario/peligroso.
2. **Edad:** si hay fecha de nacimiento se muestra la edad calculada ("5 años") y el cumpleaños; si no, el texto libre de "Edad".
3. **Las mascotas también se crean desde la Agenda:** al reservar un turno para un cliente nuevo se crea la mascota con pocos datos (nombre, raza, dueño, celular). Por eso hay muchas fichas incompletas, y el diseño tiene que verse bien con campos vacíos (y quizá invitar a completarlas).
4. **Roles:** admin/super admin pueden eliminar; el staff no ve ese botón.
5. **Foto:** una por mascota, se sube al instante al elegirla (en el alta, se sube después de guardar).

---

## Problemas actuales / oportunidades para el rediseño

- El buscador dice "mascota, dueño o celular" pero solo encuentra por nombre y raza.
- El número de servicios en la tarjeta de la lista puede diferir del de la ficha (la lista cuenta turnos futuros y cancelados; la ficha solo hasta hoy). Los ingresos acumulados suman también los cancelados. Conviene definir en el diseño qué cuenta como "servicio" y distinguir los próximos turnos de los ya hechos.
- El campo **Tamaño** existe y no se muestra en ninguna pantalla.
- Hay dos lugares para ver y editar datos (modal de la lista y ficha), con información parecida pero no igual. Se podría unificar.
- La ficha no tiene acceso directo a **WhatsApp** del dueño ni a **"Agendar nuevo turno"**, ambos muy útiles en la operación diaria.
- Tiene que funcionar bien en **celular** (el staff la consulta en el local).

## Qué pedirle a Claude Design

Rediseñar las dos pantallas (Lista de mascotas + modal de detalle, y Ficha de mascota + modal de detalle del servicio) en desktop y mobile, respetando el sistema visual, los campos y las reglas de arriba, e incluyendo los estados de carga, vacío, error y mascota archivada.
