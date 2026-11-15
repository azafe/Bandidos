# Plan de inversión: nueva sucursal de Bandidos

Documento de trabajo para armar la propuesta a un inversor. Lo vamos
completando. Los números de la sección 6 son **supuestos de ejemplo**: hay que
reemplazarlos por los reales que da `/nueva-sucursal` (diagnóstico del local) y
por los presupuestos del local nuevo.

Las cuentas están en `src/lib/inversion.js`, con tests en
`src/lib/inversion.test.js`. Usa la misma simulación mes a mes que
`/nueva-sucursal` (`simulateBranch`) y le agrega lo que esa pantalla deja
afuera: impuestos, valor del negocio al final, tasa y reparto con el inversor.

---

## 1. Qué tiene que poder responder el inversor

1. **¿Cuánto pongo y para qué?** Monto, en qué se gasta (obra, equipos,
   depósito, habilitación, insumos de arranque) y la plata para bancar los
   primeros meses.
2. **¿Cuánto me vuelve y cuándo?** Flujo mes a mes, TIR, múltiplo y payback.
3. **¿Contra qué lo comparo?** Su tasa exigida, o sea lo que ganaría con otra
   inversión de riesgo parecido.
4. **¿Qué pasa si sale mal?** Escenarios y quién pone la plata que falta.
5. **¿Por qué ustedes?** El local actual: margen, agenda llena, crecimiento e
   historia. Es la prueba de que el modelo funciona.

## 2. Estructura del documento para el inversor

| # | Sección | Contenido | De dónde sale |
|---|---------|-----------|---------------|
| 1 | Resumen ejecutivo | Qué es, cuánto se pide, qué se ofrece, TIR y payback esperados | Este plan |
| 2 | El negocio hoy | Servicios (peluquería, Bandimóviles, PetShop), clientes, equipo | App: Inicio, Equipo |
| 3 | Tracción | Ingresos, margen, ocupación de agenda y crecimiento de los últimos 12 meses | App: `/nueva-sucursal` › «¿Este local está listo?» |
| 4 | La sucursal nueva | Zona, local, capacidad (peluqueros × turnos × días), arranque | Relevamiento + simulador |
| 5 | Uso de fondos | Inversión por partes y capital de trabajo | Presupuestos |
| 6 | Proyección | P&L mensual a 36 y 60 meses, punto de equilibrio | `inversion.js` |
| 7 | Retorno | VAN, TIR, ROI, múltiplo, payback (proyecto e inversor) | `inversion.js` |
| 8 | Propuesta | Préstamo o participación: condiciones | Sección 5 de este plan |
| 9 | Riesgos | Escenarios −30% / +20% y mitigaciones | `inversion.js` + sección 7 |
| 10 | Gobierno | Reportes mensuales, acceso de lectura a la app, salida | A definir |

## 3. KPIs

### 3.1 Operativos (los mira el inversor todos los meses)

| KPI | Fórmula | Vara | Ya lo da la app |
|-----|---------|------|-----------------|
| Ticket promedio | Ingresos de servicios / servicios | — | Sí |
| Servicios por mes | Turnos finalizados | ≥ equilibrio | Sí |
| Ocupación de agenda | Servicios / (peluqueros × turnos tope × días) | ≥ 80% bien, ≥ 60% atención | Sí |
| Margen por servicio | Ticket × (1 − comisión) − insumos − IIBB | — | Sí (sin IIBB) |
| Punto de equilibrio | Fijos / margen por servicio | Servicios por día que hay que hacer | Sí |
| Margen neto | Ganancia / ingresos | ≥ 15% bien, ≥ 5% atención | Sí |
| Crecimiento | Ingresos del trimestre / trimestre anterior − 1 | ≥ +5% | Sí |
| Clientes nuevos y recurrentes | Clientes con primer turno / que vuelven en 60 días | A definir | Falta |
| Peso del alquiler | Alquiler / ingresos | ≤ 10–12% | Parcial (gastos fijos) |

### 3.2 Financieros del proyecto (la sucursal sola, sin financiación)

