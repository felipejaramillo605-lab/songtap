import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  auditLogs,
  InsertUser,
  menuCategories,
  menuItems,
  musicRequests,
  orderItems,
  orderStatusHistory,
  orders,
  qrSessions,
  tables,
  users,
  venues,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── USERS ────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;

  for (const field of textFields) {
    const value = user[field];
    if (value === undefined) continue;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  }

  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "owner";
    updateSet.role = "owner";
  }

  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).orderBy(desc(users.createdAt));
}

export async function getUsersByVenue(venueId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(users).where(eq(users.venueId, venueId));
}

export async function updateUserRole(userId: number, role: "owner" | "manager" | "staff" | "user", venueId?: number | null) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ role, venueId: venueId ?? null }).where(eq(users.id, userId));
}

// ─── VENUES ───────────────────────────────────────────────────────────────────

export async function getAllVenues() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(venues).orderBy(desc(venues.createdAt));
}

export async function getVenueById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(venues).where(eq(venues.id, id)).limit(1);
  return result[0];
}

export async function createVenue(data: typeof venues.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(venues).values(data);
  return result[0];
}

export async function updateVenue(id: number, data: Partial<typeof venues.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(venues).set(data).where(eq(venues.id, id));
}

// ─── TABLES (MESAS) ───────────────────────────────────────────────────────────

export async function getTablesByVenue(venueId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tables).where(eq(tables.venueId, venueId)).orderBy(tables.name);
}

export async function getTableByToken(qrToken: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(tables).where(eq(tables.qrToken, qrToken)).limit(1);
  return result[0];
}

export async function createTable(data: typeof tables.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(tables).values(data);
}

export async function updateTable(id: number, data: Partial<typeof tables.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(tables).set(data).where(eq(tables.id, id));
}

export async function deleteTable(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(tables).where(eq(tables.id, id));
}

// ─── QR SESSIONS ──────────────────────────────────────────────────────────────

export async function createQrSession(data: typeof qrSessions.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(qrSessions).values(data);
}

export async function getQrSessionByToken(sessionToken: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(qrSessions).where(eq(qrSessions.sessionToken, sessionToken)).limit(1);
  return result[0];
}

export async function closeQrSession(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(qrSessions).set({ isActive: false, closedAt: new Date() }).where(eq(qrSessions.id, id));
}

// ─── MENU CATEGORIES ──────────────────────────────────────────────────────────

export async function getCategoriesByVenue(venueId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(menuCategories).where(and(eq(menuCategories.venueId, venueId), eq(menuCategories.isActive, true))).orderBy(menuCategories.sortOrder);
}

export async function createCategory(data: typeof menuCategories.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(menuCategories).values(data);
}

export async function updateCategory(id: number, data: Partial<typeof menuCategories.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(menuCategories).set(data).where(eq(menuCategories.id, id));
}

export async function deleteCategory(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(menuCategories).set({ isActive: false }).where(eq(menuCategories.id, id));
}

// ─── MENU ITEMS ───────────────────────────────────────────────────────────────

export async function getItemsByVenue(venueId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(menuItems).where(eq(menuItems.venueId, venueId)).orderBy(menuItems.sortOrder);
}

export async function getItemsByCategory(categoryId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(menuItems).where(and(eq(menuItems.categoryId, categoryId), eq(menuItems.isAvailable, true))).orderBy(menuItems.sortOrder);
}

export async function createMenuItem(data: typeof menuItems.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(menuItems).values(data);
}

export async function updateMenuItem(id: number, data: Partial<typeof menuItems.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(menuItems).set(data).where(eq(menuItems.id, id));
}

export async function deleteMenuItem(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(menuItems).set({ isAvailable: false }).where(eq(menuItems.id, id));
}

// ─── ORDERS ───────────────────────────────────────────────────────────────────

export async function getOrdersByVenue(venueId: number, status?: string) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(orders.venueId, venueId)];
  if (status) conditions.push(eq(orders.status, status as "pending" | "preparing" | "delivered" | "cancelled"));
  return db.select().from(orders).where(and(...conditions)).orderBy(orders.createdAt);
}

export async function getOrdersBySession(sessionId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orders).where(eq(orders.sessionId, sessionId)).orderBy(desc(orders.createdAt));
}

export async function getOrderWithItems(orderId: number) {
  const db = await getDb();
  if (!db) return null;
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return null;
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  return { ...order, items };
}

export async function createOrder(data: typeof orders.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(orders).values(data);
  return result[0];
}

export async function createOrderItems(data: (typeof orderItems.$inferInsert)[]) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  if (data.length === 0) return;
  await db.insert(orderItems).values(data);
}

