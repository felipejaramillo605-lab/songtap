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
- [ ] Actualizar flujo de registro de Manager
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
- [ ] Flujo completo de registro Manager con solicitud de venue queda pendiente

## Pruebas
- [x] Verificar contrato de solicitud de canción y posición FIFO con Vitest
- [x] Verificar contrato de aplausos de 1 a 5 estrellas con Vitest
- [x] Verificar contrato de puntuación agregada de una canción con Vitest
- [x] Verificar flujo visual completo en portal cliente y Staff

## Validación end-to-end del módulo musical
- [x] Verificar en navegador el flujo real QR → solicitar canción → aparece en cola del portal y Staff
- [x] Verificar en navegador que Staff pueda reproducir/remover canciones y el portal refleje la canción actual
- [x] Revisar y documentar el flujo seguro basado en sesiones QR emitidas