| KPI | Qué es | Cómo se lee |
|-----|--------|-------------|
| **Plata necesaria** | Inversión + pérdidas del arranque hasta que la sucursal deja de restar | Lo que hay que juntar |
| **Payback** | Mes en que la caja acumulada vuelve a cero | Menos de 24 meses es razonable para un local de servicios |
| **Payback descontado** | Igual, pero con cada mes descontado a la tasa | Siempre llega más tarde |
| **VAN** | Σ flujo_t / (1 + r)^t, con r = tasa de descuento mensual | > 0: rinde más que la tasa exigida |
| **TIR** | La tasa que hace VAN = 0 (anualizada) | Se compara con la tasa exigida |
| **ROI** | (Lo que vuelve − lo puesto) / lo puesto | Total del período |
| **ROI anual** | (Vuelve / puesto)^(12 / meses) − 1 | Para comparar con plazo fijo o bonos |
| **Múltiplo (MOIC)** | Lo que vuelve / lo puesto | 2x = duplica |

### 3.3 Del inversor y de la deuda

| KPI | Para qué |
|-----|----------|
| TIR, VAN, múltiplo y payback **del inversor** | Lo que le toca a él según la propuesta, no al proyecto |
| **Cobertura de la cuota (DSCR)** | Ganancia del mes / cuota. Los bancos piden ≥ 1,2–1,3 |
| **Meses sin cubrir** | Meses en que la ganancia no paga la cuota y pone el local actual |
| **Capital propio del dueño** | Plata que pone Bandidos además de la del inversor |

## 4. La tasa: dos cosas distintas

- **Tasa de descuento (tasa exigida):** lo que el inversor podría ganar en otra
  inversión con riesgo parecido. Sirve para el VAN. Para un local nuevo de
  servicios es razonable pedir bastante más que un bono o un plazo fijo, porque
  tiene más riesgo (en el ejemplo, 15% real para el proyecto y 20% para el
  inversor en participación).
- **Tasa de interés del préstamo:** la que se pacta si el inversor presta. Para
  el inversor es su TIR; para Bandidos es el costo de la plata.

**Moneda e inflación.** Todo el modelo va en **moneda constante**: pesos de hoy
o dólares. Las tasas tienen que ser **reales**, sin inflación. Si un inversor
habla de una tasa en pesos corrientes, se pasa a real con
`(1 + tasa nominal) / (1 + inflación esperada) − 1`. Recomiendo presentar la
propuesta en **dólares** (inversión y retorno). Le resulta más claro a un
inversor en Argentina y evita discutir inflación.

> Pendiente: completar la tabla de referencia con las tasas del momento en que
> se presente (plazo fijo UVA, caución, obligaciones negociables en USD, tasa de
> un crédito PyME). No las dejo cargadas porque cambian todos los meses.

## 5. Formas de ofrecerlo

| | **A. Préstamo** | **B. Participación en ganancias** | **C. Participación con recupero acelerado** |
|---|---|---|---|
| Qué recibe | Cuotas fijas a una tasa pactada | X% de la ganancia mensual de la sucursal | Y% hasta recuperar lo puesto, después X% |
| Riesgo del inversor | Bajo si hay garantía del local actual | Alto: depende de la sucursal | Medio |
| Upside del inversor | Ninguno | Total | Total, después de recuperar |
| Costo para Bandidos | La tasa, pague o no la sucursal | Le cede parte del negocio para siempre (o hasta recompra) | Igual que B, pero se ordena antes |
| Cuándo conviene | Si Bandidos confía en el esperado y puede bancar meses malos | Si el inversor quiere ser socio | **Es la más vendible a un inversor privado** |

Cláusulas a definir en B y C: horizonte (36 o 60 meses), **opción de
recompra** de Bandidos (por ejemplo, a un múltiplo de la ganancia anual),
reportes mensuales y qué pasa si la sucursal cierra.

En código: `investorPlan(inputs, plan, { tipo: "prestamo", monto, tasaAnual,
cuotas, gracia })` o `{ tipo: "participacion", monto, pct, pctHastaRecuperar,
tasaExigida }`, con `{ factor, horizon }` para escenarios y plazo.

## 6. Ejemplo (supuestos ilustrativos, no son datos reales)

**Supuestos:** inversión $30.000.000, fijos $4.000.000/mes, ticket $35.000,
comisión 40%, insumos $3.000 por servicio, 360 servicios/mes en régimen
(5 peluqueros × 3 turnos × 24 días, por ejemplo). Arranca al 40% y llega al 100%
en el mes 7. IIBB 4%, monotributo (sin Ganancias). Tasa de descuento del proyecto:
15% real anual. Valor final: cero, sin vender ni valuar el negocio.

