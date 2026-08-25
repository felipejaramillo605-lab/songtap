import { and, desc, eq, inArray, sql } from "drizzle-orm";
import {
  inventoryAlerts,
  inventoryItems,
  inventoryMovements,
  inventoryRecipeLines,
  inventoryRecipes,
  menuItems,
  orderItems,
  userNotificationHistory,
  users,
} from "../drizzle/schema";
import { getDb } from "./db";
import { InventoryDimension, InventoryUnit, getBaseUnit, roundBase } from "./inventory";

export class InventoryStockError extends Error {
  constructor(public readonly shortages: Array<{ itemId: number; itemName: string; available: number; required: number; baseUnit: string }>) {
    super("Existencias insuficientes para entregar el pedido.");
  }
}

type Tx = any;

async function syncLowStockAlert(tx: Tx, item: typeof inventoryItems.$inferSelect, stockAfter: number) {
  const reorderPoint = Number(item.reorderPointBase);
  if (reorderPoint <= 0) return { created: false, resolved: false };
  const [activeAlert] = await tx.select().from(inventoryAlerts).where(and(
    eq(inventoryAlerts.inventoryItemId, item.id),
    eq(inventoryAlerts.venueId, item.venueId),
    eq(inventoryAlerts.status, "active"),
  )).limit(1);

  if (stockAfter <= reorderPoint && !activeAlert) {
    await tx.insert(inventoryAlerts).values({ venueId: item.venueId, inventoryItemId: item.id, triggeredStockBase: String(stockAfter), status: "active" });
    const managers = await tx.select({ id: users.id }).from(users).where(and(eq(users.venueId, item.venueId), eq(users.role, "manager")));
    if (managers.length) {
      await tx.insert(userNotificationHistory).values(managers.map((manager: { id: number }) => ({
        userId: manager.id,
        type: "inventory_low",
        title: "Inventario bajo",
        content: `${item.name} está en ${stockAfter} ${item.baseUnit}; el mínimo configurado es ${reorderPoint} ${item.baseUnit}.`,
      })));
    }
    return { created: true, resolved: false };
  }
  if (stockAfter > reorderPoint && activeAlert) {
    await tx.update(inventoryAlerts).set({ status: "resolved", resolvedAt: new Date() }).where(eq(inventoryAlerts.id, activeAlert.id));
    return { created: false, resolved: true };
  }
  return { created: false, resolved: false };
}

export async function getInventoryDashboard(venueId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [items, alerts] = await Promise.all([
    db.select().from(inventoryItems).where(and(eq(inventoryItems.venueId, venueId), eq(inventoryItems.isActive, true))).orderBy(inventoryItems.name),
    db.select().from(inventoryAlerts).where(and(eq(inventoryAlerts.venueId, venueId), eq(inventoryAlerts.status, "active"))).orderBy(desc(inventoryAlerts.createdAt)),
  ]);
  const activeAlertItemIds = new Set(alerts.map((alert) => alert.inventoryItemId));
  return {
    items: items.map((item) => ({ ...item, isLowStock: activeAlertItemIds.has(item.id) })),
    alerts,
  };
}

