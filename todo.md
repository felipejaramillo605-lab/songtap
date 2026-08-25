# SongTap by CS2 — TODO

## Base de Datos
- [x] Esquema multitenant: venues, users, roles, staff_members
- [x] Tablas de menú: menu_categories, menu_items
- [x] Tablas de mesas y QR: tables, qr_sessions
- [x] Tablas de pedidos: orders, order_items
- [x] Tablas de música: music_requests
- [x] Tablas financieras: financial_transactions
- [x] Migraciones SQL aplicadas

## Backend (tRPC Routers)
- [x] Router: auth (me, logout, roles)
- [x] Router: venues (CRUD, listAll para Owner)
- [x] Router: users (gestión de staff por Manager, gestión global por Owner)
- [x] Router: menu (categorías e ítems, upload de imágenes)
- [x] Router: tables (CRUD, generar QR, reiniciar mesa)
- [x] Router: qr (validar sesión QR, crear sesión de cliente)
- [x] Router: orders (crear, listar FIFO, actualizar estado)
- [x] Router: music (solicitar canción, cola, marcar reproducida)
- [x] Router: finance (resumen del día, historial, exportar)
- [x] Router: audit (log de acciones para Owner)

## Frontend — Layout y Navegación
- [x] Dark mode Spotify en index.css (colores, tipografía Inter)
- [x] App.tsx con rutas para Owner, Manager, Staff, Cliente QR
- [x] SongTapLayout con sidebar dark mode por rol
- [x] Página de login / landing

## Panel Owner
- [x] Listado y gestión de todos los locales
- [x] Gestión global de usuarios y roles
- [x] Log de auditoría del sistema
- [x] Métricas globales (ventas totales, pedidos, locales activos)
- [x] Configuración de seguridad

## Panel Manager
- [x] Dashboard financiero del local (ventas del día, ingresos por categoría)
- [x] Gestión de menú: categorías e ítems con imágenes y precios
- [x] Gestión de mesas y generación de QR
- [x] Administración del equipo (staff)
- [x] Configuración general del local
- [x] Exportación de reportes

## Panel Staff
- [x] Cola de pedidos FIFO en tiempo real
- [x] Actualización de estado: pendiente → en preparación → entregado
- [x] Control de mesas activas
- [x] Cola musical: ver y marcar canciones como reproducidas

## Portal de Cliente (QR)
- [x] Página de acceso por QR (ingresar nombre, sin login)
- [x] Visualización del menú digital por categorías
- [x] Creación de pedidos desde el menú
- [x] Envío de peticiones musicales
- [x] Historial de pedidos de la sesión

## Módulo QR
- [x] Generación de código QR por mesa
- [x] Visualización e impresión del QR desde el panel Manager

## Dashboard Financiero
- [x] Resumen de ventas del día
- [x] Ingresos desglosados por categoría
- [x] Gráficos con recharts
- [x] Exportación de reportes CSV

## Pruebas
- [x] 14 tests vitest pasando (auth, venues, users, menu, QR, finance, music)
- [x] Checkpoint final


## Gráficos Interactivos
- [x] Router tRPC: revenueByHour (ingresos por hora del día)
- [x] Router tRPC: revenueByCategory (ingresos por categoría)
- [x] Componente: RevenueByHourChart (BarChart con Recharts)
- [x] Componente: RevenueByCategoryChart (BarChart con Recharts)
- [x] Integración en ManagerDashboard con tabs interactivos
- [x] Pruebas visuales y checkpoint


## Mejora de Diseño Inspirada en Spotify
- [x] Actualizar estilos CSS: gradientes, sombras, espaciado refinado
- [x] Mejorar componentes de gráficos: colores gradientes, animaciones
- [x] Rediseñar ManagerDashboard: layout asimétrico, jerarquía visual
- [x] Pruebas visuales y checkpoint


## Testing y Validación
- [x] Crear datos de prueba: venue, manager, staff, pedidos, PQRs
- [x] Validar login con cuenta de prueba
- [x] Validar navegación por roles (Owner, Manager, Staff, Cliente)
- [x] Capturar screenshots de validación
- [x] Validar cambio de contraseña (OAuth de Manus)
- [x] Validar funcionalidades: menú, pedidos, música, finanzas
- [x] Generar reporte de validación


## Gestión de Mesas Mejorada
- [x] Router tRPC: tables.create (crear mesa con QR automático)
- [x] Router tRPC: tables.list (listar mesas del local)
- [x] Router tRPC: tables.update (actualizar mesa)
- [x] Router tRPC: tables.delete (eliminar mesa)
- [x] Componente: Formulario de creación de mesas
- [x] Componente: Tabla de mesas con acciones
- [x] Componente: Generador de QR visual
- [x] Componente: Descarga de códigos QR
- [x] Integración en ManagerTables


