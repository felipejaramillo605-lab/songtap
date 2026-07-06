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