export async function createInventoryItem(input: {
  venueId: number;
  name: string;
  sku?: string | null;
  dimension: InventoryDimension;
  reorderPointBase: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(inventoryItems).values({
    venueId: input.venueId,
    name: input.name,
    sku: input.sku || null,
    dimension: input.dimension,
    baseUnit: getBaseUnit(input.dimension),
    reorderPointBase: String(roundBase(input.reorderPointBase)),
  });
  const id = Number((result[0] as { insertId: number }).insertId);
  const [item] = await db.select().from(inventoryItems).where(eq(inventoryItems.id, id)).limit(1);
  return item;
}

export async function updateInventoryItem(input: {
  venueId: number;
  itemId: number;
  name: string;
  sku?: string | null;
  reorderPointBase: number;
  isActive: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.transaction(async (tx: Tx) => {
    const [item] = await tx.select().from(inventoryItems).where(and(eq(inventoryItems.id, input.itemId), eq(inventoryItems.venueId, input.venueId))).limit(1);
    if (!item) throw new Error("INSUMO_NO_ENCONTRADO");
    await tx.update(inventoryItems).set({
      name: input.name,
      sku: input.sku || null,
      reorderPointBase: String(roundBase(input.reorderPointBase)),
      isActive: input.isActive,
    }).where(eq(inventoryItems.id, input.itemId));
    const stock = Number(item.currentStockBase);
    await syncLowStockAlert(tx, { ...item, reorderPointBase: String(roundBase(input.reorderPointBase)) }, stock);
  });
}

export async function createInventoryMovement(input: {
  venueId: number;
  inventoryItemId: number;
  movementType: "initial" | "restock" | "adjustment";
  quantityBase: number;
  sourceQuantity: number;
  sourceUnit: InventoryUnit;
  packBaseQuantity?: number | null;
  performedByUserId: number;
  note?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.transaction(async (tx: Tx) => {
    const [item] = await tx.select().from(inventoryItems).where(and(eq(inventoryItems.id, input.inventoryItemId), eq(inventoryItems.venueId, input.venueId))).limit(1);
    if (!item) throw new Error("INSUMO_NO_ENCONTRADO");
    const stockAfter = roundBase(Number(item.currentStockBase) + input.quantityBase);
    if (stockAfter < 0) throw new InventoryStockError([{ itemId: item.id, itemName: item.name, available: Number(item.currentStockBase), required: Math.abs(input.quantityBase), baseUnit: item.baseUnit }]);
    await tx.update(inventoryItems).set({ currentStockBase: String(stockAfter) }).where(and(eq(inventoryItems.id, item.id), eq(inventoryItems.venueId, input.venueId)));
    await tx.insert(inventoryMovements).values({
      venueId: input.venueId,
      inventoryItemId: item.id,
      movementType: input.movementType,
      quantityBase: String(input.quantityBase),
      stockAfterBase: String(stockAfter),
      sourceQuantity: String(input.sourceQuantity),
      sourceUnit: input.sourceUnit,
      packBaseQuantity: input.packBaseQuantity ? String(input.packBaseQuantity) : null,
      performedByUserId: input.performedByUserId,
      note: input.note?.trim() || null,
    });
    const alert = await syncLowStockAlert(tx, item, stockAfter);
    return { stockAfter, alert };
  });
}

export async function getInventoryMovements(venueId: number, itemId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(inventoryMovements.venueId, venueId)];
  if (itemId) conditions.push(eq(inventoryMovements.inventoryItemId, itemId));
  return db.select().from(inventoryMovements).where(and(...conditions)).orderBy(desc(inventoryMovements.createdAt)).limit(200);
}

export async function getVenueMenuItemsForRecipe(venueId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: menuItems.id, name: menuItems.name, isAvailable: menuItems.isAvailable }).from(menuItems).where(eq(menuItems.venueId, venueId)).orderBy(menuItems.name);
}

export async function getInventoryRecipes(venueId: number) {
  const db = await getDb();
  if (!db) return [];
  const recipes = await db.select().from(inventoryRecipes).where(eq(inventoryRecipes.venueId, venueId)).orderBy(desc(inventoryRecipes.updatedAt));
  const lines = recipes.length ? await db.select().from(inventoryRecipeLines).where(inArray(inventoryRecipeLines.recipeId, recipes.map((recipe) => recipe.id))) : [];
  return recipes.map((recipe) => ({ ...recipe, lines: lines.filter((line) => line.recipeId === recipe.id) }));
}