export async function updateOrderStatus(
  id: number,
  status: "pending" | "preparing" | "delivered" | "cancelled",
  handledByUserId?: number,
  cancelReason?: string,
  changedByUserName?: string
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  
  // Obtener el estado anterior
  const [currentOrder] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  const previousStatus = currentOrder?.status;
  
  const update: Record<string, unknown> = { status };
  if (handledByUserId) update.handledByUserId = handledByUserId;
  if (status === "delivered") update.completedAt = new Date();
  if (status === "cancelled") {
    update.cancelledAt = new Date();
    if (cancelReason) update.cancelReason = cancelReason;
  }
  await db.update(orders).set(update).where(eq(orders.id, id));
  
  // Crear log de cambio de estado
  if (handledByUserId && previousStatus !== status) {
    await createOrderStatusHistory({
      orderId: id,
      previousStatus: previousStatus as any,
      newStatus: status,
      changedByUserId: handledByUserId,
      changedByUserName: changedByUserName,
      reason: cancelReason,
    });
  }
}

export async function createOrderStatusHistory(data: typeof orderStatusHistory.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(orderStatusHistory).values(data);
}

export async function getOrderStatusHistory(orderId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orderStatusHistory).where(eq(orderStatusHistory.orderId, orderId)).orderBy(desc(orderStatusHistory.createdAt));
}

// ─── FINANCE ──────────────────────────────────────────────────────────────────

export async function getFinanceSummary(venueId: number, dateFrom: Date, dateTo: Date) {
  const db = await getDb();
  if (!db) return { revenue: 0, cost: 0, profit: 0, orderCount: 0 };

  const result = await db
    .select({
      revenue: sql<number>`COALESCE(SUM(CAST(${orders.totalAmount} AS DECIMAL(10,2))), 0)`,
      cost: sql<number>`COALESCE(SUM(CAST(${orders.totalCost} AS DECIMAL(10,2))), 0)`,
      orderCount: sql<number>`COUNT(*)`,
    })
    .from(orders)
    .where(
      and(
        eq(orders.venueId, venueId),
        eq(orders.status, "delivered"),
        gte(orders.createdAt, dateFrom),
        lte(orders.createdAt, dateTo)
      )
    );

  const row = result[0] ?? { revenue: 0, cost: 0, orderCount: 0 };
  return {
    revenue: Number(row.revenue),
    cost: Number(row.cost),
    profit: Number(row.revenue) - Number(row.cost),
    orderCount: Number(row.orderCount),
  };
}

export async function getRevenueByCategory(venueId: number, dateFrom: Date, dateTo: Date) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      categoryId: menuItems.categoryId,
      categoryName: menuCategories.name,
      revenue: sql<number>`COALESCE(SUM(CAST(${orderItems.subtotal} AS DECIMAL(10,2))), 0)`,
      quantity: sql<number>`SUM(${orderItems.quantity})`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .innerJoin(menuItems, eq(orderItems.menuItemId, menuItems.id))
    .innerJoin(menuCategories, eq(menuItems.categoryId, menuCategories.id))
    .where(
      and(
        eq(orders.venueId, venueId),
        eq(orders.status, "delivered"),
        gte(orders.createdAt, dateFrom),
        lte(orders.createdAt, dateTo)
      )
    )
    .groupBy(menuItems.categoryId, menuCategories.name);
}

export async function getRevenueByHour(venueId: number, dateFrom: Date, dateTo: Date) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select({
      hour: sql<number>`HOUR(${orders.createdAt})`,
      revenue: sql<number>`COALESCE(SUM(CAST(${orders.totalAmount} AS DECIMAL(10,2))), 0)`,
      orderCount: sql<number>`COUNT(*)`,
    })
    .from(orders)
    .where(
      and(
        eq(orders.venueId, venueId),
        eq(orders.status, "delivered"),
        gte(orders.createdAt, dateFrom),
        lte(orders.createdAt, dateTo)
      )
    )
    .groupBy(sql`HOUR(${orders.createdAt})`)
    .orderBy(sql`HOUR(${orders.createdAt})`);
}

export async function getOrderHistory(venueId: number, dateFrom: Date, dateTo: Date) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(orders)
    .where(and(eq(orders.venueId, venueId), gte(orders.createdAt, dateFrom), lte(orders.createdAt, dateTo)))
    .orderBy(desc(orders.createdAt));
}

// ─── MUSIC REQUESTS ───────────────────────────────────────────────────────────

export async function getMusicQueue(venueId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(musicRequests)
    .where(and(eq(musicRequests.venueId, venueId), eq(musicRequests.status, "queued")))
    .orderBy(musicRequests.createdAt);
}

export async function createMusicRequest(data: typeof musicRequests.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(musicRequests).values(data);
}

export async function updateMusicRequestStatus(
  id: number,
  status: "queued" | "playing" | "played" | "rejected",
  handledByUserId?: number
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const update: Record<string, unknown> = { status };
  if (handledByUserId) update.handledByUserId = handledByUserId;
  if (status === "played") update.playedAt = new Date();
  await db.update(musicRequests).set(update).where(eq(musicRequests.id, id));
}

// ─── AUDIT LOGS ───────────────────────────────────────────────────────────────

export async function createAuditLog(data: typeof auditLogs.$inferInsert) {
  const db = await getDb();
  if (!db) return;
  await db.insert(auditLogs).values(data).catch(() => {});
}

export async function getAuditLogs(venueId?: number, limit = 100) {
  const db = await getDb();
  if (!db) return [];
  const conditions = venueId ? [eq(auditLogs.venueId, venueId)] : [];
  return db
    .select()
    .from(auditLogs)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
}
