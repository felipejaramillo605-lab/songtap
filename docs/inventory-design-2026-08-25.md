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

## Estado de la ampliación y validación

La ampliación está disponible en **Manager → Inventario**. La pantalla permite registrar proveedores, confirmar compras con una o varias líneas, asociar factura o referencia, costos, lotes y caducidades. La recepción aumenta el saldo y crea sus movimientos dentro de la misma transacción. Los insumos perecederos se marcan al crearse y exigen una fecha de caducidad en las compras.

El Dashboard Manager muestra una tarjeta de abastecimiento con los insumos bajo mínimo y los lotes próximos a vencer o vencidos. Los lotes vencidos permanecen trazables, pero se excluyen del consumo automático; la merma debe registrarse como ajuste auditado. La revisión diaria `songtap-inventory-expiry-daily` quedó activa para las **13:00 UTC**, equivalentes a las **8:00 a. m. de Colombia**, y está vinculada al controlador autenticado de SongTap.

| Validación | Resultado |
|---|---|
| Compra y proveedor | La recepción suma stock, conserva referencia y crea movimientos/lote. |
| Caducidad | Insumo perecedero sin fecha se rechaza; lote próximo genera alerta idempotente. |
| Consumo FEFO | La entrega descuenta primero el lote vigente con vencimiento más cercano. |
| Permisos y aislamiento | Staff no puede crear proveedores y Manager de otro local no puede consultar ni registrar. |
| Suite final | **50 archivos y 196 pruebas aprobadas**, con TypeScript sin errores. |

## Ampliación: merma, costo promedio y órdenes de compra

La merma por vencimiento se registrará únicamente contra un lote cuyo vencimiento ya haya ocurrido y que conserve saldo. La operación reducirá en la misma transacción el saldo del lote, la existencia global y el valor de inventario; además, generará un movimiento negativo y un registro específico de merma con usuario, fecha, motivo y costo afectado. No se eliminarán lotes ni movimientos históricos.

El costo de cada insumo se expresará por **unidad base** y se actualizará con promedio ponderado únicamente al recibir compras: `(valor existente + valor recibido) / (saldo existente + cantidad recibida)`. Las salidas por pedidos y mermas conservarán el costo promedio vigente en su movimiento, sin recalcular la historia cuando cambie el precio de una compra posterior. El costo real de una receta será la suma de `cantidad base × costo promedio` de sus ingredientes; el margen se mostrará como precio de menú menos costo de receta y su porcentaje sobre el precio de venta.

Las órdenes de compra no aumentarán stock. Tendrán un proveedor, líneas previstas, cantidades y costos estimados, y estados `borrador`, `enviada`, `recibida parcialmente`, `recibida` o `cancelada`. La recepción de una orden creará una compra real y actualizará la cantidad recibida de sus líneas; el stock solo cambiará al confirmar esa recepción.

| Evento | Stock | Costo promedio | Estado de compra |
|---|---|---|---|
| Crear/enviar orden | Sin cambio | Sin cambio | Borrador o enviada |
| Recepción parcial | Aumenta solo lo recibido | Se pondera con costo real | Recibida parcialmente |
| Recepción final | Aumenta el remanente | Se pondera con costo real | Recibida |
| Merma por vencimiento | Disminuye el lote y el saldo | Conserva el costo histórico aplicado | Sin cambio |

## Estado de implementación: mermas, costos y órdenes

Manager puede registrar una **merma por vencimiento** desde Inventario. El sistema exige que el lote ya esté vencido, valida que la cantidad no exceda su saldo y descuenta automáticamente el lote y el inventario general dentro de la misma transacción. Cada merma conserva cantidad, costo promedio aplicado, valor afectado, operador, observación y movimiento de salida.

Cada compra con costo actualiza el **costo promedio ponderado por unidad base** del insumo. La pestaña Costos calcula el costo actual de cada receta, compara contra el precio del menú y muestra monto y porcentaje de margen. Los consumos automáticos guardan su costo aplicado como una instantánea para que los movimientos históricos no cambien al recibir compras futuras.