## Validación End-to-End
- [x] Verificar routers tRPC para órdenes (create, list, update status)
- [x] Capturar flujo: portal cliente → crear pedido
- [x] Capturar flujo: panel staff → ver pedido en cola FIFO
- [x] Capturar flujo: cambiar estado pedido
- [x] Capturar flujo: verificar impacto en dashboard financiero
- [x] Generar reporte de validación end-to-end


## Mejoras de Menú, Empleados e Imágenes
- [x] Actualizar esquema DB: agregar campos a users (phone, cedula, address, cvUrl, photoUrl)
- [x] Router tRPC: menuItems.update (editar ítems de menú)
- [x] Router tRPC: users.delete (eliminar empleado)
- [x] Router tRPC: users.update (actualizar perfil de usuario)
- [x] Componente: ImageUpload con drag-drop y carga de archivo
- [x] Mejorar ManagerMenu: edición de ítems, carga de imágenes
- [x] Renombrar "Usuarios" a "Equipo" en navegación
- [x] Modal de detalles de usuario: teléfono, cédula, dirección, CV
- [x] Pruebas visuales y checkpoint


## Validación de Permisos y Auditoría
- [x] Agregar tabla order_status_history a esquema DB
- [x] Implementar middleware de validación de permisos por rol y venueId
- [x] Agregar log de cambios de estado en router de órdenes
- [x] Crear componente para visualizar historial de cambios
- [x] Pruebas visuales y checkpoint


## Validación de Empresas para Managers
- [x] Tabla venue_requests con estado (pending, approved, rejected)
- [x] Router tRPC: venues.requestVenue (crear solicitud)
- [x] Router tRPC: venues.approveRequest (Owner aprueba)
- [x] Router tRPC: venues.rejectRequest (Owner rechaza)
- [x] Panel Owner: lista de solicitudes pendientes
- [x] Actualizar flujo de registro de Manager
- [x] Pruebas visuales

## Módulo de Lista de Reproducción (Completado)
- [x] Tabla song_queue con canción actual, historial
- [x] Tabla applause_votes con puntuación por mesa
- [x] Router tRPC: music.getCurrentSong
- [x] Router tRPC: music.getQueue
- [x] Router tRPC: music.submitApplause (1-5 estrellas)
- [x] Router tRPC: music.getAppauseScore (puntuación final)
- [x] Componente MusicQueue en portal cliente
- [x] Componente AppauseVoting (1-5 estrellas)
- [x] Panel Staff: control de reproducción
- [x] Pruebas visuales y checkpoint

## Módulo Musical — Implementado y Validado
- [x] Extraer componente MusicQueue reutilizable para el portal cliente
- [x] Extraer componente ApplauseVoting reutilizable con estrellas 1-5
- [x] Validar integración de cola y aplausos en el portal cliente
- [x] Validar controles manuales de reproducción en Staff
- [x] Añadir pruebas Vitest del flujo musical (18/18 pasando)
- [x] Ejecutar validación visual y guardar checkpoint del módulo musical

## Notas de alcance
- [x] Integración manual del reproductor por Staff implementada (Spotify API pendiente de expansión futura)
- [x] Flujo de registro Manager con solicitud durante el alta de cuenta y validación de reglas de negocio

## Pruebas
- [x] Verificar contrato de solicitud de canción y posición FIFO con Vitest
- [x] Verificar contrato de aplausos de 1 a 5 estrellas con Vitest
- [x] Verificar contrato de puntuación agregada de una canción con Vitest
- [x] Verificar flujo visual completo en portal cliente y Staff

## Validación end-to-end del módulo musical
- [x] Verificar en navegador el flujo real QR → solicitar canción → aparece en cola del portal y Staff
- [x] Verificar en navegador que Staff pueda reproducir/remover canciones y el portal refleje la canción actual
- [x] Revisar y documentar el flujo seguro basado en sesiones QR emitidas


## Editor inteligente de foto de perfil
- [x] Añadir detección automática de rostro y centrado inteligente al recortador de foto de perfil
- [x] Mantener ajuste manual, previsualización, confirmación y subida de la foto
- [x] Añadir validación estricta server-side en uploadRouter para tipos MIME permitidos y tamaños máximos
- [x] Mejorar accesibilidad de controles del recortador y soporte de navegación por teclado/touch
- [x] Ampliar la suite de pruebas unitarias para validar la carga y seguridad de archivos y verificar 18/18 tests pasando
- [x] Guardar checkpoint final consolidado

## Historial de notificaciones del Owner
- [x] Persistir alertas de solicitudes de Manager con estado de lectura por Owner
- [x] Crear procedimientos seguros para consultar, marcar una y marcar todas las alertas como leídas
- [x] Añadir historial de notificaciones y acciones de lectura al submódulo Owner
- [x] Validar accesibilidad, pruebas y checkpoint

## Búsqueda y filtros del historial de notificaciones
- [x] Añadir búsqueda por texto en título y contenido de alertas
- [x] Añadir filtros de fecha inicial y final con opción de limpiar resultados
- [x] Validar accesibilidad, pruebas funcionales y checkpoint

