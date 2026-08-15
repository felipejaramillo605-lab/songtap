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

- [x] Definir el aislamiento de conexiones, playlists y tokens de Spotify por `venueId`
- [ ] Crear y configurar una aplicación Spotify cuando el panel de desarrolladores habilite el alta
- [ ] Implementar vínculo OAuth de Spotify por Manager y almacenamiento seguro de tokens renovables
- [x] Evaluar alternativas oficiales: YouTube Data para metadatos por local y SoundCloud OAuth como opción futura; no sustituir licencias de reproducción comercial
- [x] Preparar configuración de proveedor musical y estado de conexión aislados por `venueId`, sin almacenar credenciales externas todavía
- [x] Corregir y validar la persistencia de la preferencia de proveedor desde Configuración Manager
- [x] Restaurar la preferencia temporal de proveedor del local de prueba al modo manual
- [ ] Implementar búsqueda y normalización automática de metadatos con respaldo manual
- [ ] Implementar búsqueda gratuita de metadatos MusicBrainz con límite de uso seguro y respaldo manual
- [ ] Añadir la acción de sugerir metadatos a la cola musical del Staff
- [ ] Cubrir con pruebas la normalización y el aislamiento del enriquecimiento musical por local
- [x] Actualizar las interfaces de Manager y Staff con el estado del proveedor y el respaldo manual por local
- [x] Añadir pruebas de aislamiento multiempresa y documentar la configuración de los proveedores musicales
- [x] Guardar checkpoint de la preparación de proveedores musicales por local
- [ ] Guardar checkpoint de las integraciones musicales

## YouTube Data API por local

- [ ] Crear el proyecto técnico de Google, habilitar YouTube Data API y registrar la URI de callback cuando no requiera depósito o costo inicial
- [ ] Crear almacenamiento seguro de tokens YouTube por `venueId`, sin compartir conexiones entre locales
- [ ] Implementar búsqueda y normalización de metadatos de YouTube con caché y límite de cuota por local
- [ ] Integrar conexión y búsqueda de YouTube en la configuración del Manager y la cola musical
- [ ] Verificar aislamiento multiempresa, renovación segura, pruebas y checkpoint

## Evaluación de costo de proveedores musicales

- [x] Comparar planes gratuitos oficiales para metadatos musicales por local
- [x] Verificar límites de uso y cumplimiento de reproducción comercial de cada alternativa
- [ ] Seleccionar el proveedor gratuito inicial y actualizar el roadmap técnico

## Pendientes internos priorizados

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
- [ ] Validar y guardar checkpoint del siguiente pendiente interno implementado