**Proyecto:**

| | Si va peor (−30%) | Esperado | Si va mejor (+20%) |
|---|---|---|---|
| Ganancia mensual ya arrancada | $183.200 | $1.976.000 | $3.171.200 |
| Payback | No recupera en 36 meses | Mes 22 (descontado: 25) | Mes 15 |
| TIR anual real (36 m) | −62% | **47%** | 118% |
| VAN al 15% (36 m) | −$33,2 M | **+$15,6 M** | +$48,1 M |
| TIR / VAN a 60 meses | −35% / −$30,7 M | 69% / +$42,6 M | 134% / +$91,5 M |

Punto de equilibrio: **241 servicios/mes, unos 10 por día** (con IIBB). En el
escenario −30% la sucursal hace 252 y queda apenas arriba: el riesgo principal
es la demanda.

**A. Préstamo de $30 M al 14% real, 6 meses de gracia + 30 cuotas:**
cuota de $1.179.137. El inversor recibe $37,35 M (TIR 14%). En el esperado,
Bandidos pone $4,2 M propios para cubrir 4 meses en que la sucursal no llega a
la cuota, y su VAN sigue siendo +$43 M a 60 meses: el préstamo le conviene
porque cuesta 14% y el proyecto rinde 47%. **En el −30%, Bandidos tendría que
poner $39,5 M del local actual.** Por eso un préstamo solo es seguro con la
garantía del local que ya funciona.

**C. Participación: $30 M, 60% de la ganancia hasta recuperar y 30% después:**

| Horizonte | TIR inversor | Múltiplo | Payback | VAN al 20% |
|---|---|---|---|---|
| 36 meses | 8% | 1,13x | Mes 31 | −$4,6 M |
| 60 meses | **24%** | **1,61x** | Mes 31 | +$2,2 M |
| 60 meses + valor final (12 meses de ganancia) | 29% | 1,85x | Mes 31 | +$5,1 M |

Conclusión del ejemplo: a 36 meses la participación no le cierra a un inversor.
Hay que ofrecerla a **60 meses** o con una **recompra** al final. En el −30% el
inversor recupera solo ~20% de lo puesto: hay que decírselo.

## 7. Riesgos y cómo se cubren

| Riesgo | Cómo se mide | Mitigación |
|--------|--------------|------------|
| Demanda más baja | Escenario −30%, servicios vs equilibrio | Elegir zona con lista de espera del local actual; Bandimóviles para llevar clientes |
| Arranque más lento | `arranquePct`, `mesesRampa` | Capital de trabajo para 6 meses dentro del pedido |
| Falta de peluqueros | Capacidad vs demanda | Formar en el local actual antes de abrir |
| Alquiler y ajustes | Peso del alquiler | Contrato largo, ajuste conocido |
| Inflación y tipo de cambio | Modelo en moneda constante / USD | Precios actualizados por lista; propuesta en USD |
| Canibalización del local actual | Clientes que se mudan de sucursal | Distancia mínima; medir clientes nuevos vs trasladados |

## 8. Próximos pasos

1. ~~Cuentas del plan de inversión (`inversion.js`) con tests.~~ Hecho.
2. **Cargar los números reales:** diagnóstico del local en `/nueva-sucursal`,
   presupuestos de obra y equipos, alquiler del local candidato.
3. **Pestaña «Para el inversor»** en `/nueva-sucursal`: impuestos, tasa,
   horizonte, tipo de propuesta y los KPIs de la sección 3, con los tres
   escenarios.
4. **One-pager / PDF** para mandar al inversor con el resumen y la tabla de
   retorno.
5. **Reporte mensual al inversor** desde la app (KPIs operativos + lo que le
   corresponde cobrar).

## 9. Decisiones pendientes

- ¿Moneda de la propuesta: pesos constantes o dólares?
- ¿Préstamo, participación o recupero acelerado? ¿A qué plazo?
- ¿Monto a pedir: toda la inversión o una parte, con aporte propio?
- ¿Tasa exigida del inversor (o tasa del préstamo) que vamos a usar como vara?
- ¿Monotributo o responsable inscripto en la sucursal nueva? Cambia Ganancias e IVA.
- ¿Se incluye el PetShop en la sucursal nueva? Hoy el modelo es solo peluquería.