## Experiencia móvil y auditoría ampliada
- [x] Corregir navegación y layout de paneles en pantallas móviles
- [x] Adaptar la vista de perfil y formularios para un ancho móvil utilizable
- [x] Ampliar los logs con compañía, módulo, usuario ejecutor, fecha y hora
- [x] Rediseñar la vista de auditoría con las nuevas columnas y formato responsive
- [x] Validar el drawer y contenido de los paneles principales en móvil
- [x] Añadir prueba de contrato para auditoría enriquecida y guardar checkpoint

## Filtros del log de auditoría
- [x] Añadir filtros desplegables por compañía, módulo y usuario ejecutor
- [x] Mostrar contador, estado vacío y acción para limpiar filtros
- [x] Validar filtrado, responsive, pruebas y checkpoint
- [x] Exportar el log de auditoría filtrado a CSV y Excel desde el panel Owner
- [x] Verificar que los archivos exportados respeten los filtros y el aislamiento de datos
- [x] Validar en navegador autenticado que CSV y Excel se descargan desde el panel Owner
- [x] Inspeccionar los archivos descargados para confirmar sus filtros activos
- [x] Añadir prueba de interfaz de Owner Audit que ejerza las acciones de exportación
- [x] Restaurar el rol y local de la cuenta temporal utilizada para validar exportaciones Owner
- [x] Guardar checkpoint de la exportación de auditoría y el análisis de proveedores musicales

## Seguridad Manager/Staff y actividades operativas
- [x] Auditar rutas, procedimientos y botones críticos de Manager y Staff
- [x] Impedir escalamiento de Staff a Manager y reforzar alcance por empresa en cada procedimiento
- [x] Crear módulo de actividades con asignación por Manager, estados, comentarios e imágenes de evidencia
- [x] Integrar vistas de actividades para Manager y Staff con acciones completas
- [x] Añadir pruebas de autorización, aislamiento entre empresas y flujos de actividades
- [x] Validar recorridos, responsive y checkpoint
- [x] Validar automatizadamente los recorridos y botones críticos de Manager y Staff en las nuevas pantallas de actividades
- [x] Cubrir el flujo de actividades Manager→Staff con comentario, imagen y ambos tipos de evidencia
- [x] Ampliar pruebas de aislamiento por IDs entre empresas en mesas, menú, pedidos, música, usuarios y actividades
- [x] Vincular menú y música del portal público a la sesión QR que los autorizó
- [x] Validar guardas de acceso en navegador y botones de actividades mediante pruebas autenticadas simuladas de Manager y Staff
- [x] Ejecutar validación automatizada completa con usuarios temporales de Manager y Staff, sin requerir credenciales del usuario
- [x] Añadir pruebas de interfaz autenticada simulada para asignar actividades y actualizar estado, comentario e imagen
- [x] Validar en navegador con sesiones locales temporales de Manager y Staff la creación, actualización y evidencia de actividades
- [x] Corregir el error del gráfico de ingresos por hora observado en el dashboard Manager
- [x] Verificar y corregir el cierre de sesión local antes de alternar la validación entre Manager y Staff
- [x] Verificar técnicamente el flujo de cierre de sesión local y su redirección al acceso
- [x] Añadir prueba de interfaz para el botón Salir y validar su acción de logout
- [x] Limpiar la actividad y la asignación temporal usadas en la validación real por roles
- [x] Guardar checkpoint posterior a la validación real por roles y la corrección del dashboard
- [x] Guardar checkpoint posterior a la validación funcional y de seguridad

## Integraciones musicales

- [x] Confirmar modo manual como operación activa y documentar el aplazamiento de Spotify, YouTube y MusicBrainz por decisión del usuario
- [x] Definir el aislamiento de conexiones, playlists y tokens de Spotify por `venueId`
- [x] Crear y configurar una aplicación Spotify cuando el panel de desarrolladores habilite el alta — **aplazado: modo manual por decisión del usuario**
- [x] Implementar vínculo OAuth de Spotify por Manager y almacenamiento seguro de tokens renovables — **aplazado: modo manual por decisión del usuario**
- [x] Evaluar alternativas oficiales: YouTube Data para metadatos por local y SoundCloud OAuth como opción futura; no sustituir licencias de reproducción comercial
- [x] Preparar configuración de proveedor musical y estado de conexión aislados por `venueId`, sin almacenar credenciales externas todavía
- [x] Corregir y validar la persistencia de la preferencia de proveedor desde Configuración Manager
- [x] Restaurar la preferencia temporal de proveedor del local de prueba al modo manual
- [x] Implementar búsqueda y normalización automática de metadatos con respaldo manual — **aplazado para fuentes externas; normalización local manual disponible**
- [x] Implementar normalización local de título y artista sin dependencia externa ni transmisión de datos
- [x] Implementar búsqueda gratuita de metadatos MusicBrainz con límite de uso seguro y respaldo manual — **aplazado: uso comercial requiere acuerdo y el usuario eligió modo manual**
- [x] Añadir la acción de sugerir metadatos a la cola musical del Staff
- [x] Cubrir con pruebas la normalización y el aislamiento del enriquecimiento musical por local
- [x] Cubrir en interfaz el botón Staff de normalización local de metadatos
- [x] Actualizar las interfaces de Manager y Staff con el estado del proveedor y el respaldo manual por local
- [x] Añadir pruebas de aislamiento multiempresa y documentar la configuración de los proveedores musicales
- [x] Guardar checkpoint de la preparación de proveedores musicales por local
- [x] Guardar checkpoint de las integraciones musicales — **checkpoint 1221d713: modo manual y normalización local**