La pestaña Órdenes permite crear órdenes previas por proveedor y líneas, enviarlas, cancelarlas antes de recibirlas y registrar recepciones parciales o totales. Crear o enviar una orden no cambia stock; únicamente la recepción confirmada crea la compra y actualiza existencias y costos.

| Validación | Resultado |
|---|---|
| Costo promedio y margen | Dos compras con costos distintos producen promedio ponderado, costo de receta y margen esperado. |
| Merma | Solo se admite sobre lote vencido; descuenta stock y conserva valor afectado. |
| Orden previa | No altera inventario hasta recibir; la recepción parcial y final actualizan estado correctamente. |
| Seguridad | Staff no puede registrar merma; cada consulta y mutación permanece aislada por `venueId`. |
| Suite final | **50 archivos y 199 pruebas aprobadas**, con TypeScript sin errores. |

## Ampliación: exportaciones y conteos físicos cíclicos

La exportación Excel genera un libro por local con las hojas **Resumen**, **Costos**, **Márgenes** y **Mermas**. El resumen conserva fecha de generación, local, valor estimado de existencias, valor de mermas y fórmulas costeadas; las hojas de detalle incluyen filtros y columnas de costo promedio, receta, margen, cantidad afectada, observación y fecha. La descarga toma exclusivamente los datos que el Manager ya recibió bajo alcance por `venueId`.

Un conteo físico tendrá estados `borrador`, `en progreso`, `listo para conciliar`, `conciliado` y `cancelado`. Al iniciarlo, SongTap creará líneas para los insumos activos con un saldo de sistema como referencia. El Manager registra la cantidad física en unidad base o en una unidad compatible; la diferencia será visible antes de cualquier ajuste.

La conciliación automática será una transacción única y solo podrá aplicarse si el saldo actual aún coincide con el saldo capturado al comenzar el conteo. Si un pedido, compra o ajuste modificó el inventario mientras el conteo estaba abierto, SongTap rechazará la conciliación para impedir que se borren movimientos recientes. Al conciliar, cada diferencia genera un movimiento `adjustment`, actualiza existencias y conserva sesión, línea, usuario y marca temporal. Las diferencias negativas también reducirán cantidades de lotes para que sus saldos no superen el inventario global; las positivas quedarán como stock sin lote, listo para una posterior trazabilidad de recepción.

| Evento | Efecto sobre existencias | Trazabilidad |
|---|---|---|
| Iniciar conteo | No modifica stock | Captura saldo de referencia por insumo |
| Registrar cantidad física | No modifica stock | Calcula diferencia visible |
| Conciliar diferencia | Ajusta stock cuando no hay cambios concurrentes | Crea movimiento y conserva la línea conciliada |
| Exportar reporte | No modifica stock | Generación, local y periodo incluidos en Excel |

## Estado de implementación: reportes y conteos

Manager cuenta con dos nuevas pestañas en **Inventario**. **Reportes** descarga el archivo Excel detallado del local actual. **Conteos** permite iniciar un ciclo con nota opcional, guardar cada cantidad física usando unidades compatibles, enviar el conteo solo cuando todas las líneas estén completas, revisar la diferencia y confirmar la conciliación de manera explícita.

Las operaciones de inicio, captura por línea, envío y conciliación quedan en la bitácora de Auditoría bajo el módulo Inventario. El servidor valida el rol Owner/Manager y el `venueId` en cada procedimiento; Staff no puede alterar un conteo. Antes de aplicar ajustes se comprueba nuevamente el saldo de todas las líneas contra su fotografía inicial. Si hay alguna variación, el proceso devuelve `CONTEO_DESACTUALIZADO` y no crea movimientos.

| Validación | Resultado |
|---|---|
| Exportación Excel | El libro contiene Resumen, Costos, Márgenes y Mermas; las pruebas verifican sus datos y nombre de descarga. |
| Conciliación | Un conteo completo ajusta la diferencia y genera movimiento `adjustment`; un conteo incompleto no se puede enviar. |
| Concurrencia | Un movimiento posterior al inicio bloquea la conciliación sin modificar saldo. |
| Permisos y aislamiento | Staff no puede conciliar y cada lectura/escritura queda limitada al local autorizado. |
| Suite final | **51 archivos y 203 pruebas aprobadas**, con TypeScript sin errores. |
