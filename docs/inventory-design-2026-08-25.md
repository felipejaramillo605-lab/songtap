# Diseño del módulo de inventarios — SongTap

**Fecha:** 25 de agosto de 2026  
**Estado:** implementado y validado en la primera versión.

## Objetivo general

> **Automatizar el control de inventario de cada local de SongTap**, descontando de forma trazable y exacta los insumos consumidos por los pedidos entregados, sin mezclar existencias entre locales y con alertas accionables antes de que se agoten.

## Objetivos específicos

| Objetivo | Criterio verificable |
|---|---|
| Gestionar insumos por local | Cada insumo, saldo, mínimo, movimiento y alerta queda restringido por `venueId`. |
| Normalizar medidas | Las fórmulas se guardan en una unidad base: **unidad**, **mililitro** o **gramo**. |
| Admitir compras y consumo en unidades comerciales | Manager puede registrar unidades, cajas, litros, mililitros, onzas, kilogramos y gramos; una caja exige definir su equivalencia base. |
| Definir fórmulas de productos | Cada ítem de menú puede tener una receta de uno o más insumos, con cantidad y unidad visible. |
| Descontar al entregar | El primer cambio a `delivered` crea movimientos de salida idempotentes dentro de la misma transacción. |
| Evitar inconsistencias | El servidor bloquea una entrega que dejaría un insumo en negativo y devuelve el faltante; una entrega ya aplicada no se descuenta dos veces. |
| Alertar a tiempo | Al cruzar el mínimo se crea una alerta activa y se notifica al Manager del mismo local; se resuelve al reponer existencias. |
| Mantener trazabilidad | Cada ingreso, ajuste, salida por pedido y reversión conserva saldo resultante, autor, fecha y referencia. |

## Unidades y conversiones

| Dimensión | Unidad base | Unidades de captura | Conversión hacia unidad base |
|---|---|---|---|
| Conteo | `unidad` | unidad, caja | 1 unidad = 1; caja = cantidad de unidades configurada por el local. |
| Volumen | `ml` | mililitro, litro, onza líquida, caja | 1 L = 1.000 ml; 1 oz líquida = 29,5735 ml; caja = ml totales configurados. |
| Masa | `g` | gramo, kilogramo, onza de peso, caja | 1 kg = 1.000 g; 1 oz = 28,3495 g; caja = gramos totales configurados. |

> Una **caja no tiene conversión universal**. Para evitar descuentos erróneos, se registra su contenido real —por ejemplo, 24 latas × 355 ml = 8.520 ml— antes de permitir entradas o ajustes en cajas.

## Reglas de negocio

El sistema descontará inventario al pasar un pedido a **Entregado**, no al crearlo ni al prepararlo. Esto evita reservar o descontar productos de pedidos que se cancelen antes de venderse. Cada salida toma una instantánea de la receta vigente y la cantidad vendida, la agrupa por insumo y registra un movimiento negativo asociado al pedido.

Los ítems sin fórmula se podrán vender, pero se marcarán como **no controlados por inventario**; no generarán descuento hasta que el Manager configure su receta. Las fórmulas no podrán mezclar dimensiones incompatibles: un ingrediente volumétrico solo acepta volumen, uno de masa solo acepta masa y uno de conteo solo acepta unidades o cajas equivalentes.

Una salida no podrá dejar el saldo negativo. Si faltan insumos, Staff recibirá el detalle del faltante y deberá solicitar reposición o ajuste al Manager. La operación de entrega será idempotente por pedido e insumo, por lo que reintentos de red o doble clic no duplicarán el descuento. El estado **Entregado** se tratará como terminal para no deshacer ventas y consumos accidentalmente; cualquier corrección será un ajuste auditado por Manager.

## Alcance de la primera versión

| Incluido | Fuera de la primera versión |
|---|---|
| Insumos, saldos iniciales, entradas y ajustes manuales. | Compras a proveedores, órdenes de compra y cuentas por pagar. |
| Fórmulas por ítem de menú y consumo al entregar pedido. | Lotes, vencimientos, costos promedio y conteos cíclicos avanzados. |
| Alertas de bajo inventario, historial y aislamiento por local. | Pronósticos automáticos de demanda y sincronización con POS externos. |
| Unidades, litros, mililitros, onzas, gramos, kilogramos y cajas configurables. | Conversión automática entre productos distintos o sustituciones de receta. |

## Criterios de aceptación

La implementación se considerará lista cuando un Manager pueda registrar un insumo, cargar existencias y mínimo, asociarlo a una receta —por ejemplo, **1 unidad** de insumo X y **4 oz** de insumo Y— y el sistema descuente exactamente 1 unidad y 118,294 ml por cada pedido entregado. Las pruebas deben demostrar bloqueo por saldo insuficiente, ausencia de doble descuento, alerta al cruzar el mínimo, aislamiento entre locales y permisos restrictivos para Staff.

## Estado de implementación y validación

La primera versión quedó disponible en **Manager → Inventario**. Incluye creación de insumos, existencias iniciales, entradas, ajustes, fórmulas, historial de movimientos y alertas visibles. Las alertas internas se generan para los Managers del mismo local cuando el saldo iguala o cae por debajo del mínimo, y se resuelven al reponerlo.

La validación automatizada cubrió la conversión de litro, onza líquida y caja, el descuento de una fórmula de 4 oz por pedido, la idempotencia ante una segunda entrega, el bloqueo por saldo insuficiente y el aislamiento de un Manager de otro local. La suite completa finalizó con **50 archivos y 193 pruebas aprobadas**, además de TypeScript sin errores.

## Ampliación: compras, proveedores y caducidad

Las compras se registrarán como una **recepción confirmada**: una cabecera identifica proveedor, factura o referencia y fecha; cada línea identifica el insumo, cantidad, unidad de compra, costo opcional y fecha de caducidad si aplica. La recepción, los movimientos de entrada y la actualización del stock sucederán dentro de una misma transacción. Una compra fallida no podrá aumentar existencias parcialmente.

Los insumos podrán marcarse como perecederos y configurar cuántos días antes de la caducidad desean recibir alerta; el valor inicial será **7 días**. Cada línea perecedera recibida genera un lote con saldo restante y fecha de vencimiento. Al entregar un pedido, SongTap consumirá primero los lotes vigentes con vencimiento más cercano; si hay existencias históricas no asociadas a un lote, el saldo global seguirá siendo utilizable y quedará diferenciado de los lotes trazables.

| Evento | Efecto de stock | Aviso |
|---|---|---|
| Compra recibida | Suma la cantidad convertida a unidad base y crea el movimiento `restock`. | Avisa de inmediato si el lote ya está dentro de su ventana de vencimiento. |
| Pedido entregado | Resta recetas y consume lotes vigentes por orden de vencimiento. | Mantiene las alertas de bajo stock existentes. |
| Lote próximo a vencer | No modifica stock. | Panel Manager e inbox interna para los Managers del local. |
| Lote vencido con saldo | No se consume automáticamente ni se elimina. | Panel e inbox interna; el Manager debe registrar un ajuste auditado tras la merma física. |

La revisión automática se ejecutará todos los días a las **8:00 a. m. de Colombia**. El proceso será idempotente: cada lote recibe una notificación al entrar a estado “próximo a vencer” y otra, si corresponde, al pasar a “vencido”; no se repetirá el mismo aviso todos los días.
