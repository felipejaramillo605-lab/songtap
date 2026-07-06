-- ============================================================================
-- SongTap Test Data Seed Script
-- ============================================================================
-- Este script crea datos de prueba para validar todos los flujos de la aplicación
-- Incluye: venues, usuarios (manager, staff), mesas, menú, pedidos, música y PQRs

-- ============================================================================
-- 1. CREAR VENUE DE PRUEBA
-- ============================================================================
INSERT INTO venues (name, address, city, phone, email, capacity, status, createdAt, updatedAt)
VALUES (
  'Bar La Noche - Test',
  'Calle 50 #10-20, Medellín',
  'Medellín',
  '+57 300 1234567',
  'test@lanochebartest.com',
  150,
  'active',
  NOW(),
  NOW()
) ON DUPLICATE KEY UPDATE updatedAt = NOW();

-- Obtener el ID del venue creado
SET @venue_id = LAST_INSERT_ID();

-- ============================================================================
-- 2. CREAR USUARIOS DE PRUEBA (Manager y Staff)
-- ============================================================================
-- Manager de prueba
INSERT INTO users (openId, name, email, loginMethod, role, venueId, createdAt, updatedAt, lastSignedIn)
VALUES (
  'test-manager-001',
  'Carlos Manager',
  'manager@test.com',
  'test',
  'manager',
  @venue_id,
  NOW(),
  NOW(),
  NOW()
) ON DUPLICATE KEY UPDATE updatedAt = NOW();

SET @manager_id = LAST_INSERT_ID();

-- Staff de prueba (Bartender)
INSERT INTO users (openId, name, email, loginMethod, role, venueId, createdAt, updatedAt, lastSignedIn)
VALUES (
  'test-staff-001',
  'Juan Staff Bartender',
  'staff@test.com',
  'test',
  'staff',
  @venue_id,
  NOW(),
  NOW(),
  NOW()
) ON DUPLICATE KEY UPDATE updatedAt = NOW();

SET @staff_id = LAST_INSERT_ID();

-- Staff de prueba (Cocina)
INSERT INTO users (openId, name, email, loginMethod, role, venueId, createdAt, updatedAt, lastSignedIn)
VALUES (
  'test-staff-002',
  'María Staff Cocina',
  'staff2@test.com',
  'test',
  'staff',
  @venue_id,
  NOW(),
  NOW(),
  NOW()
) ON DUPLICATE KEY UPDATE updatedAt = NOW();

SET @staff_id_2 = LAST_INSERT_ID();

-- ============================================================================
-- 3. CREAR MESAS DE PRUEBA
-- ============================================================================
INSERT INTO tables (venueId, tableNumber, capacity, qrToken, status, createdAt, updatedAt)
VALUES 
  (@venue_id, 1, 4, 'QR-TEST-001-' || UUID(), 'active', NOW(), NOW()),
  (@venue_id, 2, 6, 'QR-TEST-002-' || UUID(), 'active', NOW(), NOW()),
  (@venue_id, 3, 2, 'QR-TEST-003-' || UUID(), 'active', NOW(), NOW()),
  (@venue_id, 4, 8, 'QR-TEST-004-' || UUID(), 'active', NOW(), NOW());

-- ============================================================================
-- 4. CREAR CATEGORÍAS DE MENÚ
-- ============================================================================
INSERT INTO menuCategories (venueId, name, description, displayOrder, createdAt, updatedAt)
VALUES 
  (@venue_id, 'Bebidas Alcohólicas', 'Cervezas, licores y cócteles', 1, NOW(), NOW()),
  (@venue_id, 'Bebidas Sin Alcohol', 'Refrescos, jugos y agua', 2, NOW(), NOW()),
  (@venue_id, 'Entradas', 'Alitas, papas, tabla de quesos', 3, NOW(), NOW()),
  (@venue_id, 'Platos Principales', 'Carnes, pastas y especialidades', 4, NOW(), NOW()),
  (@venue_id, 'Postres', 'Helados, brownies y más', 5, NOW(), NOW());

-- Obtener IDs de categorías
SET @cat_drinks_id = LAST_INSERT_ID() - 4;
SET @cat_soft_id = LAST_INSERT_ID() - 3;
SET @cat_appetizers_id = LAST_INSERT_ID() - 2;
SET @cat_mains_id = LAST_INSERT_ID() - 1;
SET @cat_desserts_id = LAST_INSERT_ID();

