import { afterEach, describe, expect, it } from "vitest";
import bcrypt from "bcrypt";
import { and, eq, inArray } from "drizzle-orm";
import { appRouter } from "./routers";
import { createUserWithPassword, getDb } from "./db";
import { toBaseQuantity } from "./inventory";
import { runInventoryExpiryNotifications } from "./inventoryDb";
import {
  inventoryAlerts,
  inventoryControlSettings,
  inventoryCountTemplateFamilies,
  inventoryCountTemplates,
  inventoryItems,
  inventoryLots,
  inventoryMovements,
  inventoryPurchaseLines,
  inventoryPurchaseOrderLines,
  inventoryPurchaseOrders,
  inventoryPurchases,
  inventoryPhysicalCountLines,
  inventoryPhysicalCounts,
  inventoryPhysicalCountApprovals,
  inventoryRecipeLines,
  inventoryRecipes,
  inventorySuppliers,
  inventoryWastes,
  menuCategories,
  menuItems,
  orderItems,
  orders,
  userNotificationHistory,
  users,
  venues,
} from "../drizzle/schema";

const created = { venueIds: [] as number[], userIds: [] as number[], menuItemIds: [] as number[], orderIds: [] as number[] };

function context(user: { id: number; role: "owner" | "manager" | "staff"; venueId: number | null }) {
  return {
    user: { ...user, openId: `inventory-${user.id}`, name: "Prueba Inventario", email: `inventory-${user.id}@songtap.test`, loginMethod: "password", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { headers: { "x-forwarded-proto": "https" } },
    res: { cookie: () => {}, clearCookie: () => {} },
  } as any;
}

async function createFixture() {
  const db = await getDb();
  if (!db) throw new Error("DB no disponible");
  const insert = await db.insert(venues).values({ name: `Inventario Test ${Date.now()}-${Math.random().toString(36).slice(2)}`, isActive: true, musicMode: "manual", musicProvider: "manual", musicConnectionStatus: "not_configured" });
  const venueId = Number((insert[0] as { insertId: number }).insertId);
  created.venueIds.push(venueId);
  const manager = await createUserWithPassword({ email: `inventory-manager-${Date.now()}-${Math.random()}@songtap.test`, passwordHash: await bcrypt.hash("Inventario!26", 10), name: "Manager Inventario", role: "manager", venueId });
  const staff = await createUserWithPassword({ email: `inventory-staff-${Date.now()}-${Math.random()}@songtap.test`, passwordHash: await bcrypt.hash("Inventario!26", 10), name: "Staff Inventario", role: "staff", venueId });
  if (!manager || !staff) throw new Error("No se crearon las cuentas de prueba");
  created.userIds.push(manager.id, staff.id);
  const category = await db.insert(menuCategories).values({ venueId, name: "Bebidas test", sortOrder: 0, isActive: true });
  const categoryId = Number((category[0] as { insertId: number }).insertId);
  const menu = await db.insert(menuItems).values({ venueId, categoryId, name: "Cóctel prueba", price: "15000", isAvailable: true, isAlcoholic: false });
  const menuItemId = Number((menu[0] as { insertId: number }).insertId);
  created.menuItemIds.push(menuItemId);
  return { venueId, manager, staff, menuItemId, categoryId };
}

async function createPendingOrder(venueId: number, menuItemId: number, quantity: number) {
  const db = await getDb();
  const order = await db!.insert(orders).values({ venueId, tableId: 999001, sessionId: 999001, clientName: "Cliente inventario", status: "pending", totalAmount: "15000", totalCost: "0", ageConfirmed: false, invoiceStatus: "not_applicable" });
  const orderId = Number((order[0] as { insertId: number }).insertId);
  created.orderIds.push(orderId);
  await db!.insert(orderItems).values({ orderId, menuItemId, menuItemName: "Cóctel prueba", quantity, unitPrice: "15000", subtotal: String(15000 * quantity) });
  return orderId;
}

afterEach(async () => {
  const db = await getDb();
  if (!db) return;
  for (const orderId of created.orderIds.splice(0)) {
    await db.delete(orderItems).where(eq(orderItems.orderId, orderId));
    await db.delete(orders).where(eq(orders.id, orderId));
  }
  for (const venueId of created.venueIds.splice(0)) {
    const items = await db.select({ id: inventoryItems.id }).from(inventoryItems).where(eq(inventoryItems.venueId, venueId));
    const itemIds = items.map((item) => item.id);
    const recipes = await db.select({ id: inventoryRecipes.id }).from(inventoryRecipes).where(eq(inventoryRecipes.venueId, venueId));
    if (recipes.length) await db.delete(inventoryRecipeLines).where(inArray(inventoryRecipeLines.recipeId, recipes.map((recipe) => recipe.id)));
    const purchases = await db.select({ id: inventoryPurchases.id }).from(inventoryPurchases).where(eq(inventoryPurchases.venueId, venueId));
    const purchaseOrders = await db.select({ id: inventoryPurchaseOrders.id }).from(inventoryPurchaseOrders).where(eq(inventoryPurchaseOrders.venueId, venueId));
    const physicalCounts = await db.select({ id: inventoryPhysicalCounts.id }).from(inventoryPhysicalCounts).where(eq(inventoryPhysicalCounts.venueId, venueId));
    const countTemplates = await db.select({ id: inventoryCountTemplates.id }).from(inventoryCountTemplates).where(eq(inventoryCountTemplates.venueId, venueId));
    if (itemIds.length) await db.delete(inventoryLots).where(eq(inventoryLots.venueId, venueId));
    await db.delete(inventoryWastes).where(eq(inventoryWastes.venueId, venueId));
    if (purchases.length) await db.delete(inventoryPurchaseLines).where(inArray(inventoryPurchaseLines.purchaseId, purchases.map((purchase) => purchase.id)));
    await db.delete(inventoryPurchases).where(eq(inventoryPurchases.venueId, venueId));
    if (purchaseOrders.length) await db.delete(inventoryPurchaseOrderLines).where(inArray(inventoryPurchaseOrderLines.purchaseOrderId, purchaseOrders.map((order) => order.id)));
    await db.delete(inventoryPurchaseOrders).where(eq(inventoryPurchaseOrders.venueId, venueId));
    if (physicalCounts.length) await db.delete(inventoryPhysicalCountLines).where(inArray(inventoryPhysicalCountLines.physicalCountId, physicalCounts.map((count) => count.id)));
    if (physicalCounts.length) await db.delete(inventoryPhysicalCountApprovals).where(inArray(inventoryPhysicalCountApprovals.physicalCountId, physicalCounts.map((count) => count.id)));
    await db.delete(inventoryPhysicalCounts).where(eq(inventoryPhysicalCounts.venueId, venueId));
    if (countTemplates.length) await db.delete(inventoryCountTemplateFamilies).where(inArray(inventoryCountTemplateFamilies.templateId, countTemplates.map((template) => template.id)));
    await db.delete(inventoryCountTemplates).where(eq(inventoryCountTemplates.venueId, venueId));
    await db.delete(inventoryControlSettings).where(eq(inventoryControlSettings.venueId, venueId));
    await db.delete(inventorySuppliers).where(eq(inventorySuppliers.venueId, venueId));
    if (itemIds.length) {
      await db.delete(inventoryAlerts).where(eq(inventoryAlerts.venueId, venueId));
      await db.delete(inventoryMovements).where(eq(inventoryMovements.venueId, venueId));
      await db.delete(inventoryItems).where(eq(inventoryItems.venueId, venueId));
    }
    await db.delete(inventoryRecipes).where(eq(inventoryRecipes.venueId, venueId));
    await db.delete(menuItems).where(eq(menuItems.venueId, venueId));
    await db.delete(menuCategories).where(eq(menuCategories.venueId, venueId));
    await db.delete(venues).where(eq(venues.id, venueId));
  }
  for (const userId of created.userIds.splice(0)) {
    await db.delete(userNotificationHistory).where(eq(userNotificationHistory.userId, userId));
    await db.delete(users).where(eq(users.id, userId));
  }
});

describe("inventarios", () => {
  it("convierte litros, onzas y cajas a unidades base sin mezclar dimensiones", () => {
    expect(toBaseQuantity({ dimension: "volume", quantity: 1, unit: "liter" })).toBe(1000);
    expect(toBaseQuantity({ dimension: "volume", quantity: 4, unit: "fl_oz" })).toBe(118.294);
    expect(toBaseQuantity({ dimension: "count", quantity: 2, unit: "box", packBaseQuantity: 24 })).toBe(48);
    expect(() => toBaseQuantity({ dimension: "mass", quantity: 1, unit: "liter" })).toThrow("no es compatible");
  });

  it("descuenta una receta al entregar, evita doble descuento y activa alerta por mínimo", async () => {
    const { venueId, manager, staff, menuItemId } = await createFixture();
    const managerCaller = appRouter.createCaller(context({ id: manager.id, role: "manager", venueId }));
    const createdItem = await managerCaller.inventory.createItem({ venueId, name: "Ron blanco", dimension: "volume", reorderPointQuantity: 800, reorderPointUnit: "ml" });
    const itemId = createdItem.item!.id;
    await managerCaller.inventory.registerMovement({ venueId, inventoryItemId: itemId, movementType: "initial", quantity: 1, unit: "liter" });
    await managerCaller.inventory.saveRecipe({ venueId, menuItemId, lines: [{ inventoryItemId: itemId, quantity: 4, unit: "fl_oz" }] });
    const orderId = await createPendingOrder(venueId, menuItemId, 2);

    const staffCaller = appRouter.createCaller(context({ id: staff.id, role: "staff", venueId }));
    await expect(staffCaller.orders.updateStatus({ orderId, venueId, status: "delivered" })).resolves.toEqual({ success: true });
    const dashboard = await managerCaller.inventory.dashboard({ venueId });
    expect(Number(dashboard.items.find((item) => item.id === itemId)?.currentStockBase)).toBe(763.412);
    expect(dashboard.alerts).toHaveLength(1);

    await staffCaller.orders.updateStatus({ orderId, venueId, status: "delivered" });
    const movements = await managerCaller.inventory.movements({ venueId, inventoryItemId: itemId });
    expect(movements.filter((movement) => movement.movementType === "order_delivery")).toHaveLength(1);
  }, 15_000);

  it("bloquea una entrega con saldo insuficiente y un Manager de otro local", async () => {
    const { venueId, manager, staff, menuItemId } = await createFixture();
    const managerCaller = appRouter.createCaller(context({ id: manager.id, role: "manager", venueId }));
    const item = await managerCaller.inventory.createItem({ venueId, name: "Jugo de limón", dimension: "volume", reorderPointQuantity: 0, reorderPointUnit: "ml" });
    await managerCaller.inventory.registerMovement({ venueId, inventoryItemId: item.item!.id, movementType: "initial", quantity: 50, unit: "ml" });
    await managerCaller.inventory.saveRecipe({ venueId, menuItemId, lines: [{ inventoryItemId: item.item!.id, quantity: 4, unit: "fl_oz" }] });
    const orderId = await createPendingOrder(venueId, menuItemId, 1);
    const staffCaller = appRouter.createCaller(context({ id: staff.id, role: "staff", venueId }));
    await expect(staffCaller.orders.updateStatus({ orderId, venueId, status: "delivered" })).rejects.toMatchObject({ code: "CONFLICT" });

    const otherManager = appRouter.createCaller(context({ id: manager.id + 500000, role: "manager", venueId: venueId + 1 }));
    await expect(otherManager.inventory.dashboard({ venueId })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("recibe una compra de proveedor, crea un lote y consume primero el lote vigente", async () => {
    const { venueId, manager, staff, menuItemId } = await createFixture();
    const managerCaller = appRouter.createCaller(context({ id: manager.id, role: "manager", venueId }));
    const item = await managerCaller.inventory.createItem({ venueId, name: "Pulpa de mango", dimension: "volume", reorderPointQuantity: 100, reorderPointUnit: "ml", isPerishable: true, expiryAlertDays: 7 });
    const supplier = await managerCaller.inventory.createSupplier({ venueId, name: "Frutas del Valle", contactName: "Andrea" });
    const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    const purchase = await managerCaller.inventory.receivePurchase({
      venueId,
      supplierId: supplier.supplier!.id,
      reference: "FAC-100",
      receivedAt: new Date(),
      lines: [{ inventoryItemId: item.item!.id, quantity: 2, unit: "liter", unitCost: 12000, lotCode: "MNG-03", expiresAt }],
    });
    expect(purchase.purchaseId).toBeGreaterThan(0);
    expect(purchase.expiringLots).toContain("Pulpa de mango");
    const alerts = await managerCaller.inventory.expiryAlerts({ venueId });
    expect(alerts).toHaveLength(1);
    expect(alerts[0].state).toBe("expiring");

    await managerCaller.inventory.saveRecipe({ venueId, menuItemId, lines: [{ inventoryItemId: item.item!.id, quantity: 4, unit: "fl_oz" }] });
    const orderId = await createPendingOrder(venueId, menuItemId, 1);
    const staffCaller = appRouter.createCaller(context({ id: staff.id, role: "staff", venueId }));
    await staffCaller.orders.updateStatus({ orderId, venueId, status: "delivered" });
    const db = await getDb();
    const [lot] = await db!.select().from(inventoryLots).where(eq(inventoryLots.venueId, venueId)).limit(1);
    expect(Number(lot.remainingQuantityBase)).toBe(1881.706);
    const purchases = await managerCaller.inventory.purchases({ venueId });
    expect(purchases[0].supplier?.name).toBe("Frutas del Valle");
  });

  it("exige vencimiento en compras de insumos perecederos y restringe compras a Manager", async () => {
    const { venueId, manager, staff } = await createFixture();
    const managerCaller = appRouter.createCaller(context({ id: manager.id, role: "manager", venueId }));
    const item = await managerCaller.inventory.createItem({ venueId, name: "Leche", dimension: "volume", reorderPointQuantity: 0, reorderPointUnit: "ml", isPerishable: true });
    await expect(managerCaller.inventory.receivePurchase({ venueId, receivedAt: new Date(), lines: [{ inventoryItemId: item.item!.id, quantity: 1, unit: "liter" }] })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    const staffCaller = appRouter.createCaller(context({ id: staff.id, role: "staff", venueId }));
    await expect(staffCaller.inventory.createSupplier({ venueId, name: "Proveedor Staff" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("revisa lotes diarios sin duplicar la misma alerta de caducidad", async () => {
    const { venueId, manager } = await createFixture();
    const managerCaller = appRouter.createCaller(context({ id: manager.id, role: "manager", venueId }));
    const item = await managerCaller.inventory.createItem({ venueId, name: "Crema", dimension: "volume", reorderPointQuantity: 0, reorderPointUnit: "ml", isPerishable: true, expiryAlertDays: 7 });
    await managerCaller.inventory.receivePurchase({
      venueId,
      receivedAt: new Date(),
      lines: [{ inventoryItemId: item.item!.id, quantity: 1, unit: "liter", expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) }],
    });
    const db = await getDb();
    await db!.update(inventoryLots).set({ lastAlertState: "none", lastAlertedAt: null }).where(eq(inventoryLots.venueId, venueId));
    const firstRun = await runInventoryExpiryNotifications();
    expect(firstRun.expiring).toBeGreaterThan(0);
    const afterFirst = await db!.select().from(userNotificationHistory).where(eq(userNotificationHistory.userId, manager.id));
    await runInventoryExpiryNotifications();
    const afterSecond = await db!.select().from(userNotificationHistory).where(eq(userNotificationHistory.userId, manager.id));
    expect(afterSecond).toHaveLength(afterFirst.length);
  });

  it("calcula costo promedio ponderado y margen real de una receta", async () => {
    const { venueId, manager, menuItemId } = await createFixture();
    const managerCaller = appRouter.createCaller(context({ id: manager.id, role: "manager", venueId }));
    const item = await managerCaller.inventory.createItem({ venueId, name: "Sirope", dimension: "volume", reorderPointQuantity: 0, reorderPointUnit: "ml" });
    await managerCaller.inventory.receivePurchase({ venueId, receivedAt: new Date(), lines: [{ inventoryItemId: item.item!.id, quantity: 1, unit: "liter", unitCost: 10000 }] });
    await managerCaller.inventory.receivePurchase({ venueId, receivedAt: new Date(), lines: [{ inventoryItemId: item.item!.id, quantity: 1, unit: "liter", unitCost: 20000 }] });
    const dashboard = await managerCaller.inventory.dashboard({ venueId });
    expect(Number(dashboard.items.find((candidate) => candidate.id === item.item!.id)?.averageUnitCostBase)).toBe(15);
    await managerCaller.inventory.saveRecipe({ venueId, menuItemId, lines: [{ inventoryItemId: item.item!.id, quantity: 100, unit: "ml" }] });
    const margins = await managerCaller.inventory.recipeMargins({ venueId });
    expect(margins[0]).toMatchObject({ recipeCost: 1500, marginAmount: 13500, marginPercent: 90, isCosted: true });
  }, 15_000);

  it("registra una merma solamente sobre un lote vencido y reduce su stock", async () => {
    const { venueId, manager, staff } = await createFixture();
    const managerCaller = appRouter.createCaller(context({ id: manager.id, role: "manager", venueId }));
    const item = await managerCaller.inventory.createItem({ venueId, name: "Crema vencida", dimension: "volume", reorderPointQuantity: 0, reorderPointUnit: "ml", isPerishable: true });
    const receivedAt = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const expiresAt = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await managerCaller.inventory.receivePurchase({ venueId, receivedAt, lines: [{ inventoryItemId: item.item!.id, quantity: 1, unit: "liter", unitCost: 12000, expiresAt }] });
    const db = await getDb();
    const [lot] = await db!.select().from(inventoryLots).where(eq(inventoryLots.venueId, venueId)).limit(1);
    const waste = await managerCaller.inventory.recordExpiredWaste({ venueId, inventoryLotId: lot.id, quantityBase: 250, note: "Producto deteriorado" });
    expect(waste.totalCost).toBe(3000);
    const after = await managerCaller.inventory.dashboard({ venueId });
    expect(Number(after.items.find((candidate) => candidate.id === item.item!.id)?.currentStockBase)).toBe(750);
    expect((await managerCaller.inventory.wastes({ venueId }))[0]).toMatchObject({ quantityBase: "250.0000", totalCost: "3000.0000" });
    const staffCaller = appRouter.createCaller(context({ id: staff.id, role: "staff", venueId }));
    await expect(staffCaller.inventory.recordExpiredWaste({ venueId, inventoryLotId: lot.id, quantityBase: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  }, 15_000);

  it("gestiona una orden de compra con recepción parcial y final sin descontar antes de recibir", async () => {
    const { venueId, manager } = await createFixture();
    const managerCaller = appRouter.createCaller(context({ id: manager.id, role: "manager", venueId }));
    const item = await managerCaller.inventory.createItem({ venueId, name: "Gaseosa", dimension: "volume", reorderPointQuantity: 0, reorderPointUnit: "ml" });
    const supplier = await managerCaller.inventory.createSupplier({ venueId, name: "Bebidas SAS" });
    const order = await managerCaller.inventory.createPurchaseOrder({ venueId, supplierId: supplier.supplier!.id, reference: "OC-100", lines: [{ inventoryItemId: item.item!.id, quantity: 2, unit: "liter", estimatedUnitCost: 5000 }] });
    await managerCaller.inventory.updatePurchaseOrderStatus({ venueId, purchaseOrderId: order.purchaseOrderId, status: "sent" });
    expect(Number((await managerCaller.inventory.dashboard({ venueId })).items.find((candidate) => candidate.id === item.item!.id)?.currentStockBase)).toBe(0);
    const purchaseOrder = (await managerCaller.inventory.purchaseOrders({ venueId }))[0];
    const orderLine = purchaseOrder.lines[0];
    await managerCaller.inventory.receivePurchase({ venueId, purchaseOrderId: order.purchaseOrderId, receivedAt: new Date(), lines: [{ inventoryItemId: item.item!.id, purchaseOrderLineId: orderLine.id, quantity: 0.5, unit: "liter", unitCost: 5000 }] });
    expect((await managerCaller.inventory.purchaseOrders({ venueId }))[0].status).toBe("partially_received");
    await managerCaller.inventory.receivePurchase({ venueId, purchaseOrderId: order.purchaseOrderId, receivedAt: new Date(), lines: [{ inventoryItemId: item.item!.id, purchaseOrderLineId: orderLine.id, quantity: 1.5, unit: "liter", unitCost: 5000 }] });
    expect((await managerCaller.inventory.purchaseOrders({ venueId }))[0].status).toBe("received");
  }, 15_000);

  it("concilia un conteo físico completo y evita que un Staff o un conteo desactualizado alteren el saldo", async () => {
    const { venueId, manager, staff } = await createFixture();
    const managerCaller = appRouter.createCaller(context({ id: manager.id, role: "manager", venueId }));
    const item = await managerCaller.inventory.createItem({ venueId, name: "Cerveza conteo", dimension: "count", reorderPointQuantity: 0, reorderPointUnit: "unit" });
    await managerCaller.inventory.registerMovement({ venueId, inventoryItemId: item.item!.id, movementType: "initial", quantity: 12, unit: "unit" });
    const count = await managerCaller.inventory.startPhysicalCount({ venueId, notes: "Conteo semanal" });
    await managerCaller.inventory.recordPhysicalCountLine({ venueId, physicalCountId: count.physicalCountId, inventoryItemId: item.item!.id, physicalQuantity: 10, unit: "unit", note: "Dos unidades dañadas" });
    const staffCaller = appRouter.createCaller(context({ id: staff.id, role: "staff", venueId }));
    await expect(staffCaller.inventory.reconcilePhysicalCount({ venueId, physicalCountId: count.physicalCountId })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await managerCaller.inventory.submitPhysicalCount({ venueId, physicalCountId: count.physicalCountId });
    await managerCaller.inventory.reconcilePhysicalCount({ venueId, physicalCountId: count.physicalCountId });
    const dashboard = await managerCaller.inventory.dashboard({ venueId });
    expect(Number(dashboard.items.find((candidate) => candidate.id === item.item!.id)?.currentStockBase)).toBe(10);
    const countRecord = (await managerCaller.inventory.physicalCounts({ venueId }))[0];
    expect(countRecord.status).toBe("reconciled");
    expect(Number(countRecord.lines[0].varianceBase)).toBe(-2);

    const staleCount = await managerCaller.inventory.startPhysicalCount({ venueId });
    await managerCaller.inventory.recordPhysicalCountLine({ venueId, physicalCountId: staleCount.physicalCountId, inventoryItemId: item.item!.id, physicalQuantity: 9, unit: "unit" });
    await managerCaller.inventory.registerMovement({ venueId, inventoryItemId: item.item!.id, movementType: "adjustment", quantity: 1, unit: "unit" });
    await managerCaller.inventory.submitPhysicalCount({ venueId, physicalCountId: staleCount.physicalCountId });
    await expect(managerCaller.inventory.reconcilePhysicalCount({ venueId, physicalCountId: staleCount.physicalCountId })).rejects.toMatchObject({ code: "BAD_REQUEST", message: expect.stringContaining("cambió") });
  }, 20_000);

  it("reduce lotes por vencimiento al conciliar una diferencia física negativa", async () => {
    const { venueId, manager } = await createFixture();
    const managerCaller = appRouter.createCaller(context({ id: manager.id, role: "manager", venueId }));
    const item = await managerCaller.inventory.createItem({ venueId, name: "Jugo con lote", dimension: "volume", reorderPointQuantity: 0, reorderPointUnit: "ml", isPerishable: true });
    await managerCaller.inventory.receivePurchase({ venueId, receivedAt: new Date(), lines: [{ inventoryItemId: item.item!.id, quantity: 1, unit: "liter", unitCost: 8000, expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) }] });
    const count = await managerCaller.inventory.startPhysicalCount({ venueId });
    await managerCaller.inventory.recordPhysicalCountLine({ venueId, physicalCountId: count.physicalCountId, inventoryItemId: item.item!.id, physicalQuantity: 750, unit: "ml" });
    await managerCaller.inventory.submitPhysicalCount({ venueId, physicalCountId: count.physicalCountId });
    await managerCaller.inventory.reconcilePhysicalCount({ venueId, physicalCountId: count.physicalCountId });
    const db = await getDb();
    const [lot] = await db!.select().from(inventoryLots).where(eq(inventoryLots.venueId, venueId)).limit(1);
    expect(Number(lot.remainingQuantityBase)).toBe(750);
    const adjustment = (await managerCaller.inventory.movements({ venueId, inventoryItemId: item.item!.id })).find((movement) => movement.movementType === "adjustment");
    expect(Number(adjustment?.quantityBase)).toBe(-250);
  }, 15_000);

  it("aplica plantillas por familia y exige una aprobación independiente sobre el umbral del local", async () => {
    const { venueId, manager } = await createFixture();
    const managerCaller = appRouter.createCaller(context({ id: manager.id, role: "manager", venueId }));
    const secondManager = await createUserWithPassword({ email: `inventory-approver-${Date.now()}-${Math.random()}@songtap.test`, passwordHash: await bcrypt.hash("Inventario!26", 10), name: "Aprobador Inventario", role: "manager", venueId });
    if (!secondManager) throw new Error("No se creó el segundo Manager de prueba");
    created.userIds.push(secondManager.id);
    const secondManagerCaller = appRouter.createCaller(context({ id: secondManager.id, role: "manager", venueId }));
    const drinks = await managerCaller.inventory.createItem({ venueId, name: "Botella controlada", family: "Bebidas", dimension: "count", reorderPointQuantity: 0, reorderPointUnit: "unit" });
    await managerCaller.inventory.createItem({ venueId, name: "Vaso controlado", family: "Bebidas", dimension: "count", reorderPointQuantity: 0, reorderPointUnit: "unit" });
    await managerCaller.inventory.createItem({ venueId, name: "Harina cocina", family: "Cocina", dimension: "mass", reorderPointQuantity: 0, reorderPointUnit: "g" });
    await managerCaller.inventory.receivePurchase({ venueId, receivedAt: new Date(), lines: [{ inventoryItemId: drinks.item!.id, quantity: 10, unit: "unit", unitCost: 500 }] });
    await managerCaller.inventory.saveControlSettings({ venueId, dualApprovalEnabled: true, dualApprovalThresholdCost: 2000 });
    const template = await managerCaller.inventory.saveCountTemplate({ venueId, name: "Bebidas", families: ["Bebidas"] });
    const dualCount = await managerCaller.inventory.startPhysicalCount({ venueId, templateId: template.templateId, notes: "Conteo de cierre" });
    const dualLines = (await managerCaller.inventory.physicalCounts({ venueId })).find((count) => count.id === dualCount.physicalCountId)?.lines ?? [];
    expect(dualLines).toHaveLength(2);
    expect(dualLines.every((line) => line.item?.family === "Bebidas")).toBe(true);
    await expect(managerCaller.inventory.startPhysicalCount({ venueId, notes: "Conteo simultáneo" })).rejects.toThrow(/Ya hay un conteo/);
    for (const line of dualLines) await managerCaller.inventory.recordPhysicalCountLine({ venueId, physicalCountId: dualCount.physicalCountId, inventoryItemId: line.inventoryItemId, physicalQuantity: line.inventoryItemId === drinks.item!.id ? 4 : Number(line.systemStockBase), unit: line.item?.baseUnit as "unit" | "ml" | "g" });
    const submitted = await managerCaller.inventory.submitPhysicalCount({ venueId, physicalCountId: dualCount.physicalCountId });
    expect(submitted).toMatchObject({ approvalRequired: true, totalVarianceCost: 3000 });
    const approverNotifications = await secondManagerCaller.notifications.getMyHistory();
    expect(approverNotifications.some((notification) => notification.type === "inventory_approval_pending" && notification.content.includes(`conteo físico #${dualCount.physicalCountId}`))).toBe(true);
    const requesterNotifications = await managerCaller.notifications.getMyHistory();
    expect(requesterNotifications.some((notification) => notification.type === "inventory_approval_pending")).toBe(false);
    await expect(managerCaller.inventory.decidePhysicalCountApproval({ venueId, physicalCountId: dualCount.physicalCountId, approved: true })).rejects.toMatchObject({ code: "BAD_REQUEST", message: expect.stringContaining("otra persona") });
    await expect(managerCaller.inventory.reconcilePhysicalCount({ venueId, physicalCountId: dualCount.physicalCountId })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await secondManagerCaller.inventory.decidePhysicalCountApproval({ venueId, physicalCountId: dualCount.physicalCountId, approved: true, note: "Validado por control" });
    await managerCaller.inventory.reconcilePhysicalCount({ venueId, physicalCountId: dualCount.physicalCountId });
    const metrics = await managerCaller.inventory.countMetrics({ venueId });
    expect(metrics).toMatchObject({ reconciledLast30Days: 1, totalVarianceCostLast30Days: 3000, deviationRateLast30Days: 60 });
  }, 25_000);
});