## YouTube Data API por local

- [x] Crear el proyecto técnico de Google, habilitar YouTube Data API y registrar la URI de callback cuando no requiera depósito o costo inicial — **aplazado: modo manual por decisión del usuario**
- [x] Crear almacenamiento seguro de tokens YouTube por `venueId`, sin compartir conexiones entre locales — **aplazado: modo manual por decisión del usuario**
- [x] Implementar búsqueda y normalización de metadatos de YouTube con caché y límite de cuota por local — **aplazado: modo manual por decisión del usuario**
- [x] Integrar conexión y búsqueda de YouTube en la configuración del Manager y la cola musical — **aplazado: modo manual por decisión del usuario**
- [x] Verificar aislamiento multiempresa, renovación segura, pruebas y checkpoint — **aplazado: modo manual por decisión del usuario**

## Evaluación de costo de proveedores musicales

- [x] Comparar planes gratuitos oficiales para metadatos musicales por local
- [x] Verificar límites de uso y cumplimiento de reproducción comercial de cada alternativa
- [x] Seleccionar el proveedor gratuito inicial y actualizar el roadmap técnico — **se mantiene Manual; conectores externos aplazados por decisión del usuario**

## Pendientes internos priorizados

- [x] Definir caída SLA significativa como disminución de 10 o más puntos porcentuales frente al periodo anterior
- [x] Resaltar el riesgo SLA global y por sucursal con indicadores visuales y texto accesible
- [x] Incluir el estado de riesgo SLA en CSV y Excel de desempeño PQRS
- [x] Cubrir umbral, ausencia de caída, accesibilidad y exportación del indicador SLA
- [x] Calcular automáticamente el periodo anterior equivalente para el rango PQRS seleccionado
- [x] Obtener y comparar cumplimiento SLA actual versus periodo anterior por sucursal
- [x] Mostrar variación SLA accesible y utilizarla en CSV y Excel de desempeño PQRS
- [x] Cubrir periodos personalizados, filtros combinados y variación SLA con pruebas
- [x] Corregir y validar la estabilidad de hooks del dashboard Owner al cargar la comparación SLA
- [x] Definir y persistir objetivos SLA de respuesta por tipo de PQRS y sucursal
- [x] Mostrar cumplimiento y vencimiento SLA en el comparativo PQRS del Owner
- [x] Incorporar los indicadores SLA a CSV y Excel de desempeño PQRS
- [x] Cubrir configuración, cálculo, aislamiento por sucursal y exportación SLA con pruebas
- [x] Sincronizar la configuración SLA visible después de guardar un objetivo
- [x] Sincronizar el formulario SLA con los objetivos recargados sin sobrescribir una edición local en curso
- [x] Confirmar con prueba de interfaz que el valor SLA visible refleja el objetivo persistido tras guardar
- [x] Añadir selector de rango de fechas personalizado accesible al análisis PQRS
- [x] Validar fechas inicio y fin, combinarlas con sucursal, tipo y estado, y aplicarlas a agregados
- [x] Reflejar el rango personalizado en las exportaciones CSV y Excel de PQRS
- [x] Cubrir rango personalizado, validaciones y filtros combinados con pruebas
- [x] Incluir explícitamente periodo desde y hasta en el CSV de desempeño PQRS
- [x] Verificar en pruebas que CSV y Excel reflejen el rango personalizado activo
- [x] Añadir filtros accesibles de tipo y estado de PQRS al comparativo Owner
- [x] Aplicar tipo y estado como condiciones seguras en agregados, métricas y tabla PQRS
- [x] Incluir los filtros activos de tipo y estado en CSV y Excel de desempeño PQRS
- [x] Cubrir combinaciones de filtros, exportación y permisos con pruebas
- [x] Añadir selector múltiple accesible de sucursales al comparativo PQRS Owner
- [x] Recalcular métricas y limitar tabla y exportaciones PQRS a las sucursales elegidas
- [x] Cubrir la selección de sucursales y el contenido exportado con pruebas de interfaz y archivos
- [x] Definir filas y resumen para exportación CSV y Excel del desempeño PQRS por local
- [x] Añadir botones accesibles para descargar el comparativo PQRS filtrado en CSV y Excel
- [x] Cubrir los archivos, el periodo activo y las acciones de exportación PQRS con pruebas
- [x] Definir métricas PQRS por local: volumen, abiertas, resueltas, tasa de resolución y tiempo medio de respuesta
- [x] Añadir agregados PQRS seguros y exclusivos para Owner con filtro de periodo
- [x] Integrar panel comparativo PQRS por local con tabla y visualización accesible
- [x] Cubrir contratos, permisos y flujo visual de métricas PQRS por local
- [x] Validar los agregados PQRS con persistencia real y limpieza de datos temporales
- [x] Mejorar la cola de pedidos Staff con actualización periódica visible y estado de última sincronización
- [x] Añadir retroalimentación accesible de cambios de pedido nuevos o de estado en Staff
- [x] Cubrir la actualización de la cola Staff con pruebas de interfaz
- [x] Corregir y verificar la ruta accesible de la cola de pedidos Staff
- [x] Añadir analítica Owner interlocal con métricas comparativas y ranking de locales
- [x] Incluir filtros de periodo y gráficos accesibles para los ingresos interlocales
- [x] Cubrir los contratos y la interfaz de analítica interlocal Owner con pruebas
- [x] Añadir una alternativa accesible al gráfico interlocal Owner y cubrirla con prueba de interfaz
- [x] Documentar la validación visual de finance.ownerVenueAnalytics tras la corrección TiDB
- [x] Implementar módulo PQRS por sesión QR: creación segura, clasificación y seguimiento por local
- [x] Añadir bandeja Manager/Staff para gestionar estados y respuestas de PQRS con aislamiento por empresa
- [x] Cubrir con pruebas los permisos, la sesión QR y el flujo de PQRS
- [x] Añadir pruebas de interfaz para ClientPqrs y ManagerPqrs que cubran envío, listado, cambio de estado y respuesta visible
- [x] Añadir una prueba integrada del flujo PQRS con sesión QR válida y aislamiento por empresa de extremo a extremo
- [x] Añadir una prueba integrada PQRS sin mocks de persistencia que compruebe sesión QR, aislamiento y respuesta en el mismo flujo
- [x] Implementar actualización automática gratuita de notificaciones mientras el panel Owner está abierto
- [x] Mostrar estado de actualización, refresco manual y nueva alerta en el historial Owner
- [x] Cubrir la actualización automática de notificaciones con una prueba de interfaz
- [x] Añadir una prueba de interfaz para actualización automática, estado visual y alerta de nuevas notificaciones Owner
- [x] Manejar fallos de recarga manual del historial Owner sin confirmar una actualización inexistente
- [x] Mostrar un estado visible de error si la recarga del historial Owner falla
- [x] Validar y guardar checkpoint del siguiente pendiente interno implementado — **checkpoint 1221d713: normalización local sin proveedores externos**
- [x] Permitir seleccionar manualmente un período de referencia para comparar el cumplimiento SLA
- [x] Validar el rango de referencia y conservar los filtros de sucursal, tipo y estado al comparar SLA
- [x] Mostrar de forma accesible el período SLA de referencia manual y restaurar el período automático bajo demanda
- [x] Cubrir selección manual, validaciones y cálculo de comparación SLA con pruebas
- [x] Auditar usuarios, organizaciones y referencias para limpiar cuentas temporales sin romper datos relacionados
- [x] Conservar la cuenta Owner existente fuera de las cinco cuentas operativas de prueba
- [x] Conservar únicamente dos organizaciones de prueba y cinco cuentas operativas de Manager y Staff
- [x] Configurar una organización con un Manager y dos Staff, y otra con un Manager y un Staff
- [x] Validar contraseñas, roles, aislamiento por organización y accesos de las cuentas finales
- [x] Documentar credenciales de prueba compartibles para los beta testers
- [x] Evitar que las pruebas de registro dejen cuentas y solicitudes temporales persistentes en la base de datos
- [x] Crear un procedimiento exclusivo de Owner para restablecer contraseñas de cuentas beta
- [x] Impedir el restablecimiento desde este flujo de la cuenta Owner o de cuentas no beta
- [x] Añadir confirmación, estado de éxito y visualización temporal de la nueva clave en el panel Owner
- [x] Cubrir permisos, restricciones y actualización efectiva de contraseña con pruebas
- [x] Añadir un control de regreso contextual y accesible en las pantallas internas de SongTap
- [x] Mantener el menú lateral o drawer móvil como vía de navegación visible y fácilmente recuperable
- [x] Cubrir navegación de regreso, ruta de respaldo y comportamiento responsivo con pruebas
- [x] Añadir migas de pan accesibles y contextuales a las pantallas internas por rol
- [x] Mantener las migas de pan compactas y legibles junto al control Regresar en móvil y escritorio
- [x] Cubrir etiquetas, rutas principales y adaptación visual de las migas de pan con pruebas
- [x] Persistir los módulos favoritos de cada usuario sin exponer ni mezclar preferencias entre cuentas
- [x] Permitir fijar o quitar módulos disponibles según el rol desde la navegación del panel
- [x] Mostrar accesos directos favoritos en el panel principal de Owner, Manager y Staff
- [x] Cubrir aislamiento, cambios de favoritos, persistencia y accesibilidad con pruebas
- [x] Marcar las contraseñas temporales generadas para cuentas beta después de un restablecimiento
- [x] Restringir el acceso a los módulos hasta que la cuenta beta defina una nueva contraseña personal
- [x] Crear una pantalla accesible de cambio obligatorio con validación de seguridad de clave
- [x] Cubrir el bloqueo, la actualización de contraseña y la recuperación de acceso con pruebas
- [x] Implementar una revocación de sesiones activa y auditable exclusiva para cuentas beta
- [x] Impedir que un Owner revoque sesiones de cuentas no beta o de su propia cuenta desde este flujo
- [x] Añadir confirmación y estado visible de la revocación de sesión en el panel Owner
- [x] Cubrir permisos, alcance beta e invalidación efectiva de acceso con pruebas
- [x] Auditar y corregir el inicio de sesión local de las cuentas beta para evitar verificación por correo inexistente
- [x] Garantizar que las credenciales beta válidas creen una sesión local sin redirección a autenticación externa
- [x] Validar acceso de Manager y Staff beta con sus credenciales y redirección por rol
- [x] Mostrar un aviso accesible en Login que indique a cuentas beta usar Correo y Contraseña
- [x] Cubrir el contenido del aviso beta y su visualización en la pantalla de acceso
- [x] Reproducir y corregir el botón público de inicio de sesión que no navega al formulario local
- [x] Auditar rutas, eventos de clic, sesión local, cambio obligatorio y redirecciones por rol
- [x] Añadir cobertura de interacción real para los accesos de inicio de sesión y validar desktop y móvil
- [x] Mostrar el rol de la sesión activa de forma legible en la pantalla de Login
- [x] Mostrar la organización asociada a la sesión activa, con un texto claro para cuentas Owner o sin organización
- [x] Cubrir el resumen de sesión activa con rol y organización mediante pruebas de interfaz
- [x] Mostrar la fecha y hora local de la última sesión en el resumen de Login
- [x] Auditar los accesos público, OAuth, correo y contraseña, recuperación y cambio obligatorio de clave
- [x] Auditar las rutas, módulos y controles principales de Owner, Manager, Staff y portal QR
- [x] Corregir hallazgos funcionales verificables y ampliar las pruebas de regresión
- [x] Documentar el resultado de la auditoría funcional de extremo a extremo
- [x] Restringir visualmente las rutas internas al rol autenticado antes de renderizar cada panel
- [x] Redirigir accesos no autenticados o con rol incorrecto a un destino seguro sin exponer módulos internos
- [x] Corregir el enlace de política de privacidad de la página principal detectado sin destino válido
- [x] Crear una pantalla accesible de Acceso denegado con motivo y rol actual
- [x] Ofrecer enlaces seguros al panel autorizado, al Login o al cambio de contraseña según corresponda
- [x] Cubrir los escenarios sin sesión, rol incompatible y clave temporal pendiente con pruebas
- [x] Mostrar el módulo o ruta solicitada en la pantalla de Acceso denegado sin revelar contenido interno
- [x] Permitir a una cuenta autenticada solicitar acceso al Owner con control de duplicados
- [x] Registrar y exponer en Auditoría los intentos y las solicitudes de acceso denegado
- [x] Cubrir con pruebas los permisos, la deduplicación, el registro de auditoría y las salidas de la interfaz
- [x] Permitir al Owner aprobar o rechazar solicitudes de acceso desde Auditoría con trazabilidad de decisión
- [x] Añadir un filtro rápido de solicitudes de acceso pendientes en Auditoría
- [x] Notificar al solicitante las decisiones de acceso y permitirle consultarlas desde su sesión
- [x] Auditar y validar los módulos, acciones y recorridos críticos de Owner
- [x] Añadir búsqueda de solicitudes pendientes por nombre o correo del solicitante
- [x] Permitir comentarios internos del Owner al resolver solicitudes sin exponerlos al solicitante
- [x] Mostrar un badge persistente de decisiones de acceso no leídas en la navegación del usuario
- [x] Cubrir con pruebas la búsqueda, la privacidad de comentarios y los badges de notificación
- [x] Filtrar en Auditoría los comentarios internos por rango de fechas
- [x] Mostrar en el Perfil el historial de solicitudes de acceso aprobadas o rechazadas del usuario actual
- [x] Permitir archivar notificaciones leídas sin eliminar la trazabilidad de decisiones
- [x] Cubrir con pruebas filtros de fecha, aislamiento del historial y archivado de notificaciones
- [x] Diagnosticar y corregir el parpadeo causado por solicitudes o actualizaciones repetitivas
- [x] Evitar el incremento continuo de eventos del navegador y añadir una prueba de estabilidad
- [x] Mostrar skeletons durante la carga de rutas protegidas
- [x] Añadir estadísticas gráficas de solicitudes aprobadas, rechazadas y pendientes para Owner
- [x] Permitir exportar decisiones y auditoría en CSV y PDF desde Owner
- [x] Crear un modo de pruebas Owner para previsualizar Manager y Staff sin cambiar permisos reales
- [x] Cubrir con pruebas la seguridad de previsualización, la carga y las exportaciones
- [x] Corregir el error de profundidad máxima al abrir módulos Manager en modo de pruebas
- [x] Permitir capturar incidencias desde el modo de pruebas con contexto de rol, local y ruta
- [x] Permitir configurar reportes consolidados periódicos dentro de SongTap para Owner
- [x] Validar estabilidad, permisos, captura de incidencias y programación de reportes
- [x] Publicar SongTap y activar desde Owner el primer reporte interno programado
- [x] Activar el cron semanal del reporte interno y comprobar su próxima ejecución en producción
- [x] Permitir generar manualmente un reporte interno desde el panel Owner
- [x] Permitir descargar cada reporte generado en PDF y Excel
- [x] Incluir comparación automática de métricas contra la semana anterior
- [x] Validar generación manual, comparativos y descargas de reportes
- [x] Diseñar recorridos de onboarding específicos para Owner, Manager y Staff
- [x] Preparar recursos visuales y capturas de acciones clave para cada rol
- [x] Implementar un centro de onboarding accesible, reabrible y adaptado a móvil
- [x] Explicar errores frecuentes, autogestión y reporte de incidencias según el rol
- [x] Validar los recorridos de onboarding con pruebas y revisión visual
- [x] Añadir búsqueda de soluciones y errores frecuentes al centro de ayuda
- [x] Incorporar recursos animados breves a los pasos de onboarding
- [x] Mejorar la ventana de onboarding con controles de minimizar, ampliar y cerrar
- [x] Validar búsqueda, recursos interactivos y controles responsive del onboarding
- [x] Persistir valoraciones de utilidad por usuario para cada solución de ayuda
- [x] Permitir guardar y consultar soluciones favoritas desde el centro de ayuda
- [x] Mostrar controles accesibles de voto y favoritos en cada artículo de ayuda
- [x] Validar aislamiento, votos, favoritos y accesibilidad de la ayuda
- [x] Mostrar el onboarding automático una sola vez exclusivamente a usuarios nuevos
- [x] Corregir el layout responsive para que el contenido del onboarding no se corte
- [x] Reemplazar iconos ambiguos por controles claros de minimizar, ampliar y cerrar
- [x] Validar en escritorio y móvil el comportamiento de primera apertura y controles
- [x] Mostrar progreso visual y pasos restantes durante el onboarding
- [x] Permitir elegir entre recorrido breve y recorrido completo
- [x] Añadir desde Ayuda una acción para reiniciar el onboarding manualmente
- [x] Validar progreso, selección de modalidad, reinicio y accesibilidad responsive
- [x] Persistir la preferencia de no volver a mostrar automáticamente el onboarding
- [x] Añadir un checkbox claro para controlar la reapertura automática
- [x] Impedir que el onboarding aparezca al navegar entre módulos tras revisarlo o desactivarlo
- [x] Validar navegación entre módulos, preferencia y accesibilidad del control
- [x] Reproducir y corregir la reapertura del onboarding tras completar la guía
- [x] Verificar persistencia de finalización y preferencia al cambiar entre módulos
- [x] Añadir una prueba de regresión de navegación posterior a completar el onboarding
- [x] Registrar y mostrar métricas de onboarding completado y omitido por rol
- [x] Exponer analíticas de onboarding exclusivas para el Owner
- [x] Implementar un modal de Novedades independiente del onboarding
- [x] Validar métricas, novedades y accesibilidad responsive
- [x] Corregir el cierre y la persistencia del onboarding al completar la guía, incluido el modo de pruebas
- [x] Postergar la creación de la aplicación Spotify Web API y sus credenciales por decisión de mantener el modo manual
- [x] Documentar el diseño de aislamiento por venueId como referencia para una futura autorización comercial de Spotify
- [x] Evaluar el alta de una app Spotify propia por local y sus límites de Development Mode antes de venderla como servicio
- [x] Mostrar de forma persistente la canción en reproducción en el portal por mesa y panel Staff
- [x] Añadir asistencia por local para buscar enlaces legales de karaoke sin copiar letras ni descargar contenido protegido
- [x] Implementar enlaces contextuales de búsqueda de karaoke desde cada canción de la cola y canción actual
- [x] Permitir que Staff guarde y consulte el enlace de karaoke elegido para cada canción del local
- [x] Crear historial de canciones reproducidas aislado por local para consulta de Staff
- [x] Añadir configuración de proveedores de karaoke personalizados por local con validación de enlaces
- [x] Añadir etiquetas de estado para enlaces de karaoke y permitir que Staff marque si requieren revisión
- [x] Filtrar el historial musical por rango de fechas de forma segura por local
- [x] Registrar y mostrar el Staff que inició la reproducción de cada canción
- [x] Solicitar y guardar notas explicativas al marcar un enlace de karaoke como Requiere revisión
- [x] Crear métricas Owner de enlaces de karaoke funcionales, pendientes y en revisión por local
- [x] Permitir establecer y visualizar una fecha límite para la revisión de cada enlace de karaoke
- [x] Notificar al Manager del local cuando un enlace sea marcado como Requiere revisión
- [x] Exportar en CSV las métricas de salud de enlaces de karaoke por local desde Owner
- [x] Definir y ejecutar auditoría de seguridad y pentesting controlado sobre SongTap
- [x] Revisar autenticación, sesiones, RBAC, aislamiento por local, QR, entradas y dependencias
- [x] Corregir hallazgos de seguridad verificables y añadir pruebas de regresión
- [x] Documentar resultados, riesgos residuales y controles validados
- [x] Proteger la descarga de CV con autorización por rol y URLs firmadas temporales
- [x] Añadir regresiones de privacidad de CV, validación técnica y documentación
- [x] Crear un local de prueba aislado con tres cuentas de roles distintos
- [x] Crear y validar el Owner adicional creativestrategicsolutions2@gmail.com
- [x] Verificar asignaciones, roles y credenciales temporales de las cuentas de prueba
- [x] Definir objetivos, alcance y reglas de negocio del módulo de inventarios
- [x] Crear esquema multi-local de insumos, unidades base, recetas, movimientos y mínimos
- [x] Descontar inventario transaccionalmente al entregar pedidos y evitar duplicados o existencias negativas
- [x] Implementar alertas de bajo inventario y trazabilidad de ajustes
- [x] Crear interfaz Manager para insumos, conversiones, recetas, movimientos y alertas
- [x] Cubrir inventarios con pruebas de conversiones, recetas, pedidos, roles y aislamiento por local
- [x] Definir reglas de compras, proveedores, lotes perecederos y alertas de caducidad
- [x] Crear esquema multi-local de proveedores, compras, líneas y lotes de inventario
- [x] Registrar compras transaccionalmente y actualizar el stock de insumos
- [x] Generar alertas de insumos bajos y lotes próximos a vencer para Managers del local
- [x] Añadir panel visual de alertas al Dashboard Manager y gestión de compras/caducidades en Inventario
- [x] Validar compras, vencimientos, notificaciones, permisos y aislamiento por local
- [x] Programar la revisión diaria de lotes a las 8:00 a. m. de Colombia y verificar su ejecución
- [x] Definir reglas de merma por vencimiento, costo promedio ponderado y márgenes por receta
- [x] Crear esquema multi-local para costos unitarios, mermas y órdenes de compra
- [x] Registrar mermas por lote vencido y ajustar stock de forma transaccional y auditable
- [x] Calcular costos promedio y márgenes reales por receta y producto de menú
- [x] Implementar órdenes de compra con proveedores, líneas, estados y recepción parcial o total
- [x] Añadir paneles Manager para mermas, costos, márgenes y órdenes de compra
- [x] Validar cálculos, trazabilidad, permisos y aislamiento por local
- [x] Definir reglas de exportación Excel, conteo físico y conciliación automática
- [x] Crear esquema multi-local de sesiones de conteo, líneas y diferencias
- [x] Exportar reportes detallados de costos y mermas a Excel por local
- [x] Implementar conteos cíclicos y conciliación transaccional de diferencias de stock
- [x] Añadir panel Manager para ejecutar conteos, revisar diferencias y descargar reportes
- [x] Validar archivos Excel, conteos, conciliaciones, permisos y aislamiento por local
- [x] Definir umbral configurable y separación de funciones para aprobación dual de conciliaciones
- [x] Crear esquema multi-local de aprobaciones y plantillas de conteo por familia
- [x] Implementar aprobación dual auditable antes de aplicar ajustes de alto valor
- [x] Permitir crear y aplicar plantillas de conteo filtradas por familia de insumos
- [x] Mostrar frecuencia de conteos y desviación de stock en el Dashboard Manager
- [x] Validar umbrales, permisos, plantillas, indicadores y aislamiento por local
- [x] Permitir que cada local configure y actualice su propio umbral de aprobación dual
- [x] Definir alertas internas para Managers elegibles ante conteos pendientes de aprobación
- [x] Notificar por local la solicitud de aprobación y conservar su trazabilidad
- [x] Implementar selector de modo claro y oscuro con preferencia persistente
- [x] Revisar contraste, fondos y legibilidad en modo claro para vistas principales
- [x] Validar alertas, permisos, temas y compatibilidad responsive