-- ============================================================================
-- 5. CREAR ÍTEMS DE MENÚ
-- ============================================================================
INSERT INTO menuItems (venueId, categoryId, name, description, price, quantity, createdAt, updatedAt)
VALUES 
  -- Bebidas Alcohólicas
  (@venue_id, @cat_drinks_id, 'Cerveza Artesanal', 'Cerveza local 330ml', 8000, 50, NOW(), NOW()),
  (@venue_id, @cat_drinks_id, 'Mojito', 'Ron, menta, lima y azúcar', 15000, 30, NOW(), NOW()),
  (@venue_id, @cat_drinks_id, 'Margarita', 'Tequila, triple sec y limón', 16000, 25, NOW(), NOW()),
  
  -- Bebidas Sin Alcohol
  (@venue_id, @cat_soft_id, 'Refresco', 'Coca Cola, Sprite o Fanta 350ml', 3000, 100, NOW(), NOW()),
  (@venue_id, @cat_soft_id, 'Jugo Natural', 'Naranja, fresa o mango', 5000, 40, NOW(), NOW()),
  (@venue_id, @cat_soft_id, 'Agua Mineral', 'Agua sin gas 500ml', 2000, 80, NOW(), NOW()),
  
  -- Entradas
  (@venue_id, @cat_appetizers_id, 'Alitas BBQ', '8 alitas con salsa BBQ', 18000, 20, NOW(), NOW()),
  (@venue_id, @cat_appetizers_id, 'Tabla de Quesos', 'Variedad de quesos artesanales', 25000, 15, NOW(), NOW()),
  (@venue_id, @cat_appetizers_id, 'Papas Loaded', 'Papas con queso, tocino y jalapeños', 12000, 30, NOW(), NOW()),
  
  -- Platos Principales
  (@venue_id, @cat_mains_id, 'Costilla BBQ', 'Media costilla con papas y ensalada', 45000, 10, NOW(), NOW()),
  (@venue_id, @cat_mains_id, 'Pasta Carbonara', 'Pasta fresca con salsa cremosa', 22000, 25, NOW(), NOW()),
  (@venue_id, @cat_mains_id, 'Salmón a la Mantequilla', 'Filete de salmón con vegetales', 38000, 8, NOW(), NOW()),
  
  -- Postres
  (@venue_id, @cat_desserts_id, 'Brownie Chocolate', 'Brownie caliente con helado', 9000, 20, NOW(), NOW()),
  (@venue_id, @cat_desserts_id, 'Helado 3 Sabores', 'Helado artesanal 3 sabores', 7000, 30, NOW(), NOW());

-- ============================================================================
-- 6. CREAR PEDIDOS DE PRUEBA
-- ============================================================================
-- Obtener ID de la primera mesa
SET @table_id = (SELECT id FROM tables WHERE venueId = @venue_id LIMIT 1);

-- Pedido 1: Completado
INSERT INTO orders (venueId, tableId, status, totalAmount, itemCount, createdAt, updatedAt, completedAt)
VALUES (@venue_id, @table_id, 'delivered', 45000, 3, DATE_SUB(NOW(), INTERVAL 2 HOUR), NOW(), DATE_SUB(NOW(), INTERVAL 1 HOUR));

SET @order_id_1 = LAST_INSERT_ID();

-- Agregar ítems al pedido 1
INSERT INTO orderItems (orderId, menuItemId, quantity, unitPrice, subtotal)
SELECT @order_id_1, id, 1, price, price FROM menuItems WHERE venueId = @venue_id AND name = 'Cerveza Artesanal' LIMIT 1;
INSERT INTO orderItems (orderId, menuItemId, quantity, unitPrice, subtotal)
SELECT @order_id_1, id, 1, price, price FROM menuItems WHERE venueId = @venue_id AND name = 'Alitas BBQ' LIMIT 1;
INSERT INTO orderItems (orderId, menuItemId, quantity, unitPrice, subtotal)
SELECT @order_id_1, id, 1, price, price FROM menuItems WHERE venueId = @venue_id AND name = 'Brownie Chocolate' LIMIT 1;

-- Pedido 2: En preparación
INSERT INTO orders (venueId, tableId, status, totalAmount, itemCount, createdAt, updatedAt)
VALUES (@venue_id, @table_id, 'preparing', 38000, 2, DATE_SUB(NOW(), INTERVAL 30 MINUTE), NOW());

