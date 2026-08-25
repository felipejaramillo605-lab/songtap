import { and, asc, desc, eq, gt, inArray, lte, sql } from "drizzle-orm";
import {
  inventoryAlerts,
  inventoryAutomationSettings,
  inventoryItems,
  inventoryLots,
  inventoryMovements,
  inventoryPurchaseLines,
  inventoryPurchases,
  inventoryRecipeLines,
  inventoryRecipes,
  inventorySuppliers,
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

function getLotAlertState(expiresAt: Date, alertDays: number, now = new Date()) {
  if (expiresAt.getTime() <= now.getTime()) return "expired" as const;
  const threshold = new Date(now);
  threshold.setDate(threshold.getDate() + alertDays);
  return expiresAt.getTime() <= threshold.getTime() ? "expiring" as const : "none" as const;
}

async function syncLotExpiryAlert(tx: Tx, lot: typeof inventoryLots.$inferSelect, item: typeof inventoryItems.$inferSelect, now = new Date()) {
  const state = getLotAlertState(new Date(lot.expiresAt), item.expiryAlertDays, now);
  if (state === "none" || state === lot.lastAlertState) return state;
  const managers = await tx.select({ id: users.id }).from(users).where(and(eq(users.venueId, lot.venueId), eq(users.role, "manager")));
  const label = state === "expired" ? "Lote vencido" : "Lote próximo a vencer";
  const date = new Intl.DateTimeFormat("es-CO", { dateStyle: "long", timeZone: "America/Bogota" }).format(new Date(lot.expiresAt));
  if (managers.length) {
    await tx.insert(userNotificationHistory).values(managers.map((manager: { id: number }) => ({
      userId: manager.id,
      type: state === "expired" ? "inventory_expired" : "inventory_expiring",
      title: label,
      content: `${item.name}${lot.lotCode ? ` · Lote ${lot.lotCode}` : ""} ${state === "expired" ? "venció" : "vence"} el ${date}. Saldo del lote: ${lot.remainingQuantityBase} ${item.baseUnit}.`,
    })));
  }
  await tx.update(inventoryLots).set({ lastAlertState: state, lastAlertedAt: now }).where(eq(inventoryLots.id, lot.id));
  return state;
}

async function consumeInventoryLots(tx: Tx, item: typeof inventoryItems.$inferSelect, quantityBase: number) {
  const now = new Date();
  const lots = await tx.select().from(inventoryLots).where(and(
    eq(inventoryLots.venueId, item.venueId),
    eq(inventoryLots.inventoryItemId, item.id),
    gt(inventoryLots.remainingQuantityBase, "0"),
  )).orderBy(asc(inventoryLots.expiresAt));
  const lotQuantity = lots.reduce((total: number, lot: typeof inventoryLots.$inferSelect) => total + Number(lot.remainingQuantityBase), 0);
  const usableLotQuantity = lots.filter((lot: typeof inventoryLots.$inferSelect) => new Date(lot.expiresAt).getTime() > now.getTime()).reduce((total: number, lot: typeof inventoryLots.$inferSelect) => total + Number(lot.remainingQuantityBase), 0);
  const untrackedQuantity = Math.max(0, Number(item.currentStockBase) - lotQuantity);
  if (usableLotQuantity + untrackedQuantity < quantityBase) {
    throw new InventoryStockError([{ itemId: item.id, itemName: item.name, available: roundBase(usableLotQuantity + untrackedQuantity), required: quantityBase, baseUnit: item.baseUnit }]);
  }
  let remaining = quantityBase;
  for (const lot of lots) {
    if (remaining <= 0 || new Date(lot.expiresAt).getTime() <= now.getTime()) continue;
    const consumed = Math.min(remaining, Number(lot.remainingQuantityBase));
    await tx.update(inventoryLots).set({ remainingQuantityBase: String(roundBase(Number(lot.remainingQuantityBase) - consumed)) }).where(eq(inventoryLots.id, lot.id));
    remaining = roundBase(remaining - consumed);
  }
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
  isPerishable?: boolean;
  expiryAlertDays?: number;
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
    isPerishable: input.isPerishable ?? false,
    expiryAlertDays: input.expiryAlertDays ?? 7,
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
  isPerishable?: boolean;
  expiryAlertDays?: number;
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
      isPerishable: input.isPerishable ?? item.isPerishable,
      expiryAlertDays: input.expiryAlertDays ?? item.expiryAlertDays,
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

export async function getInventorySuppliers(venueId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(inventorySuppliers).where(eq(inventorySuppliers.venueId, venueId)).orderBy(inventorySuppliers.name);
}

export async function createInventorySupplier(input: {
  venueId: number;
  name: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(inventorySuppliers).values({
    venueId: input.venueId,
    name: input.name,
    contactName: input.contactName?.trim() || null,
    email: input.email?.trim() || null,
    phone: input.phone?.trim() || null,
    address: input.address?.trim() || null,
  });
  const id = Number((result[0] as { insertId: number }).insertId);
  return (await db.select().from(inventorySuppliers).where(eq(inventorySuppliers.id, id)).limit(1))[0];
}

export async function receiveInventoryPurchase(input: {
  venueId: number;
  supplierId?: number | null;
  reference?: string | null;
  receivedAt: Date;
  notes?: string | null;
  createdByUserId: number;
  lines: Array<{
    inventoryItemId: number;
    quantityBase: number;
    sourceQuantity: number;
    sourceUnit: InventoryUnit;
    packBaseQuantity?: number | null;
    unitCost?: number | null;
    lotCode?: string | null;
    expiresAt?: Date | null;
  }>;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.transaction(async (tx: Tx) => {
    if (input.supplierId) {
      const [supplier] = await tx.select().from(inventorySuppliers).where(and(eq(inventorySuppliers.id, input.supplierId), eq(inventorySuppliers.venueId, input.venueId), eq(inventorySuppliers.isActive, true))).limit(1);
      if (!supplier) throw new Error("PROVEEDOR_NO_ENCONTRADO");
    }
    const itemIds = input.lines.map((line) => line.inventoryItemId);
    const items = await tx.select().from(inventoryItems).where(and(eq(inventoryItems.venueId, input.venueId), inArray(inventoryItems.id, itemIds))) as Array<typeof inventoryItems.$inferSelect>;
    if (items.length !== new Set(itemIds).size) throw new Error("INSUMO_NO_ENCONTRADO");
    const itemById = new Map<number, typeof inventoryItems.$inferSelect>(items.map((item) => [item.id, item]));
    for (const line of input.lines) {
      const item = itemById.get(line.inventoryItemId)!;
      if (line.quantityBase <= 0) throw new Error("CANTIDAD_COMPRA_INVALIDA");
      if (item.isPerishable && !line.expiresAt) throw new Error("CADUCIDAD_REQUERIDA");
      if (line.expiresAt && line.expiresAt.getTime() <= input.receivedAt.getTime()) throw new Error("CADUCIDAD_INVALIDA");
    }
    const totalCost = roundBase(input.lines.reduce((total, line) => total + (line.unitCost ?? 0) * line.sourceQuantity, 0));
    const purchaseResult = await tx.insert(inventoryPurchases).values({
      venueId: input.venueId,
      supplierId: input.supplierId || null,
      reference: input.reference?.trim() || null,
      receivedAt: input.receivedAt,
      totalCost: String(totalCost),
      notes: input.notes?.trim() || null,
      createdByUserId: input.createdByUserId,
    });
    const purchaseId = Number((purchaseResult[0] as { insertId: number }).insertId);
    const runningStock = new Map<number, number>(items.map((item: typeof inventoryItems.$inferSelect) => [item.id, Number(item.currentStockBase)]));
    const expiringLots: string[] = [];
    for (const line of input.lines) {
      const item = itemById.get(line.inventoryItemId)!;
      const lineResult = await tx.insert(inventoryPurchaseLines).values({
        purchaseId,
        inventoryItemId: item.id,
        quantityBase: String(roundBase(line.quantityBase)),
        sourceQuantity: String(line.sourceQuantity),
        sourceUnit: line.sourceUnit,
        packBaseQuantity: line.packBaseQuantity ? String(line.packBaseQuantity) : null,
        unitCost: line.unitCost !== undefined && line.unitCost !== null ? String(line.unitCost) : null,
        lotCode: line.lotCode?.trim() || null,
        expiresAt: line.expiresAt || null,
      });
      const purchaseLineId = Number((lineResult[0] as { insertId: number }).insertId);
      const stockAfter = roundBase((runningStock.get(item.id) ?? 0) + line.quantityBase);
      runningStock.set(item.id, stockAfter);
      await tx.update(inventoryItems).set({ currentStockBase: String(stockAfter) }).where(eq(inventoryItems.id, item.id));
      await tx.insert(inventoryMovements).values({
        venueId: input.venueId,
        inventoryItemId: item.id,
        movementType: "restock",
        quantityBase: String(roundBase(line.quantityBase)),
        stockAfterBase: String(stockAfter),
        sourceQuantity: String(line.sourceQuantity),
        sourceUnit: line.sourceUnit,
        packBaseQuantity: line.packBaseQuantity ? String(line.packBaseQuantity) : null,
        performedByUserId: input.createdByUserId,
        note: `Compra #${purchaseId}${input.reference?.trim() ? ` · ${input.reference.trim()}` : ""}`,
      });
      if (line.expiresAt) {
        const lotResult = await tx.insert(inventoryLots).values({
          venueId: input.venueId,
          inventoryItemId: item.id,
          purchaseLineId,
          lotCode: line.lotCode?.trim() || null,
          initialQuantityBase: String(roundBase(line.quantityBase)),
          remainingQuantityBase: String(roundBase(line.quantityBase)),
          expiresAt: line.expiresAt,
          receivedAt: input.receivedAt,
        });
        const lotId = Number((lotResult[0] as { insertId: number }).insertId);
        const lot = (await tx.select().from(inventoryLots).where(eq(inventoryLots.id, lotId)).limit(1))[0];
        if (lot && (await syncLotExpiryAlert(tx, lot, item)) !== "none") expiringLots.push(item.name);
      }
      await syncLowStockAlert(tx, item, stockAfter);
    }
    return { purchaseId, totalCost, expiringLots };
  });
}

export async function getInventoryPurchases(venueId: number) {
  const db = await getDb();
  if (!db) return [];
  const purchases = await db.select().from(inventoryPurchases).where(eq(inventoryPurchases.venueId, venueId)).orderBy(desc(inventoryPurchases.receivedAt)).limit(100);
  const lines = purchases.length ? await db.select().from(inventoryPurchaseLines).where(inArray(inventoryPurchaseLines.purchaseId, purchases.map((purchase) => purchase.id))) : [];
  const suppliers = await getInventorySuppliers(venueId);
  const supplierById = new Map(suppliers.map((supplier) => [supplier.id, supplier]));
  return purchases.map((purchase) => ({ ...purchase, supplier: purchase.supplierId ? supplierById.get(purchase.supplierId) ?? null : null, lines: lines.filter((line) => line.purchaseId === purchase.id) }));
}

export async function getInventoryExpiryAlerts(venueId: number, now = new Date()) {
  const db = await getDb();
  if (!db) return [];
  const lots = await db.select().from(inventoryLots).where(and(eq(inventoryLots.venueId, venueId), gt(inventoryLots.remainingQuantityBase, "0"))).orderBy(asc(inventoryLots.expiresAt));
  const items = await db.select().from(inventoryItems).where(eq(inventoryItems.venueId, venueId));
  const itemById = new Map(items.map((item) => [item.id, item]));
  return lots.flatMap((lot) => {
    const item = itemById.get(lot.inventoryItemId);
    if (!item) return [];
    const state = getLotAlertState(new Date(lot.expiresAt), item.expiryAlertDays, now);
    return state === "none" ? [] : [{ ...lot, item, state }];
  });
}

export async function runInventoryExpiryNotifications(now = new Date()) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.transaction(async (tx: Tx) => {
    const lots = await tx.select().from(inventoryLots).where(gt(inventoryLots.remainingQuantityBase, "0")).orderBy(asc(inventoryLots.expiresAt)) as Array<typeof inventoryLots.$inferSelect>;
    const itemIds = Array.from(new Set<number>(lots.map((lot) => lot.inventoryItemId)));
    const items = itemIds.length ? await tx.select().from(inventoryItems).where(inArray(inventoryItems.id, itemIds)) as Array<typeof inventoryItems.$inferSelect> : [] as Array<typeof inventoryItems.$inferSelect>;
    const itemById = new Map<number, typeof inventoryItems.$inferSelect>(items.map((item) => [item.id, item]));
    let expiring = 0;
    let expired = 0;
    for (const lot of lots) {
      const item = itemById.get(lot.inventoryItemId);
      if (!item) continue;
      const state = await syncLotExpiryAlert(tx, lot, item, now);
      if (state === "expiring") expiring += 1;
      if (state === "expired") expired += 1;
    }
    return { checkedLots: lots.length, expiring, expired };
  });
}

export async function getInventoryAutomationSettingsByTaskUid(taskUid: string) {
  const db = await getDb();
  if (!db) return null;
  return (await db.select().from(inventoryAutomationSettings).where(and(eq(inventoryAutomationSettings.scheduleCronTaskUid, taskUid), eq(inventoryAutomationSettings.isEnabled, true))).limit(1))[0] ?? null;
}

export async function saveInventoryAutomationTask(taskUid: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [existing] = await db.select().from(inventoryAutomationSettings).limit(1);
  if (existing) {
    await db.update(inventoryAutomationSettings).set({ scheduleCronTaskUid: taskUid, isEnabled: true }).where(eq(inventoryAutomationSettings.id, existing.id));
    return existing.id;
  }
  const result = await db.insert(inventoryAutomationSettings).values({ scheduleCronTaskUid: taskUid, isEnabled: true });
  return Number((result[0] as { insertId: number }).insertId);
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
    await consumeInventoryLots(tx, item, required);
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