export async function replaceInventoryRecipe(input: {
  venueId: number;
  menuItemId: number;
  name?: string | null;
  lines: Array<{ inventoryItemId: number; quantityBase: number; displayQuantity: number; displayUnit: InventoryUnit }>;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.transaction(async (tx: Tx) => {
    const [menuItem] = await tx.select().from(menuItems).where(and(eq(menuItems.id, input.menuItemId), eq(menuItems.venueId, input.venueId))).limit(1);
    if (!menuItem) throw new Error("PRODUCTO_NO_ENCONTRADO");
    const items = await tx.select().from(inventoryItems).where(and(eq(inventoryItems.venueId, input.venueId), inArray(inventoryItems.id, input.lines.map((line) => line.inventoryItemId))));
    if (items.length !== input.lines.length) throw new Error("INSUMO_NO_ENCONTRADO");
    const [existing] = await tx.select().from(inventoryRecipes).where(eq(inventoryRecipes.menuItemId, input.menuItemId)).limit(1);
    let recipeId: number;
    if (existing) {
      recipeId = existing.id;
      await tx.update(inventoryRecipes).set({ name: input.name?.trim() || menuItem.name, isActive: true }).where(eq(inventoryRecipes.id, recipeId));
      await tx.delete(inventoryRecipeLines).where(eq(inventoryRecipeLines.recipeId, recipeId));
    } else {
      const inserted = await tx.insert(inventoryRecipes).values({ venueId: input.venueId, menuItemId: input.menuItemId, name: input.name?.trim() || menuItem.name, isActive: true });
      recipeId = Number((inserted[0] as { insertId: number }).insertId);
    }
    await tx.insert(inventoryRecipeLines).values(input.lines.map((line) => ({
      recipeId,
      inventoryItemId: line.inventoryItemId,
      quantityBase: String(line.quantityBase),
      displayQuantity: String(line.displayQuantity),
      displayUnit: line.displayUnit,
    })));
    return { recipeId };
  });
}

/** Se ejecuta dentro de la transacción que cambia un pedido a Entregado. */
export async function applyInventoryForDeliveredOrder(tx: Tx, input: { orderId: number; venueId: number; performedByUserId?: number }) {
  const orderedItems = await tx.select().from(orderItems).where(eq(orderItems.orderId, input.orderId));
  if (!orderedItems.length) return { applied: false, movementCount: 0, lowStockItems: [] as string[] };
  const recipes = await tx.select().from(inventoryRecipes).where(and(eq(inventoryRecipes.venueId, input.venueId), eq(inventoryRecipes.isActive, true)));
  const byMenuItem = new Map<number, typeof inventoryRecipes.$inferSelect>(
    recipes.map((recipe: typeof inventoryRecipes.$inferSelect) => [recipe.menuItemId, recipe])
  );
  const relevantRecipes = recipes.filter((recipe: typeof inventoryRecipes.$inferSelect) => orderedItems.some((item: typeof orderItems.$inferSelect) => item.menuItemId === recipe.menuItemId));
  const recipeLines = relevantRecipes.length ? await tx.select().from(inventoryRecipeLines).where(inArray(inventoryRecipeLines.recipeId, relevantRecipes.map((recipe: typeof inventoryRecipes.$inferSelect) => recipe.id))) : [];
  const consumption = new Map<number, number>();
  for (const orderedItem of orderedItems) {
    const recipe = byMenuItem.get(orderedItem.menuItemId);
    if (!recipe) continue;
    for (const line of recipeLines.filter((candidate: typeof inventoryRecipeLines.$inferSelect) => candidate.recipeId === recipe.id)) {
      consumption.set(line.inventoryItemId, roundBase((consumption.get(line.inventoryItemId) ?? 0) + Number(line.quantityBase) * orderedItem.quantity));
    }
  }
  if (!consumption.size) return { applied: false, movementCount: 0, lowStockItems: [] as string[] };
  const consumedItemIds = Array.from(consumption.keys());
  const existing = await tx.select().from(inventoryMovements).where(and(eq(inventoryMovements.orderId, input.orderId), eq(inventoryMovements.movementType, "order_delivery")));
  if (existing.length) return { applied: false, movementCount: existing.length, lowStockItems: [] as string[], alreadyApplied: true };

  const stockItems = await tx.select().from(inventoryItems).where(and(eq(inventoryItems.venueId, input.venueId), inArray(inventoryItems.id, consumedItemIds)));
  const shortages = stockItems.flatMap((item: typeof inventoryItems.$inferSelect) => {
    const required = consumption.get(item.id) ?? 0;
    const available = Number(item.currentStockBase);
    return available < required ? [{ itemId: item.id, itemName: item.name, available, required, baseUnit: item.baseUnit }] : [];
  });
  if (shortages.length || stockItems.length !== consumedItemIds.length) throw new InventoryStockError(shortages);

  const lowStockItems: string[] = [];
  for (const item of stockItems) {
    const required = consumption.get(item.id) ?? 0;
    const stockAfter = roundBase(Number(item.currentStockBase) - required);
    await tx.update(inventoryItems).set({ currentStockBase: String(stockAfter) }).where(and(eq(inventoryItems.id, item.id), eq(inventoryItems.venueId, input.venueId)));
    await tx.insert(inventoryMovements).values({
      venueId: input.venueId,
      inventoryItemId: item.id,
      movementType: "order_delivery",
      quantityBase: String(-required),
      stockAfterBase: String(stockAfter),
      orderId: input.orderId,
      performedByUserId: input.performedByUserId ?? null,
      note: `Consumo automático del pedido #${input.orderId}`,
    });
    const alert = await syncLowStockAlert(tx, item, stockAfter);
    if (alert.created) lowStockItems.push(item.name);
  }
  return { applied: true, movementCount: consumedItemIds.length, lowStockItems };
}