SET @order_id_2 = LAST_INSERT_ID();

INSERT INTO orderItems (orderId, menuItemId, quantity, unitPrice, subtotal)
SELECT @order_id_2, id, 1, price, price FROM menuItems WHERE venueId = @venue_id AND name = 'Mojito' LIMIT 1;
INSERT INTO orderItems (orderId, menuItemId, quantity, unitPrice, subtotal)
SELECT @order_id_2, id, 1, price, price FROM menuItems WHERE venueId = @venue_id AND name = 'Salmón a la Mantequilla' LIMIT 1;

-- Pedido 3: Pendiente
INSERT INTO orders (venueId, tableId, status, totalAmount, itemCount, createdAt, updatedAt)
VALUES (@venue_id, @table_id, 'pending', 22000, 1, DATE_SUB(NOW(), INTERVAL 5 MINUTE), NOW());

SET @order_id_3 = LAST_INSERT_ID();

INSERT INTO orderItems (orderId, menuItemId, quantity, unitPrice, subtotal)
SELECT @order_id_3, id, 1, price, price FROM menuItems WHERE venueId = @venue_id AND name = 'Pasta Carbonara' LIMIT 1;

-- ============================================================================
-- 7. CREAR PETICIONES MUSICALES
-- ============================================================================
INSERT INTO musicRequests (venueId, tableId, songName, artist, requestedBy, status, createdAt, updatedAt)
VALUES 
  (@venue_id, @table_id, 'Bohemian Rhapsody', 'Queen', 'Mesa 1', 'pending', NOW(), NOW()),
  (@venue_id, @table_id, 'Hotel California', 'Eagles', 'Mesa 1', 'playing', DATE_SUB(NOW(), INTERVAL 3 MINUTE), NOW()),
  (@venue_id, @table_id, 'Imagine', 'John Lennon', 'Mesa 1', 'completed', DATE_SUB(NOW(), INTERVAL 10 MINUTE), NOW());

-- ============================================================================
-- 8. CREAR PQRS (PETICIONES, QUEJAS, RECLAMOS Y SUGERENCIAS)
-- ============================================================================
INSERT INTO pqrs (venueId, userId, type, subject, description, status, priority, createdAt, updatedAt)
VALUES 
  (@venue_id, @manager_id, 'suggestion', 'Mejorar iluminación', 'La iluminación en la zona de la barra es muy tenue', 'open', 'low', NOW(), NOW()),
  (@venue_id, @staff_id, 'complaint', 'Equipos de cocina', 'El horno no mantiene temperatura constante', 'in_progress', 'high', NOW(), NOW()),
  (@venue_id, @manager_id, 'request', 'Nuevo menú', 'Agregar opciones vegetarianas al menú', 'open', 'medium', NOW(), NOW());

-- ============================================================================
-- 9. CREAR SESIÓN DE CLIENTE POR QR (para pruebas del portal)
-- ============================================================================
INSERT INTO qrSessions (venueId, tableId, sessionToken, expiresAt, createdAt)
VALUES 
  (@venue_id, @table_id, 'SESSION-TEST-001', DATE_ADD(NOW(), INTERVAL 24 HOUR), NOW());

-- ============================================================================
-- RESUMEN DE DATOS CREADOS
-- ============================================================================
SELECT 
  'DATOS DE PRUEBA CREADOS EXITOSAMENTE' AS Status,
  @venue_id AS VenueID,
  @manager_id AS ManagerID,
  @staff_id AS StaffID,
  @staff_id_2 AS Staff2ID;

SELECT 
  'Venue' AS Entity,
  COUNT(*) AS Count
FROM venues WHERE id = @venue_id
UNION ALL
SELECT 'Users', COUNT(*) FROM users WHERE venueId = @venue_id
UNION ALL
SELECT 'Tables', COUNT(*) FROM tables WHERE venueId = @venue_id
UNION ALL
SELECT 'Menu Categories', COUNT(*) FROM menuCategories WHERE venueId = @venue_id
UNION ALL
SELECT 'Menu Items', COUNT(*) FROM menuItems WHERE venueId = @venue_id
UNION ALL
SELECT 'Orders', COUNT(*) FROM orders WHERE venueId = @venue_id
UNION ALL
SELECT 'Music Requests', COUNT(*) FROM musicRequests WHERE venueId = @venue_id
UNION ALL
SELECT 'PQRs', COUNT(*) FROM pqrs WHERE venueId = @venue_id;
