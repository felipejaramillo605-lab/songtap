import { and, asc, desc, eq, gt, inArray, lte, sql } from "drizzle-orm";
import {
  inventoryAlerts,
  inventoryAutomationSettings,
  inventoryControlSettings,
  inventoryCountTemplateFamilies,
  inventoryCountTemplates,
  inventoryItems,
  inventoryLots,
  inventoryMovements,
  inventoryPhysicalCountLines,
  inventoryPhysicalCounts,
  inventoryPhysicalCountApprovals,
  inventoryPurchaseLines,
  inventoryPurchaseOrderLines,
  inventoryPurchaseOrders,
  inventoryPurchases,
  inventoryRecipeLines,
  inventoryRecipes,
  inventorySuppliers,
  inventoryWastes,
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
  family?: string | null;
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
    family: input.family?.trim() || null,
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
  family?: string | null;
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
      ...(input.family !== undefined ? { family: input.family?.trim() || null } : {}),
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

export async function createInventoryPurchaseOrder(input: {
  venueId: number;
  supplierId: number;
  reference?: string | null;
  expectedAt?: Date | null;
  notes?: string | null;
  createdByUserId: number;
  lines: Array<{ inventoryItemId: number; quantityOrderedBase: number; sourceQuantity: number; sourceUnit: InventoryUnit; packBaseQuantity?: number | null; estimatedUnitCost?: number | null }>;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.transaction(async (tx: Tx) => {
    const [supplier] = await tx.select().from(inventorySuppliers).where(and(eq(inventorySuppliers.id, input.supplierId), eq(inventorySuppliers.venueId, input.venueId), eq(inventorySuppliers.isActive, true))).limit(1);
    if (!supplier) throw new Error("PROVEEDOR_NO_ENCONTRADO");
    const itemIds = input.lines.map((line) => line.inventoryItemId);
    if (!itemIds.length || new Set(itemIds).size !== itemIds.length) throw new Error("LINEAS_ORDEN_INVALIDAS");
    const items = await tx.select().from(inventoryItems).where(and(eq(inventoryItems.venueId, input.venueId), inArray(inventoryItems.id, itemIds)));
    if (items.length !== itemIds.length || input.lines.some((line) => line.quantityOrderedBase <= 0 || line.sourceQuantity <= 0)) throw new Error("LINEAS_ORDEN_INVALIDAS");
    const result = await tx.insert(inventoryPurchaseOrders).values({ venueId: input.venueId, supplierId: input.supplierId, reference: input.reference?.trim() || null, expectedAt: input.expectedAt || null, notes: input.notes?.trim() || null, createdByUserId: input.createdByUserId });
    const purchaseOrderId = Number((result[0] as { insertId: number }).insertId);
    await tx.insert(inventoryPurchaseOrderLines).values(input.lines.map((line) => ({ purchaseOrderId, inventoryItemId: line.inventoryItemId, quantityOrderedBase: String(roundBase(line.quantityOrderedBase)), sourceQuantity: String(line.sourceQuantity), sourceUnit: line.sourceUnit, packBaseQuantity: line.packBaseQuantity ? String(line.packBaseQuantity) : null, estimatedUnitCost: line.estimatedUnitCost !== undefined && line.estimatedUnitCost !== null ? String(line.estimatedUnitCost) : null })));
    return { purchaseOrderId };
  });
}

export async function getInventoryPurchaseOrders(venueId: number) {
  const db = await getDb();
  if (!db) return [];
  const orders = await db.select().from(inventoryPurchaseOrders).where(eq(inventoryPurchaseOrders.venueId, venueId)).orderBy(desc(inventoryPurchaseOrders.createdAt)).limit(100);
  const lines = orders.length ? await db.select().from(inventoryPurchaseOrderLines).where(inArray(inventoryPurchaseOrderLines.purchaseOrderId, orders.map((order) => order.id))) : [];
  const suppliers = await getInventorySuppliers(venueId);
  const supplierById = new Map(suppliers.map((supplier) => [supplier.id, supplier]));
  return orders.map((order) => ({ ...order, supplier: supplierById.get(order.supplierId) ?? null, lines: lines.filter((line) => line.purchaseOrderId === order.id) }));
}

export async function updateInventoryPurchaseOrderStatus(input: { venueId: number; purchaseOrderId: number; status: "draft" | "sent" | "cancelled" }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const [order] = await db.select().from(inventoryPurchaseOrders).where(and(eq(inventoryPurchaseOrders.id, input.purchaseOrderId), eq(inventoryPurchaseOrders.venueId, input.venueId))).limit(1);
  if (!order) throw new Error("ORDEN_NO_ENCONTRADA");
  if (order.status === "received" || order.status === "partially_received") throw new Error("ORDEN_CON_RECEPCIONES_NO_EDITABLE");
  await db.update(inventoryPurchaseOrders).set({ status: input.status }).where(eq(inventoryPurchaseOrders.id, order.id));
  return { purchaseOrderId: order.id, status: input.status };
}

export async function receiveInventoryPurchase(input: {
  venueId: number;
  supplierId?: number | null;
  purchaseOrderId?: number | null;
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
    purchaseOrderLineId?: number | null;
    lotCode?: string | null;
    expiresAt?: Date | null;
  }>;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.transaction(async (tx: Tx) => {
    let effectiveSupplierId = input.supplierId || null;
    let linkedOrder: typeof inventoryPurchaseOrders.$inferSelect | null = null;
    let linkedOrderLines = new Map<number, typeof inventoryPurchaseOrderLines.$inferSelect>();
    if (input.purchaseOrderId) {
      const [order] = await tx.select().from(inventoryPurchaseOrders).where(and(eq(inventoryPurchaseOrders.id, input.purchaseOrderId), eq(inventoryPurchaseOrders.venueId, input.venueId))).limit(1);
      if (!order || order.status === "cancelled" || order.status === "received") throw new Error("ORDEN_NO_DISPONIBLE");
      if (effectiveSupplierId && effectiveSupplierId !== order.supplierId) throw new Error("PROVEEDOR_NO_COINCIDE_CON_ORDEN");
      linkedOrder = order;
      effectiveSupplierId = order.supplierId;
      const orderLines = await tx.select().from(inventoryPurchaseOrderLines).where(eq(inventoryPurchaseOrderLines.purchaseOrderId, order.id));
      linkedOrderLines = new Map(orderLines.map((line: typeof inventoryPurchaseOrderLines.$inferSelect) => [line.id, line]));
    }
    if (effectiveSupplierId) {
      const [supplier] = await tx.select().from(inventorySuppliers).where(and(eq(inventorySuppliers.id, effectiveSupplierId), eq(inventorySuppliers.venueId, input.venueId), eq(inventorySuppliers.isActive, true))).limit(1);
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
      if (linkedOrder) {
        const orderLine = line.purchaseOrderLineId ? linkedOrderLines.get(line.purchaseOrderLineId) : null;
        if (!orderLine || orderLine.inventoryItemId !== item.id || line.quantityBase > roundBase(Number(orderLine.quantityOrderedBase) - Number(orderLine.quantityReceivedBase))) throw new Error("RECEPCION_ORDEN_INVALIDA");
      }
    }
    const totalCost = roundBase(input.lines.reduce((total, line) => total + (line.unitCost ?? 0) * line.sourceQuantity, 0));
    const purchaseResult = await tx.insert(inventoryPurchases).values({
      venueId: input.venueId,
      supplierId: effectiveSupplierId,
      purchaseOrderId: input.purchaseOrderId || null,
      reference: input.reference?.trim() || null,
      receivedAt: input.receivedAt,
      totalCost: String(totalCost),
      notes: input.notes?.trim() || null,
      createdByUserId: input.createdByUserId,
    });
    const purchaseId = Number((purchaseResult[0] as { insertId: number }).insertId);
    const runningStock = new Map<number, number>(items.map((item: typeof inventoryItems.$inferSelect) => [item.id, Number(item.currentStockBase)]));
    const runningValue = new Map<number, number>(items.map((item: typeof inventoryItems.$inferSelect) => [item.id, roundBase(Number(item.currentStockBase) * Number(item.averageUnitCostBase))]));
    const expiringLots: string[] = [];
    for (const line of input.lines) {
      const item = itemById.get(line.inventoryItemId)!;
      const lineResult = await tx.insert(inventoryPurchaseLines).values({
        purchaseId,
        purchaseOrderLineId: line.purchaseOrderLineId || null,
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
      const stockBefore = runningStock.get(item.id) ?? 0;
      const receivedCost = roundBase((line.unitCost ?? 0) * line.sourceQuantity);
      const receivedUnitCostBase = line.quantityBase > 0 ? roundBase(receivedCost / line.quantityBase) : 0;
      const stockAfter = roundBase(stockBefore + line.quantityBase);
      const valueAfter = roundBase((runningValue.get(item.id) ?? 0) + receivedCost);
      const averageUnitCostBase = stockAfter > 0 ? roundBase(valueAfter / stockAfter) : 0;
      runningStock.set(item.id, stockAfter);
      runningValue.set(item.id, valueAfter);
      await tx.update(inventoryItems).set({ currentStockBase: String(stockAfter), averageUnitCostBase: String(averageUnitCostBase) }).where(eq(inventoryItems.id, item.id));
      await tx.insert(inventoryMovements).values({
        venueId: input.venueId,
        inventoryItemId: item.id,
        movementType: "restock",
        quantityBase: String(roundBase(line.quantityBase)),
        stockAfterBase: String(stockAfter),
        sourceQuantity: String(line.sourceQuantity),
        sourceUnit: line.sourceUnit,
        packBaseQuantity: line.packBaseQuantity ? String(line.packBaseQuantity) : null,
        unitCostBase: String(receivedUnitCostBase),
        totalCost: String(receivedCost),
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
      if (linkedOrder && line.purchaseOrderLineId) {
        const orderLine = linkedOrderLines.get(line.purchaseOrderLineId)!;
        const receivedAfter = roundBase(Number(orderLine.quantityReceivedBase) + line.quantityBase);
        await tx.update(inventoryPurchaseOrderLines).set({ quantityReceivedBase: String(receivedAfter) }).where(eq(inventoryPurchaseOrderLines.id, orderLine.id));
        linkedOrderLines.set(orderLine.id, { ...orderLine, quantityReceivedBase: String(receivedAfter) });
      }
    }
    if (linkedOrder) {
      const allReceived = Array.from(linkedOrderLines.values()).every((line) => Number(line.quantityReceivedBase) >= Number(line.quantityOrderedBase));
      await tx.update(inventoryPurchaseOrders).set({ status: allReceived ? "received" : "partially_received" }).where(eq(inventoryPurchaseOrders.id, linkedOrder.id));
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

export async function recordExpiredInventoryWaste(input: {
  venueId: number;
  inventoryLotId: number;
  quantityBase: number;
  performedByUserId: number;
  note?: string | null;
  now?: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.transaction(async (tx: Tx) => {
    const now = input.now ?? new Date();
    const [lot] = await tx.select().from(inventoryLots).where(and(eq(inventoryLots.id, input.inventoryLotId), eq(inventoryLots.venueId, input.venueId))).limit(1);
    if (!lot) throw new Error("LOTE_NO_ENCONTRADO");
    if (new Date(lot.expiresAt).getTime() > now.getTime()) throw new Error("LOTE_AUN_VIGENTE");
    const quantityBase = roundBase(input.quantityBase);
    if (quantityBase <= 0 || quantityBase > Number(lot.remainingQuantityBase)) throw new Error("CANTIDAD_MERMA_INVALIDA");
    const [item] = await tx.select().from(inventoryItems).where(and(eq(inventoryItems.id, lot.inventoryItemId), eq(inventoryItems.venueId, input.venueId))).limit(1);
    if (!item) throw new Error("INSUMO_NO_ENCONTRADO");
    if (Number(item.currentStockBase) < quantityBase) throw new Error("STOCK_INSUFICIENTE");
    const lotAfter = roundBase(Number(lot.remainingQuantityBase) - quantityBase);
    const stockAfter = roundBase(Number(item.currentStockBase) - quantityBase);
    const unitCostBase = Number(item.averageUnitCostBase);
    const totalCost = roundBase(quantityBase * unitCostBase);
    await tx.update(inventoryLots).set({ remainingQuantityBase: String(lotAfter) }).where(eq(inventoryLots.id, lot.id));
    await tx.update(inventoryItems).set({ currentStockBase: String(stockAfter) }).where(eq(inventoryItems.id, item.id));
    const wasteResult = await tx.insert(inventoryWastes).values({ venueId: input.venueId, inventoryItemId: item.id, inventoryLotId: lot.id, quantityBase: String(quantityBase), unitCostBase: String(unitCostBase), totalCost: String(totalCost), reason: "expired", note: input.note?.trim() || null, performedByUserId: input.performedByUserId });
    const wasteId = Number((wasteResult[0] as { insertId: number }).insertId);
    await tx.insert(inventoryMovements).values({ venueId: input.venueId, inventoryItemId: item.id, movementType: "waste", quantityBase: String(-quantityBase), stockAfterBase: String(stockAfter), unitCostBase: String(unitCostBase), totalCost: String(totalCost), performedByUserId: input.performedByUserId, note: `Merma por vencimiento · Lote ${lot.lotCode || `#${lot.id}`}${input.note?.trim() ? ` · ${input.note.trim()}` : ""}` });
    await syncLowStockAlert(tx, item, stockAfter);
    return { wasteId, itemName: item.name, quantityBase, unitCostBase, totalCost, stockAfter, lotAfter };
  });
}

export async function getInventoryWastes(venueId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(inventoryWastes).where(eq(inventoryWastes.venueId, venueId)).orderBy(desc(inventoryWastes.createdAt)).limit(100);
}

export async function createInventoryPhysicalCount(input: { venueId: number; createdByUserId: number; notes?: string | null; templateId?: number | null }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.transaction(async (tx: Tx) => {
    const [openCount] = await tx.select({ id: inventoryPhysicalCounts.id }).from(inventoryPhysicalCounts).where(and(eq(inventoryPhysicalCounts.venueId, input.venueId), inArray(inventoryPhysicalCounts.status, ["draft", "in_progress", "pending_approval", "ready_to_reconcile"]))).limit(1);
    if (openCount) throw new Error("CONTEO_ACTIVO_EXISTENTE");
    let templateFamilies: string[] | null = null;
    if (input.templateId) {
      const [template] = await tx.select().from(inventoryCountTemplates).where(and(eq(inventoryCountTemplates.id, input.templateId), eq(inventoryCountTemplates.venueId, input.venueId), eq(inventoryCountTemplates.isActive, true))).limit(1);
      if (!template) throw new Error("PLANTILLA_CONTEO_NO_ENCONTRADA");
      const selectedFamilies = (await tx.select().from(inventoryCountTemplateFamilies).where(eq(inventoryCountTemplateFamilies.templateId, template.id))).map((row: typeof inventoryCountTemplateFamilies.$inferSelect) => row.family);
      if (!selectedFamilies.length) throw new Error("PLANTILLA_CONTEO_SIN_FAMILIAS");
      templateFamilies = selectedFamilies;
    }
    const allActiveItems = await tx.select().from(inventoryItems).where(and(eq(inventoryItems.venueId, input.venueId), eq(inventoryItems.isActive, true)));
    const activeItems = templateFamilies ? allActiveItems.filter((item: typeof inventoryItems.$inferSelect) => Boolean(item.family && templateFamilies!.includes(item.family))) : allActiveItems;
    if (!activeItems.length) throw new Error("CONTEO_SIN_INSUMOS");
    const result = await tx.insert(inventoryPhysicalCounts).values({ venueId: input.venueId, status: "in_progress", notes: input.notes?.trim() || null, templateId: input.templateId || null, createdByUserId: input.createdByUserId, startedAt: new Date() });
    const physicalCountId = Number((result[0] as { insertId: number }).insertId);
    await tx.insert(inventoryPhysicalCountLines).values(activeItems.map((item: typeof inventoryItems.$inferSelect) => ({ physicalCountId, inventoryItemId: item.id, systemStockBase: String(item.currentStockBase), unitCostBaseSnapshot: String(item.averageUnitCostBase) })));
    return { physicalCountId, itemCount: activeItems.length };
  });
}

export async function getInventoryPhysicalCounts(venueId: number) {
  const db = await getDb();
  if (!db) return [];
  const counts = await db.select().from(inventoryPhysicalCounts).where(eq(inventoryPhysicalCounts.venueId, venueId)).orderBy(desc(inventoryPhysicalCounts.createdAt)).limit(50);
  const lines = counts.length ? await db.select().from(inventoryPhysicalCountLines).where(inArray(inventoryPhysicalCountLines.physicalCountId, counts.map((count) => count.id))) : [];
  const approvals = counts.length ? await db.select().from(inventoryPhysicalCountApprovals).where(inArray(inventoryPhysicalCountApprovals.physicalCountId, counts.map((count) => count.id))) : [];
  const itemIds = Array.from(new Set(lines.map((line) => line.inventoryItemId)));
  const items = itemIds.length ? await db.select().from(inventoryItems).where(and(eq(inventoryItems.venueId, venueId), inArray(inventoryItems.id, itemIds))) : [];
  const itemById = new Map(items.map((item) => [item.id, item]));
  return counts.map((count) => ({ ...count, approval: approvals.find((approval) => approval.physicalCountId === count.id) ?? null, lines: lines.filter((line) => line.physicalCountId === count.id).map((line) => ({ ...line, item: itemById.get(line.inventoryItemId) ?? null })) }));
}

export async function updateInventoryPhysicalCountLine(input: { venueId: number; physicalCountId: number; inventoryItemId: number; physicalStockBase: number; countedByUserId: number; note?: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.transaction(async (tx: Tx) => {
    const [count] = await tx.select().from(inventoryPhysicalCounts).where(and(eq(inventoryPhysicalCounts.id, input.physicalCountId), eq(inventoryPhysicalCounts.venueId, input.venueId))).limit(1);
    if (!count) throw new Error("CONTEO_NO_ENCONTRADO");
    if (count.status !== "draft" && count.status !== "in_progress") throw new Error("CONTEO_NO_EDITABLE");
    const [line] = await tx.select().from(inventoryPhysicalCountLines).where(and(eq(inventoryPhysicalCountLines.physicalCountId, count.id), eq(inventoryPhysicalCountLines.inventoryItemId, input.inventoryItemId))).limit(1);
    if (!line) throw new Error("LINEA_CONTEO_NO_ENCONTRADA");
    const physicalStockBase = roundBase(input.physicalStockBase);
    if (physicalStockBase < 0) throw new Error("CANTIDAD_CONTEO_INVALIDA");
    const varianceBase = roundBase(physicalStockBase - Number(line.systemStockBase));
    const varianceCost = roundBase(Math.abs(varianceBase) * Number(line.unitCostBaseSnapshot));
    await tx.update(inventoryPhysicalCountLines).set({ physicalStockBase: String(physicalStockBase), varianceBase: String(varianceBase), varianceCost: String(varianceCost), countedByUserId: input.countedByUserId, countedAt: new Date(), note: input.note?.trim() || null }).where(eq(inventoryPhysicalCountLines.id, line.id));
    return { lineId: line.id, systemStockBase: Number(line.systemStockBase), physicalStockBase, varianceBase, varianceCost };
  });
}

export async function submitInventoryPhysicalCount(input: { venueId: number; physicalCountId: number; submittedByUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.transaction(async (tx: Tx) => {
    const [count] = await tx.select().from(inventoryPhysicalCounts).where(and(eq(inventoryPhysicalCounts.id, input.physicalCountId), eq(inventoryPhysicalCounts.venueId, input.venueId))).limit(1);
    if (!count) throw new Error("CONTEO_NO_ENCONTRADO");
    if (count.status !== "draft" && count.status !== "in_progress") throw new Error("CONTEO_NO_EDITABLE");
    const lines = await tx.select().from(inventoryPhysicalCountLines).where(eq(inventoryPhysicalCountLines.physicalCountId, count.id));
    if (!lines.length || lines.some((line: typeof inventoryPhysicalCountLines.$inferSelect) => line.physicalStockBase === null)) throw new Error("CONTEO_INCOMPLETO");
    const totalVarianceCost = roundBase(lines.reduce((sum: number, line: typeof inventoryPhysicalCountLines.$inferSelect) => sum + Number(line.varianceCost), 0));
    const [settings] = await tx.select().from(inventoryControlSettings).where(eq(inventoryControlSettings.venueId, input.venueId)).limit(1);
    const thresholdCost = Number(settings?.dualApprovalThresholdCost ?? 0);
    const approvalRequired = Boolean(settings?.dualApprovalEnabled && totalVarianceCost > 0 && totalVarianceCost > thresholdCost);
    const status = approvalRequired ? "pending_approval" : "ready_to_reconcile";
    await tx.update(inventoryPhysicalCounts).set({ status, submittedAt: new Date(), submittedByUserId: input.submittedByUserId, totalVarianceCost: String(totalVarianceCost), approvalRequired, approvalThresholdCost: approvalRequired ? String(thresholdCost) : null }).where(eq(inventoryPhysicalCounts.id, count.id));
    if (approvalRequired) {
      const managers = await tx.select({ id: users.id }).from(users).where(and(eq(users.venueId, input.venueId), eq(users.role, "manager")));
      const eligibleManagerIds = managers.map((manager: { id: number }) => manager.id).filter((managerId: number) => managerId !== count.createdByUserId && managerId !== input.submittedByUserId);
      if (eligibleManagerIds.length) {
        await tx.insert(userNotificationHistory).values(eligibleManagerIds.map((userId: number) => ({
          userId,
          type: "inventory_approval_pending",
          title: "Aprobación de inventario pendiente",
          content: `El conteo físico #${count.id} requiere tu decisión antes de conciliar. Diferencia valorada: $${Math.round(totalVarianceCost).toLocaleString("es-CO")}; umbral del local: $${Math.round(thresholdCost).toLocaleString("es-CO")}.`,
        })));
      }
    }
    return { physicalCountId: count.id, differenceCount: lines.filter((line: typeof inventoryPhysicalCountLines.$inferSelect) => Number(line.varianceBase ?? 0) !== 0).length, totalVarianceCost, approvalRequired };
  });
}

export async function getInventoryControlSettings(venueId: number) {
  const db = await getDb();
  if (!db) return { venueId, dualApprovalEnabled: false, dualApprovalThresholdCost: "0" };
  return (await db.select().from(inventoryControlSettings).where(eq(inventoryControlSettings.venueId, venueId)).limit(1))[0] ?? { venueId, dualApprovalEnabled: false, dualApprovalThresholdCost: "0" };
}

export async function saveInventoryControlSettings(input: { venueId: number; dualApprovalEnabled: boolean; dualApprovalThresholdCost: number }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const threshold = roundBase(input.dualApprovalThresholdCost);
  if (threshold < 0) throw new Error("UMBRAL_APROBACION_INVALIDO");
  const [existing] = await db.select().from(inventoryControlSettings).where(eq(inventoryControlSettings.venueId, input.venueId)).limit(1);
  if (existing) await db.update(inventoryControlSettings).set({ dualApprovalEnabled: input.dualApprovalEnabled, dualApprovalThresholdCost: String(threshold) }).where(eq(inventoryControlSettings.id, existing.id));
  else await db.insert(inventoryControlSettings).values({ venueId: input.venueId, dualApprovalEnabled: input.dualApprovalEnabled, dualApprovalThresholdCost: String(threshold) });
  return getInventoryControlSettings(input.venueId);
}

export async function getInventoryCountTemplates(venueId: number) {
  const db = await getDb();
  if (!db) return [];
  const templates = await db.select().from(inventoryCountTemplates).where(eq(inventoryCountTemplates.venueId, venueId)).orderBy(desc(inventoryCountTemplates.createdAt));
  const families = templates.length ? await db.select().from(inventoryCountTemplateFamilies).where(inArray(inventoryCountTemplateFamilies.templateId, templates.map((template) => template.id))) : [];
  return templates.map((template) => ({ ...template, families: families.filter((family) => family.templateId === template.id).map((family) => family.family) }));
}

export async function saveInventoryCountTemplate(input: { venueId: number; templateId?: number | null; name: string; families: string[]; isActive?: boolean; createdByUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const name = input.name.trim();
  const families = Array.from(new Set(input.families.map((family) => family.trim()).filter(Boolean)));
  if (!name || !families.length) throw new Error("PLANTILLA_CONTEO_INVALIDA");
  return db.transaction(async (tx: Tx) => {
    let templateId = input.templateId ?? null;
    if (templateId) {
      const [template] = await tx.select().from(inventoryCountTemplates).where(and(eq(inventoryCountTemplates.id, templateId), eq(inventoryCountTemplates.venueId, input.venueId))).limit(1);
      if (!template) throw new Error("PLANTILLA_CONTEO_NO_ENCONTRADA");
      await tx.update(inventoryCountTemplates).set({ name, isActive: input.isActive ?? template.isActive }).where(eq(inventoryCountTemplates.id, template.id));
      await tx.delete(inventoryCountTemplateFamilies).where(eq(inventoryCountTemplateFamilies.templateId, template.id));
    } else {
      const result = await tx.insert(inventoryCountTemplates).values({ venueId: input.venueId, name, isActive: input.isActive ?? true, createdByUserId: input.createdByUserId });
      templateId = Number((result[0] as { insertId: number }).insertId);
    }
    await tx.insert(inventoryCountTemplateFamilies).values(families.map((family) => ({ templateId: templateId!, family })));
    return { templateId, familyCount: families.length };
  });
}

export async function decideInventoryPhysicalCountApproval(input: { venueId: number; physicalCountId: number; approverUserId: number; approved: boolean; note?: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.transaction(async (tx: Tx) => {
    const [count] = await tx.select().from(inventoryPhysicalCounts).where(and(eq(inventoryPhysicalCounts.id, input.physicalCountId), eq(inventoryPhysicalCounts.venueId, input.venueId))).limit(1);
    if (!count) throw new Error("CONTEO_NO_ENCONTRADO");
    if (count.status !== "pending_approval" || !count.approvalRequired) throw new Error("CONTEO_NO_REQUIERE_APROBACION");
    if (count.createdByUserId === input.approverUserId || count.submittedByUserId === input.approverUserId) throw new Error("APROBADOR_DEBE_SER_DISTINTO");
    const [existing] = await tx.select().from(inventoryPhysicalCountApprovals).where(eq(inventoryPhysicalCountApprovals.physicalCountId, count.id)).limit(1);
    if (existing) throw new Error("CONTEO_YA_APROBADO");
    const status = input.approved ? "approved" : "rejected";
    await tx.insert(inventoryPhysicalCountApprovals).values({ venueId: input.venueId, physicalCountId: count.id, status, approverUserId: input.approverUserId, totalVarianceCost: count.totalVarianceCost, thresholdCost: count.approvalThresholdCost ?? "0", note: input.note?.trim() || null });
    await tx.update(inventoryPhysicalCounts).set({ status: input.approved ? "ready_to_reconcile" : "rejected", approvalDecisionAt: new Date(), approvalDecisionByUserId: input.approverUserId }).where(eq(inventoryPhysicalCounts.id, count.id));
    return { physicalCountId: count.id, status, totalVarianceCost: Number(count.totalVarianceCost) };
  });
}

export async function getInventoryCountMetrics(venueId: number, now = new Date()) {
  const db = await getDb();
  const empty = { reconciledLast30Days: 0, daysSinceLastCount: null as number | null, averageDaysBetweenCounts: null as number | null, totalVarianceCostLast30Days: 0, deviationRateLast30Days: null as number | null };
  if (!db) return empty;
  const counts = await db.select().from(inventoryPhysicalCounts).where(and(eq(inventoryPhysicalCounts.venueId, venueId), eq(inventoryPhysicalCounts.status, "reconciled"))).orderBy(desc(inventoryPhysicalCounts.reconciledAt)).limit(50);
  if (!counts.length) return empty;
  const dayMs = 24 * 60 * 60 * 1000;
  const lastReconciledAt = new Date(counts[0].reconciledAt ?? counts[0].createdAt);
  const start30Days = new Date(now.getTime() - 30 * dayMs);
  const recentCounts = counts.filter((count) => new Date(count.reconciledAt ?? count.createdAt) >= start30Days);
  const recentLines = recentCounts.length ? await db.select().from(inventoryPhysicalCountLines).where(inArray(inventoryPhysicalCountLines.physicalCountId, recentCounts.map((count) => count.id))) : [];
  const totalVarianceCostLast30Days = roundBase(recentLines.reduce((sum, line) => sum + Number(line.varianceCost), 0));
  const systemValueLast30Days = recentLines.reduce((sum, line) => sum + Math.abs(Number(line.systemStockBase) * Number(line.unitCostBaseSnapshot)), 0);
  const intervals = counts.slice(0, -1).map((count, index) => (new Date(count.reconciledAt ?? count.createdAt).getTime() - new Date(counts[index + 1].reconciledAt ?? counts[index + 1].createdAt).getTime()) / dayMs).filter((value) => value >= 0);
  return { reconciledLast30Days: recentCounts.length, daysSinceLastCount: roundBase((now.getTime() - lastReconciledAt.getTime()) / dayMs), averageDaysBetweenCounts: intervals.length ? roundBase(intervals.reduce((sum, value) => sum + value, 0) / intervals.length) : null, totalVarianceCostLast30Days, deviationRateLast30Days: systemValueLast30Days > 0 ? roundBase((totalVarianceCostLast30Days / systemValueLast30Days) * 100) : null };
}

async function reduceLotsForPhysicalVariance(tx: Tx, item: typeof inventoryItems.$inferSelect, amount: number) {
  let remaining = amount;
  const lots = await tx.select().from(inventoryLots).where(and(eq(inventoryLots.venueId, item.venueId), eq(inventoryLots.inventoryItemId, item.id), gt(inventoryLots.remainingQuantityBase, "0"))).orderBy(asc(inventoryLots.expiresAt));
  for (const lot of lots) {
    if (remaining <= 0) break;
    const reduction = Math.min(remaining, Number(lot.remainingQuantityBase));
    await tx.update(inventoryLots).set({ remainingQuantityBase: String(roundBase(Number(lot.remainingQuantityBase) - reduction)) }).where(eq(inventoryLots.id, lot.id));
    remaining = roundBase(remaining - reduction);
  }
}

export async function reconcileInventoryPhysicalCount(input: { venueId: number; physicalCountId: number; reconciledByUserId: number }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.transaction(async (tx: Tx) => {
    const [count] = await tx.select().from(inventoryPhysicalCounts).where(and(eq(inventoryPhysicalCounts.id, input.physicalCountId), eq(inventoryPhysicalCounts.venueId, input.venueId))).limit(1);
    if (!count) throw new Error("CONTEO_NO_ENCONTRADO");
    if (count.status !== "ready_to_reconcile") throw new Error("CONTEO_NO_CONCILIABLE");
    const lines = await tx.select().from(inventoryPhysicalCountLines).where(eq(inventoryPhysicalCountLines.physicalCountId, count.id));
    if (!lines.length || lines.some((line: typeof inventoryPhysicalCountLines.$inferSelect) => line.physicalStockBase === null)) throw new Error("CONTEO_INCOMPLETO");
    const itemIds = lines.map((line: typeof inventoryPhysicalCountLines.$inferSelect) => line.inventoryItemId);
    const items = await tx.select().from(inventoryItems).where(and(eq(inventoryItems.venueId, input.venueId), inArray(inventoryItems.id, itemIds))) as Array<typeof inventoryItems.$inferSelect>;
    if (items.length !== itemIds.length) throw new Error("INSUMO_NO_ENCONTRADO");
    const itemById = new Map(items.map((item) => [item.id, item]));
    const stale = lines.find((line: typeof inventoryPhysicalCountLines.$inferSelect) => Number(itemById.get(line.inventoryItemId)?.currentStockBase) !== Number(line.systemStockBase));
    if (stale) throw new Error("CONTEO_DESACTUALIZADO");
    let adjustmentCount = 0;
    for (const line of lines) {
      const varianceBase = Number(line.varianceBase ?? 0);
      if (varianceBase === 0) continue;
      const item = itemById.get(line.inventoryItemId)!;
      const stockAfter = Number(line.physicalStockBase);
      if (varianceBase < 0) await reduceLotsForPhysicalVariance(tx, item, Math.abs(varianceBase));
      await tx.update(inventoryItems).set({ currentStockBase: String(stockAfter) }).where(eq(inventoryItems.id, item.id));
      await tx.insert(inventoryMovements).values({ venueId: input.venueId, inventoryItemId: item.id, movementType: "adjustment", quantityBase: String(varianceBase), stockAfterBase: String(stockAfter), unitCostBase: String(item.averageUnitCostBase), totalCost: String(roundBase(Math.abs(varianceBase) * Number(item.averageUnitCostBase))), performedByUserId: input.reconciledByUserId, note: `Conciliación de conteo físico #${count.id}${line.note ? ` · ${line.note}` : ""}` });
      await syncLowStockAlert(tx, item, stockAfter);
      adjustmentCount += 1;
    }
    await tx.update(inventoryPhysicalCounts).set({ status: "reconciled", reconciledAt: new Date(), reconciledByUserId: input.reconciledByUserId }).where(eq(inventoryPhysicalCounts.id, count.id));
    return { physicalCountId: count.id, adjustmentCount };
  });
}

export async function getRecipeCostMargins(venueId: number) {
  const db = await getDb();
  if (!db) return [];
  const recipes = await getInventoryRecipes(venueId);
  const items = await db.select().from(inventoryItems).where(eq(inventoryItems.venueId, venueId));
  const products = await db.select({ id: menuItems.id, name: menuItems.name, price: menuItems.price }).from(menuItems).where(eq(menuItems.venueId, venueId));
  const itemById = new Map(items.map((item) => [item.id, item]));
  const productById = new Map(products.map((product) => [product.id, product]));
  return recipes.map((recipe) => {
    const product = productById.get(recipe.menuItemId);
    const recipeCost = roundBase(recipe.lines.reduce((sum, line) => sum + Number(line.quantityBase) * Number(itemById.get(line.inventoryItemId)?.averageUnitCostBase ?? 0), 0));
    const salePrice = Number(product?.price ?? 0);
    const marginAmount = roundBase(salePrice - recipeCost);
    return { recipeId: recipe.id, menuItemId: recipe.menuItemId, name: product?.name ?? recipe.name ?? `Producto #${recipe.menuItemId}`, salePrice, recipeCost, marginAmount, marginPercent: salePrice > 0 ? roundBase((marginAmount / salePrice) * 100) : null, isCosted: recipe.lines.every((line) => Number(itemById.get(line.inventoryItemId)?.averageUnitCostBase ?? 0) > 0) };
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
      unitCostBase: String(Number(item.averageUnitCostBase)),
      totalCost: String(roundBase(required * Number(item.averageUnitCostBase))),
      performedByUserId: input.performedByUserId ?? null,
      note: `Consumo automático del pedido #${input.orderId}`,
    });
    const alert = await syncLowStockAlert(tx, item, stockAfter);
    if (alert.created) lowStockItems.push(item.name);
  }
  return { applied: true, movementCount: consumedItemIds.length, lowStockItems };
}
