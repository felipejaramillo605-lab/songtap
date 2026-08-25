import { afterEach, describe, expect, it } from "vitest";
import bcrypt from "bcrypt";
import { and, eq, inArray } from "drizzle-orm";
import { appRouter } from "./routers";
import { createUserWithPassword, getDb } from "./db";
import { toBaseQuantity } from "./inventory";
import {
  inventoryAlerts,
  inventoryItems,
  inventoryMovements,
  inventoryRecipeLines,
  inventoryRecipes,
  menuCategories,
  menuItems,
  orderItems,
  orders,
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
  for (const userId of created.userIds.splice(0)) await db.delete(users).where(eq(users.id, userId));
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
  });

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
});
