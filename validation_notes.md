# Notas de validación de seguridad

## 14 de agosto de 2026

La navegación anónima a `/manager/activities` y `/staff/activities` no expone contenido operativo ni genera errores de consola. Ambas guardas de autenticación redirigen correctamente al inicio de sesión. La inspección visual con credenciales de negocio reales no fue necesaria: los botones y formularios protegidos se ejercen mediante pruebas de interfaz autenticada simulada por cada rol.

La validación automatizada usa usuarios temporales aislados y verifica la creación de actividades, las tres variantes de evidencia (comentario, imagen y ambas), los cambios de estado y el bloqueo de operaciones cruzadas por ID sobre mesas, menú, pedidos, música, usuarios y actividades. Adicionalmente, dos pruebas de interfaz autenticada simulada ejercen los botones de asignación para Manager y de actualización con estado, comentario e imagen para Staff. La suite completa finaliza con 51 pruebas exitosas.

Para la comprobación de navegador se emplean únicamente cuentas locales temporales generadas por la suite de pruebas y asignadas al local de prueba. Sus datos de acceso no se incluyen en el proyecto ni en esta nota.

La sesión temporal de Manager se inició mediante el acceso local, sin reutilizar cuentas ni credenciales del usuario.

La vista autenticada de Manager muestra el estado vacío de actividades, el botón de asignación y el formulario real. El selector ofrece Staff del mismo local, incluido el usuario temporal preparado para la prueba.

En la prueba real se seleccionó el Staff temporal desde el selector del formulario de asignación.

El Manager creó satisfactoriamente la actividad de validación. La interfaz confirmó la asignación, actualizó el contador a una actividad y mostró el estado pendiente junto con el Staff asignado.

La actividad creada permaneció visible en el panel de seguimiento del Manager antes de cerrar la sesión temporal.

El procedimiento local de cierre de sesión respondió correctamente durante la prueba. Se refrescará la sesión antes de iniciar el recorrido temporal de Staff.

Tras refrescar la aplicación, la sesión de Manager quedó cerrada y se mostró nuevamente el formulario local de acceso para continuar con Staff.

La sesión temporal de Staff inició correctamente y cargó su panel operativo, confirmando el cambio real de rol para continuar con la actividad asignada.

La tarea creada por Manager apareció en la vista real de Staff con su título, descripción, estado pendiente y el botón de actualización disponible.

El formulario real de Staff abrió correctamente y expuso los tres estados operativos: pendiente, en proceso y realizada, además de los campos de comentario e imagen de evidencia.

El Staff seleccionó el estado realizada y registró el comentario de cierre en el formulario real de la actividad.

La imagen temporal de evidencia se cargó correctamente al almacenamiento y el formulario habilitó el guardado del reporte con comentario e imagen.

El guardado del reporte se confirmó en la interfaz real: la actividad pasó a realizada y quedó disponible como reporte. El control visible de cierre de sesión de Staff también fue activado durante la comprobación.

La salida de Staff redirigió correctamente al acceso y se inició el retorno controlado a la sesión temporal de Manager para confirmar la trazabilidad del reporte.

El formulario local de acceso quedó disponible y se preparó nuevamente la sesión temporal de Manager, sin usar información de cuentas reales.

Manager volvió a iniciar sesión y comprobó el ciclo completo: la actividad se muestra como realizada, con el comentario de Staff y el enlace de imagen de evidencia disponibles en el seguimiento del local.

El dashboard real de Manager se revisó tras corregir el agregado horario. El gráfico de ingresos por hora cargó su serie vacía sin error de consulta ni mensajes de consola.

El procedimiento de logout respondió correctamente y la activación directa del control de salida redirigió al acceso. El selector de clic del navegador no propagó el evento en dos intentos sobre el botón de la barra lateral, pese a que el handler y el procedimiento se verificaron funcionalmente; no se observó un fallo del código de la aplicación.

Una prueba de interfaz adicional ejerce directamente el botón visible Salir del layout y confirma que invoca el flujo de logout. Esto cubre tanto la estructura de la interfaz como el handler asociado.

La actividad, la evidencia asociada en la base de datos y la asignación temporal utilizadas para la validación real fueron eliminadas; las cuentas de prueba se devolvieron a sus roles y asignaciones iniciales.

## Exportación de auditoría

La prueba autenticada como Owner aplicó el filtro de compañía **Bar La Noche**, reduciendo el conjunto visible a 56 de 84 eventos. El botón CSV se activó desde el panel con ese filtro; la validación de utilidad y la prueba de interfaz confirman que descarga exclusivamente ese subconjunto. La validación del archivo Excel continúa en la siguiente comprobación.

Los botones CSV y Excel descargaron archivos reales desde el panel Owner. El CSV incluye la cabecera esperada y registros de `Bar La Noche` con `venueId` 30001. El libro `.xlsx` superó la comprobación de integridad ZIP, contiene las hojas **Resumen** y **Eventos** y las celdas de eventos contienen 57 referencias a `Bar La Noche` —una en cabecera de contexto y 56 correspondientes a los eventos filtrados— sin referencias a `SongTap · Global`.

La configuración real de Manager muestra la sección **Fuente de metadatos** para el local `Bar La Noche`. Por defecto indica modo Manual, conserva la cola operada por Staff y explica que toda conexión externa permanece pendiente de validación.

Al seleccionar **YouTube Data**, el formulario mantiene el modo musical Manual y presenta un aviso explícito: puede aportar metadatos por local, no reemplaza licencias de reproducción pública y SongTap conserva la operación manual hasta completar una conexión futura.

La prueba visual de selección confirma que el formulario carga la opción YouTube Data y conserva el modo Manual. La persistencia se valida además mediante el procedimiento protegido y se vuelve a comprobar después de activar el guardado desde la interfaz.

El flujo protegido persistió `musicProvider=youtube` y `musicConnectionStatus=pending` únicamente para el local de prueba, preservando `musicMode=manual`; una actualización con ID de otro local fue rechazada por la suite de seguridad. Después de comprobarlo, el local se restauró a `manual/not_configured`. La suite finaliza con 62 pruebas exitosas y TypeScript sin errores.

## Analítica interlocal Owner — 15 de agosto de 2026

La vista `/owner` se comprobó en navegador autenticado después de ajustar el agregado diario para el modo `ONLY_FULL_GROUP_BY` de TiDB. La consulta `finance.ownerVenueAnalytics` terminó correctamente: el panel mostró el selector de periodo, las métricas consolidadas, el estado vacío descriptivo de la tendencia cuando no existen pedidos entregados en el periodo y el ranking de los tres locales registrados sin errores de consulta.

La pantalla incorpora una alternativa accesible al gráfico: el contenedor tiene nombre accesible y una descripción que dirige al resumen diario tabular. La suite cubre el contrato Owner, el cambio de periodo y la alternativa accesible; la validación completa en este hito finaliza con 76 pruebas exitosas y TypeScript sin errores.
