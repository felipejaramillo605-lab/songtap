import { and, desc, eq, gte, inArray, isNotNull, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  accessRequests,
  appauseVotes,
  auditLogs,
  InsertUser,
  menuCategories,
  menuItems,
  musicRequests,
  orderItems,
  orderStatusHistory,
  orders,
  pqrsTickets,
  pqrsSlaTargets,
  qrSessions,
  songQueue,
  staffActivities,
  tables,
  users,
  userFavoriteModules,
  venueRequests,
  venues,
  venueNotificationSettings,
  ownerNotificationHistory,
  ownerReportSchedules,
  ownerScheduledReports,
  userNotificationHistory,
  testModeIncidents,
  supportTickets,
  userOnboardingProgress,
  helpArticleFeedback,
  helpArticleFavorites,
  inventoryAlerts,
  inventoryItems,
  inventoryMovements,
  inventoryRecipeLines,
  inventoryRecipes,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { notifyOwner } from "./_core/notification";
import { createHash } from "crypto";

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

export async function getUserFavoriteModules(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(userFavoriteModules).where(eq(userFavoriteModules.userId, userId)).orderBy(desc(userFavoriteModules.createdAt));
}

export async function setUserFavoriteModule(userId: number, moduleKey: string, isFavorite: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  if (isFavorite) {
    await db.insert(userFavoriteModules).values({ userId, moduleKey }).onDuplicateKeyUpdate({ set: { moduleKey } });
    return;
  }
  await db.delete(userFavoriteModules).where(and(eq(userFavoriteModules.userId, userId), eq(userFavoriteModules.moduleKey, moduleKey)));
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

// ─── STAFF ACTIVITIES ─────────────────────────────────────────────────────────

export async function createStaffActivity(data: typeof staffActivities.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(staffActivities).values(data);
  return result[0];
}

export async function getStaffActivitiesByVenue(venueId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(staffActivities).where(eq(staffActivities.venueId, venueId)).orderBy(desc(staffActivities.createdAt));
}

export async function getStaffActivitiesByAssignee(venueId: number, userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(staffActivities)
    .where(and(eq(staffActivities.venueId, venueId), eq(staffActivities.assignedToUserId, userId)))
    .orderBy(desc(staffActivities.createdAt));
}

export async function updateStaffActivityForAssignee(
  activityId: number,
  venueId: number,
  userId: number,
  data: Pick<typeof staffActivities.$inferInsert, "status" | "completionComment" | "evidenceImageUrl" | "completedAt">
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db
    .update(staffActivities)
    .set(data)
    .where(and(eq(staffActivities.id, activityId), eq(staffActivities.venueId, venueId), eq(staffActivities.assignedToUserId, userId)));
  return (result[0] as { affectedRows: number }).affectedRows > 0;
}

// ─── PQRS ────────────────────────────────────────────────────────────────────

export async function createPqrsTicket(data: typeof pqrsTickets.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(pqrsTickets).values(data);
  return result[0];
}

export async function getPqrsTicketsBySession(sessionId: number, venueId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(pqrsTickets)
    .where(and(eq(pqrsTickets.sessionId, sessionId), eq(pqrsTickets.venueId, venueId)))
    .orderBy(desc(pqrsTickets.createdAt));
}

export async function getPqrsTicketsByVenue(venueId: number, status?: typeof pqrsTickets.$inferSelect.status) {
  const db = await getDb();
  if (!db) return [];
  const condition = status
    ? and(eq(pqrsTickets.venueId, venueId), eq(pqrsTickets.status, status))
    : eq(pqrsTickets.venueId, venueId);
  return db.select().from(pqrsTickets).where(condition).orderBy(desc(pqrsTickets.createdAt));
}

export async function getPqrsTicketForVenue(ticketId: number, venueId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const [ticket] = await db
    .select()
    .from(pqrsTickets)
    .where(and(eq(pqrsTickets.id, ticketId), eq(pqrsTickets.venueId, venueId)))
    .limit(1);
  return ticket;
}

export async function updatePqrsTicketForVenue(
  ticketId: number,
  venueId: number,
  data: Pick<typeof pqrsTickets.$inferInsert, "status" | "response" | "respondedByUserId" | "respondedAt">
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db
    .update(pqrsTickets)
    .set(data)
    .where(and(eq(pqrsTickets.id, ticketId), eq(pqrsTickets.venueId, venueId)));
  return (result[0] as { affectedRows: number }).affectedRows > 0;
}

export async function getOwnerPqrsAnalytics(
  dateFrom: Date,
  dateTo: Date,
  filters: { type?: "all" | "petition" | "complaint" | "claim" | "suggestion" | "congratulation"; status?: "all" | "open" | "in_review" | "resolved" | "closed" } = {}
) {
  const db = await getDb();
  if (!db) return [];
  const ticketConditions = [
    eq(pqrsTickets.venueId, venues.id),
    gte(pqrsTickets.createdAt, dateFrom),
    lte(pqrsTickets.createdAt, dateTo),
  ];
  if (filters.type && filters.type !== "all") ticketConditions.push(eq(pqrsTickets.type, filters.type));
  if (filters.status && filters.status !== "all") ticketConditions.push(eq(pqrsTickets.status, filters.status));
  return db
    .select({
      venueId: venues.id,
      venueName: venues.name,
      isActive: venues.isActive,
      total: sql<number>`COUNT(${pqrsTickets.id})`,
      open: sql<number>`COALESCE(SUM(CASE WHEN ${pqrsTickets.status} = 'open' THEN 1 ELSE 0 END), 0)`,
      inReview: sql<number>`COALESCE(SUM(CASE WHEN ${pqrsTickets.status} = 'in_review' THEN 1 ELSE 0 END), 0)`,
      resolved: sql<number>`COALESCE(SUM(CASE WHEN ${pqrsTickets.status} IN ('resolved', 'closed') THEN 1 ELSE 0 END), 0)`,
      averageResponseMinutes: sql<number>`COALESCE(AVG(CASE WHEN ${pqrsTickets.respondedAt} IS NOT NULL THEN TIMESTAMPDIFF(MINUTE, ${pqrsTickets.createdAt}, ${pqrsTickets.respondedAt}) END), 0)`,
      slaEvaluated: sql<number>`COALESCE(SUM(CASE WHEN ${pqrsTickets.respondedAt} IS NOT NULL OR (${pqrsTickets.status} IN ('open', 'in_review') AND TIMESTAMPDIFF(MINUTE, ${pqrsTickets.createdAt}, NOW()) > COALESCE(${pqrsSlaTargets.targetMinutes}, 1440)) THEN 1 ELSE 0 END), 0)`,
      slaMet: sql<number>`COALESCE(SUM(CASE WHEN ${pqrsTickets.respondedAt} IS NOT NULL AND TIMESTAMPDIFF(MINUTE, ${pqrsTickets.createdAt}, ${pqrsTickets.respondedAt}) <= COALESCE(${pqrsSlaTargets.targetMinutes}, 1440) THEN 1 ELSE 0 END), 0)`,
      slaBreached: sql<number>`COALESCE(SUM(CASE WHEN (${pqrsTickets.respondedAt} IS NOT NULL AND TIMESTAMPDIFF(MINUTE, ${pqrsTickets.createdAt}, ${pqrsTickets.respondedAt}) > COALESCE(${pqrsSlaTargets.targetMinutes}, 1440)) OR (${pqrsTickets.status} IN ('open', 'in_review') AND TIMESTAMPDIFF(MINUTE, ${pqrsTickets.createdAt}, NOW()) > COALESCE(${pqrsSlaTargets.targetMinutes}, 1440)) THEN 1 ELSE 0 END), 0)`,
    })
    .from(venues)
    .leftJoin(
      pqrsTickets,
      and(...ticketConditions)
    )
    .leftJoin(pqrsSlaTargets, and(eq(pqrsSlaTargets.venueId, venues.id), eq(pqrsSlaTargets.type, pqrsTickets.type)))
    .groupBy(venues.id, venues.name, venues.isActive)
    .orderBy(sql`COUNT(${pqrsTickets.id}) DESC`);
}

export async function getPqrsSlaTargets() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pqrsSlaTargets).orderBy(pqrsSlaTargets.venueId, pqrsSlaTargets.type);
}

export async function upsertPqrsSlaTarget(
  venueId: number,
  type: "petition" | "complaint" | "claim" | "suggestion" | "congratulation",
  targetMinutes: number
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(pqrsSlaTargets).values({ venueId, type, targetMinutes }).onDuplicateKeyUpdate({ set: { targetMinutes } });
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

export async function updateTable(id: number, venueId: number, data: Partial<typeof tables.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.update(tables).set(data).where(and(eq(tables.id, id), eq(tables.venueId, venueId)));
  return (result[0] as { affectedRows: number }).affectedRows > 0;
}

export async function deleteTable(id: number, venueId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.delete(tables).where(and(eq(tables.id, id), eq(tables.venueId, venueId)));
  return (result[0] as { affectedRows: number }).affectedRows > 0;
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

export async function updateCategory(id: number, venueId: number, data: Partial<typeof menuCategories.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.update(menuCategories).set(data).where(and(eq(menuCategories.id, id), eq(menuCategories.venueId, venueId)));
  return (result[0] as { affectedRows: number }).affectedRows > 0;
}

export async function deleteCategory(id: number, venueId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.update(menuCategories).set({ isActive: false }).where(and(eq(menuCategories.id, id), eq(menuCategories.venueId, venueId)));
  return (result[0] as { affectedRows: number }).affectedRows > 0;
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

export async function updateMenuItem(id: number, venueId: number, data: Partial<typeof menuItems.$inferInsert>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.update(menuItems).set(data).where(and(eq(menuItems.id, id), eq(menuItems.venueId, venueId)));
  return (result[0] as { affectedRows: number }).affectedRows > 0;
}

export async function deleteMenuItem(id: number, venueId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.update(menuItems).set({ isAvailable: false }).where(and(eq(menuItems.id, id), eq(menuItems.venueId, venueId)));
  return (result[0] as { affectedRows: number }).affectedRows > 0;
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
  venueId: number,
  status: "pending" | "preparing" | "delivered" | "cancelled",
  handledByUserId?: number,
  cancelReason?: string,
  changedByUserName?: string
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  return db.transaction(async (tx) => {
    const [currentOrder] = await tx.select().from(orders).where(and(eq(orders.id, id), eq(orders.venueId, venueId))).limit(1);
    if (!currentOrder) return false;
    const previousStatus = currentOrder.status;
    if (previousStatus === "delivered" && status !== "delivered") {
      throw new Error("PEDIDO_ENTREGADO_FINAL");
    }

    if (status === "delivered" && previousStatus !== "delivered") {
      // Importación diferida para que los helpers de inventario puedan reutilizar getDb
      // sin crear una dependencia circular al cargar este módulo.
      const { applyInventoryForDeliveredOrder } = await import("./inventoryDb");
      await applyInventoryForDeliveredOrder(tx, { orderId: id, venueId, performedByUserId: handledByUserId });
    }

    const update: Record<string, unknown> = { status };
    if (handledByUserId) update.handledByUserId = handledByUserId;
    if (status === "delivered") update.completedAt = new Date();
    if (status === "cancelled") {
      update.cancelledAt = new Date();
      if (cancelReason) update.cancelReason = cancelReason;
    }
    await tx.update(orders).set(update).where(and(eq(orders.id, id), eq(orders.venueId, venueId)));

    if (handledByUserId && previousStatus !== status) {
      await tx.insert(orderStatusHistory).values({
        orderId: id,
        previousStatus: previousStatus as any,
        newStatus: status,
        changedByUserId: handledByUserId,
        changedByUserName,
        reason: cancelReason,
      });
    }
    return true;
  });
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

export async function getOwnerVenueAnalytics(dateFrom: Date, dateTo: Date) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      venueId: venues.id,
      venueName: venues.name,
      isActive: venues.isActive,
      revenue: sql<number>`COALESCE(SUM(CAST(${orders.totalAmount} AS DECIMAL(10,2))), 0)`,
      orderCount: sql<number>`COUNT(${orders.id})`,
      averageTicket: sql<number>`COALESCE(AVG(CAST(${orders.totalAmount} AS DECIMAL(10,2))), 0)`,
    })
    .from(venues)
    .leftJoin(
      orders,
      and(
        eq(orders.venueId, venues.id),
        eq(orders.status, "delivered"),
        gte(orders.createdAt, dateFrom),
        lte(orders.createdAt, dateTo)
      )
    )
    .groupBy(venues.id, venues.name, venues.isActive)
    .orderBy(sql`COALESCE(SUM(CAST(${orders.totalAmount} AS DECIMAL(10,2))), 0) DESC`);
}

export async function getOwnerRevenueByDay(dateFrom: Date, dateTo: Date) {
  const db = await getDb();
  if (!db) return [];
  const dayExpression = sql<string>`DATE(\`createdAt\`)`;
  return db
    .select({
      date: dayExpression,
      revenue: sql<number>`COALESCE(SUM(CAST(${orders.totalAmount} AS DECIMAL(10,2))), 0)`,
      orderCount: sql<number>`COUNT(*)`,
    })
    .from(orders)
    .where(and(eq(orders.status, "delivered"), gte(orders.createdAt, dateFrom), lte(orders.createdAt, dateTo)))
    .groupBy(dayExpression)
    .orderBy(dayExpression);
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
      hour: sql<number>`HOUR(\`createdAt\`)`,
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
    .groupBy(sql`HOUR(\`createdAt\`)`)
    .orderBy(sql`HOUR(\`createdAt\`)`);
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

function deriveAuditModule(action: string) {
  if (action.includes("ORDER")) return "Pedidos";
  if (action.includes("TABLE") || action.includes("QR")) return "Mesas y QR";
  if (action.includes("MENU") || action.includes("CATEGORY")) return "Menú";
  if (action.includes("VENUE")) return "Compañías";
  if (action.includes("USER") || action.includes("STAFF")) return "Equipo y usuarios";
  if (action.includes("MUSIC") || action.includes("SONG")) return "Música";
  return "Sistema";
}

export async function createAuditLog(data: typeof auditLogs.$inferInsert) {
  const db = await getDb();
  if (!db) return;
  await db
    .insert(auditLogs)
    .values({
      ...data,
      module: data.module ?? deriveAuditModule(data.action),
    })
    .catch(() => {});
}

export async function getAuditLogs(venueId?: number, limit = 100) {
  const db = await getDb();
  if (!db) return [];
  const conditions = venueId ? [eq(auditLogs.venueId, venueId)] : [];
  return db
    .select({
      id: auditLogs.id,
      venueId: auditLogs.venueId,
      companyName: venues.name,
      userId: auditLogs.userId,
      executorName: users.name,
      executorEmail: users.email,
      userRole: auditLogs.userRole,
      module: auditLogs.module,
      action: auditLogs.action,
      entity: auditLogs.entity,
      entityId: auditLogs.entityId,
      details: auditLogs.details,
      ipAddress: auditLogs.ipAddress,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .leftJoin(venues, eq(auditLogs.venueId, venues.id))
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
}

type AccessAuditPayload = {
  userId: number;
  userRole: "owner" | "manager" | "staff" | "user";
  venueId: number | null;
  targetPath: string;
  moduleName: string;
};

function hasAuditTarget(details: string | null, targetPath: string) {
  if (!details) return false;
  try {
    const parsed = JSON.parse(details) as { targetPath?: string };
    return parsed.targetPath === targetPath;
  } catch {
    return false;
  }
}

async function hasRecentAccessAudit(userId: number, action: "ACCESS_DENIED" | "ACCESS_REQUESTED", targetPath: string, since: Date) {
  const db = await getDb();
  if (!db) return false;
  const events = await db
    .select({ details: auditLogs.details })
    .from(auditLogs)
    .where(and(eq(auditLogs.userId, userId), eq(auditLogs.action, action), gte(auditLogs.createdAt, since)))
    .orderBy(desc(auditLogs.createdAt))
    .limit(20);
  return events.some((event) => hasAuditTarget(event.details, targetPath));
}

export async function recordDeniedAccess(data: AccessAuditPayload & { reason: "role" | "password_change" }) {
  const recentlyRecorded = await hasRecentAccessAudit(data.userId, "ACCESS_DENIED", data.targetPath, new Date(Date.now() - 5 * 60 * 1000));
  if (recentlyRecorded) return false;
  await createAuditLog({
    venueId: data.venueId,
    userId: data.userId,
    userRole: data.userRole,
    module: "Control de acceso",
    action: "ACCESS_DENIED",
    entity: "protected_route",
    details: JSON.stringify({ targetPath: data.targetPath, moduleName: data.moduleName, reason: data.reason }),
  });
  return true;
}

export async function createAccessRequest(data: AccessAuditPayload & { userName: string }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  try {
    await db.insert(accessRequests).values({
      userId: data.userId,
      venueId: data.venueId,
      requesterRole: data.userRole,
      targetPath: data.targetPath,
      moduleName: data.moduleName,
      status: "pending",
    });
  } catch (error) {
    if ((error as { code?: string }).code === "ER_DUP_ENTRY") return { created: false };
    throw error;
  }

  await createAuditLog({
    venueId: data.venueId,
    userId: data.userId,
    userRole: data.userRole,
    module: "Control de acceso",
    action: "ACCESS_REQUESTED",
    entity: "protected_route",
    details: JSON.stringify({ targetPath: data.targetPath, moduleName: data.moduleName, status: "pending_review" }),
  });

  const owners = await db.select({ id: users.id }).from(users).where(eq(users.role, "owner"));
  const title = `Solicitud de acceso · ${data.moduleName}`;
  const content = `${data.userName} (${data.userRole}) solicitó acceso a ${data.moduleName} (${data.targetPath}). Revisa el evento en Auditoría.`;
  for (const owner of owners) {
    await db.insert(ownerNotificationHistory).values({
      ownerId: owner.id,
      type: "access_request",
      title,
      content,
    });
  }
  return { created: true };
}

export async function getPendingAccessRequests() {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: accessRequests.id,
      userId: accessRequests.userId,
      venueId: accessRequests.venueId,
      requesterRole: accessRequests.requesterRole,
      targetPath: accessRequests.targetPath,
      moduleName: accessRequests.moduleName,
      status: accessRequests.status,
      createdAt: accessRequests.createdAt,
      requesterName: users.name,
      requesterEmail: users.email,
      venueName: venues.name,
    })
    .from(accessRequests)
    .leftJoin(users, eq(accessRequests.userId, users.id))
    .leftJoin(venues, eq(accessRequests.venueId, venues.id))
    .where(eq(accessRequests.status, "pending"))
    .orderBy(desc(accessRequests.createdAt));
}

export async function getOwnerAccessRequestOverview() {
  const db = await getDb();
  if (!db) return { summary: { approved: 0, rejected: 0, pending: 0 }, requests: [] };
  const requests = await db
    .select({
      id: accessRequests.id,
      status: accessRequests.status,
      moduleName: accessRequests.moduleName,
      targetPath: accessRequests.targetPath,
      decisionReason: accessRequests.decisionReason,
      createdAt: accessRequests.createdAt,
      reviewedAt: accessRequests.reviewedAt,
      requesterName: users.name,
      requesterEmail: users.email,
      venueName: venues.name,
    })
    .from(accessRequests)
    .leftJoin(users, eq(accessRequests.userId, users.id))
    .leftJoin(venues, eq(accessRequests.venueId, venues.id))
    .orderBy(desc(accessRequests.createdAt));
  const summary = requests.reduce((totals, request) => {
    if (request.status === "approved") totals.approved += 1;
    else if (request.status === "rejected") totals.rejected += 1;
    else if (request.status === "pending") totals.pending += 1;
    return totals;
  }, { approved: 0, rejected: 0, pending: 0 });
  return { summary, requests };
}

export async function getInternalAccessComments(filters: { startDate?: Date; endDate?: Date }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [
    isNotNull(accessRequests.internalComment),
    inArray(accessRequests.status, ["approved", "rejected"]),
  ];
  if (filters.startDate) conditions.push(gte(accessRequests.reviewedAt, filters.startDate));
  if (filters.endDate) conditions.push(lte(accessRequests.reviewedAt, filters.endDate));
  return db
    .select({
      id: accessRequests.id,
      requesterName: users.name,
      requesterEmail: users.email,
      moduleName: accessRequests.moduleName,
      targetPath: accessRequests.targetPath,
      status: accessRequests.status,
      internalComment: accessRequests.internalComment,
      decisionReason: accessRequests.decisionReason,
      reviewedAt: accessRequests.reviewedAt,
      venueName: venues.name,
    })
    .from(accessRequests)
    .leftJoin(users, eq(accessRequests.userId, users.id))
    .leftJoin(venues, eq(accessRequests.venueId, venues.id))
    .where(and(...conditions))
    .orderBy(desc(accessRequests.reviewedAt));
}

export async function getUserAccessDecisionHistory(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: accessRequests.id,
      moduleName: accessRequests.moduleName,
      targetPath: accessRequests.targetPath,
      status: accessRequests.status,
      decisionReason: accessRequests.decisionReason,
      reviewedAt: accessRequests.reviewedAt,
      createdAt: accessRequests.createdAt,
    })
    .from(accessRequests)
    .where(and(eq(accessRequests.userId, userId), inArray(accessRequests.status, ["approved", "rejected"])))
    .orderBy(desc(accessRequests.reviewedAt))
    .limit(limit);
}

type AccessRequestDecision = {
  requestId: number;
  ownerId: number;
  decision: "approved" | "rejected";
  reason?: string;
  internalComment?: string;
  grantedRole?: "manager" | "staff";
};

export async function resolveAccessRequest(data: AccessRequestDecision) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  return db.transaction(async (tx) => {
    const [request] = await tx.select().from(accessRequests).where(eq(accessRequests.id, data.requestId)).limit(1);
    if (!request) throw new Error("Solicitud de acceso no encontrada");
    if (request.status !== "pending") throw new Error("La solicitud ya fue resuelta");

    const [requester] = await tx.select().from(users).where(eq(users.id, request.userId)).limit(1);
    if (!requester) throw new Error("La cuenta solicitante ya no existe");

    if (data.decision === "approved") {
      if (!data.grantedRole || !request.venueId) {
        throw new Error("La solicitud no cuenta con un local válido para asignar el acceso");
      }
      await tx.update(users).set({ role: data.grantedRole, venueId: request.venueId }).where(eq(users.id, request.userId));
    }

    const updateResult = await tx
      .update(accessRequests)
      .set({
        status: data.decision,
        reviewedByOwnerId: data.ownerId,
        decisionReason: data.reason?.trim() || null,
        internalComment: data.internalComment?.trim() || null,
        reviewedAt: new Date(),
      })
      .where(and(eq(accessRequests.id, data.requestId), eq(accessRequests.status, "pending")));
    if (!(updateResult[0] as { affectedRows?: number }).affectedRows) throw new Error("La solicitud ya fue resuelta");

    const approved = data.decision === "approved";
    const title = approved ? `Acceso aprobado · ${request.moduleName}` : `Acceso rechazado · ${request.moduleName}`;
    const content = approved
      ? `El Owner aprobó tu solicitud para ${request.moduleName}. Tu rol fue actualizado a ${data.grantedRole}.`
      : `El Owner rechazó tu solicitud para ${request.moduleName}.${data.reason?.trim() ? ` Motivo: ${data.reason.trim()}` : ""}`;
    await tx.insert(userNotificationHistory).values({
      userId: request.userId,
      type: approved ? "access_approved" : "access_rejected",
      title,
      content,
      relatedAccessRequestId: request.id,
    });

    return { request, requester, grantedRole: data.grantedRole };
  });
}

export async function getUserNotificationHistory(userId: number, limit = 50, archived = false) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(userNotificationHistory)
    .where(and(eq(userNotificationHistory.userId, userId), eq(userNotificationHistory.isArchived, archived)))
    .orderBy(desc(userNotificationHistory.createdAt))
    .limit(limit);
}

export async function getUnreadUserNotificationCount(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(userNotificationHistory)
    .where(and(eq(userNotificationHistory.userId, userId), eq(userNotificationHistory.isRead, false), eq(userNotificationHistory.isArchived, false)));
  return Number(rows[0]?.count ?? 0);
}

export async function markUserNotificationRead(userId: number, notificationId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db
    .update(userNotificationHistory)
    .set({ isRead: true, readAt: new Date() })
    .where(and(eq(userNotificationHistory.id, notificationId), eq(userNotificationHistory.userId, userId)));
}

export async function markAllUserNotificationsRead(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db
    .update(userNotificationHistory)
    .set({ isRead: true, readAt: new Date() })
    .where(and(eq(userNotificationHistory.userId, userId), eq(userNotificationHistory.isRead, false)));
}

export async function archiveUserNotification(userId: number, notificationId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db
    .update(userNotificationHistory)
    .set({ isArchived: true, archivedAt: new Date() })
    .where(and(
      eq(userNotificationHistory.id, notificationId),
      eq(userNotificationHistory.userId, userId),
      eq(userNotificationHistory.isRead, true),
      eq(userNotificationHistory.isArchived, false),
    ));
  return Boolean((result[0] as { affectedRows?: number }).affectedRows);
}

export async function archiveAllReadUserNotifications(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db
    .update(userNotificationHistory)
    .set({ isArchived: true, archivedAt: new Date() })
    .where(and(eq(userNotificationHistory.userId, userId), eq(userNotificationHistory.isRead, true), eq(userNotificationHistory.isArchived, false)));
}


// ─── VENUE REQUESTS ───────────────────────────────────────────────────────────

export async function createVenueRequest(data: typeof venueRequests.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(venueRequests).values(data);
  
  // Guardar la alerta para cada Owner y enviar el aviso del proyecto si procede.
  try {
    const owners = await db.select({ id: users.id }).from(users).where(eq(users.role, "owner"));
    const title = `Nueva Solicitud de Local: ${data.venueName}`;
    const content = `El manager ha solicitado registrar el local "${data.venueName}" (Dirección: ${data.venueAddress || "N/A"}). Ingresa al panel de SongTap para aprobarla o rechazarla.`;

    for (const owner of owners) {
      await db.insert(ownerNotificationHistory).values({
        ownerId: owner.id,
        type: "venue_request",
        title,
        content,
      });

      const [settings] = await db
        .select()
        .from(venueNotificationSettings)
        .where(eq(venueNotificationSettings.ownerId, owner.id))
        .limit(1);

      if (!settings || settings.enabled) {
        await notifyOwner({
          title,
          content,
        });
      }
    }
  } catch (err) {
    console.warn("[VenueRequest] Error enviando notificación al owner:", err);
  }

  return result;
}

export async function getVenueRequestsByManager(managerId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(venueRequests).where(eq(venueRequests.managerId, managerId)).orderBy(desc(venueRequests.createdAt));
}

export async function getPendingVenueRequests() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(venueRequests).where(eq(venueRequests.status, "pending")).orderBy(desc(venueRequests.createdAt));
}

export async function approveVenueRequest(requestId: number, ownerId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  
  // Obtener la solicitud
  const [request] = await db.select().from(venueRequests).where(eq(venueRequests.id, requestId)).limit(1);
  if (!request) throw new Error("Request not found");
  
  // Crear el venue
  const venueResult = await db.insert(venues).values({
    name: request.venueName,
    address: request.venueAddress,
    phone: request.venuePhone,
    email: request.venueEmail,
  });
  
  const venueId = (venueResult as any).insertId || venueResult[0];
  
  // Actualizar la solicitud
  await db.update(venueRequests).set({
    status: "approved",
    approvedAt: new Date(),
    approvedByOwnerId: ownerId,
  }).where(eq(venueRequests.id, requestId));
  
  // Asignar el venue al manager
  await db.update(users).set({ venueId }).where(eq(users.id, request.managerId));
  
  return { venueId };
}

export async function rejectVenueRequest(requestId: number, reason: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  
  await db.update(venueRequests).set({
    status: "rejected",
    rejectionReason: reason,
  }).where(eq(venueRequests.id, requestId));
}

// ─── SONG QUEUE ───────────────────────────────────────────────────────────────

export async function addSongToQueue(data: typeof songQueue.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(songQueue).values(data);
}

export async function getCurrentSong(venueId: number) {
  const db = await getDb();
  if (!db) return null;
  const [song] = await db.select().from(songQueue).where(
    and(eq(songQueue.venueId, venueId), eq(songQueue.isCurrentlyPlaying, true))
  ).limit(1);
  return song || null;
}

export async function getSongQueue(venueId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(songQueue).where(eq(songQueue.venueId, venueId)).orderBy(songQueue.position);
}

export async function getSongByIdForVenue(songId: number, venueId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const [song] = await db.select().from(songQueue).where(and(eq(songQueue.id, songId), eq(songQueue.venueId, venueId))).limit(1);
  return song;
}

export async function saveKaraokeLinkForSong(input: {
  venueId: number;
  songId: number;
  karaokeUrl: string;
  karaokeProviderName: string | null;
  karaokeSavedByUserId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.update(songQueue).set({
    karaokeUrl: input.karaokeUrl,
    karaokeProviderName: input.karaokeProviderName,
    karaokeSavedByUserId: input.karaokeSavedByUserId,
    karaokeSavedAt: new Date(),
    karaokeLinkStatus: "unverified",
    karaokeLinkReviewNote: null,
    karaokeReviewDueAt: null,
    karaokeLinkStatusUpdatedByUserId: input.karaokeSavedByUserId,
    karaokeLinkStatusUpdatedAt: new Date(),
  }).where(and(eq(songQueue.id, input.songId), eq(songQueue.venueId, input.venueId)));
  return (result[0] as { affectedRows: number }).affectedRows > 0;
}

export type KaraokeLinkStatus = "unverified" | "working" | "needs_review";

export async function updateKaraokeLinkStatusForSong(input: {
  venueId: number;
  songId: number;
  status: KaraokeLinkStatus;
  reviewNote?: string | null;
  reviewDueAt?: Date | null;
  updatedByUserId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.update(songQueue).set({
    karaokeLinkStatus: input.status,
    karaokeLinkReviewNote: input.status === "needs_review" ? (input.reviewNote ?? null) : null,
    karaokeReviewDueAt: input.status === "needs_review" ? (input.reviewDueAt ?? null) : null,
    karaokeLinkStatusUpdatedByUserId: input.updatedByUserId,
    karaokeLinkStatusUpdatedAt: new Date(),
  }).where(and(eq(songQueue.id, input.songId), eq(songQueue.venueId, input.venueId)));
  return (result[0] as { affectedRows: number }).affectedRows > 0;
}

export async function notifyVenueManagersOfKaraokeReview(input: {
  venueId: number;
  songName: string;
  artist: string;
  reviewNote: string;
  reviewDueAt: Date;
  actorUserId: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const managers = await db.select({ id: users.id }).from(users).where(and(eq(users.venueId, input.venueId), eq(users.role, "manager")));
  const recipients = managers.filter((manager) => manager.id !== input.actorUserId);
  if (recipients.length === 0) return 0;

  const deadline = new Intl.DateTimeFormat("es-CO", { dateStyle: "long", timeZone: "America/Bogota" }).format(input.reviewDueAt);
  await db.insert(userNotificationHistory).values(recipients.map((manager) => ({
    userId: manager.id,
    type: "karaoke_review",
    title: "Enlace de karaoke requiere revisión",
    content: `${input.songName} — ${input.artist}. Fecha límite: ${deadline}. Nota: ${input.reviewNote}`,
  })));
  return recipients.length;
}

export async function getSongPlaybackHistory(venueId: number, input: { limit?: number; from?: Date; to?: Date } = {}) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(songQueue.venueId, venueId), isNotNull(songQueue.playedAt)];
  if (input.from) conditions.push(gte(songQueue.playedAt, input.from));
  if (input.to) conditions.push(lte(songQueue.playedAt, input.to));
  return db.select().from(songQueue).where(and(...conditions)).orderBy(desc(songQueue.playedAt)).limit(input.limit ?? 50);
}

export type KaraokeProviderConfig = {
  id: string;
  name: string;
  searchUrl: string;
};

export async function getVenueKaraokeProviders(venueId: number): Promise<KaraokeProviderConfig[]> {
  const db = await getDb();
  if (!db) return [];
  const [venue] = await db.select({ karaokeProviders: venues.karaokeProviders }).from(venues).where(eq(venues.id, venueId)).limit(1);
  if (!venue?.karaokeProviders) return [];
  try {
    const parsed = JSON.parse(venue.karaokeProviders);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((provider): provider is KaraokeProviderConfig => (
      provider &&
      typeof provider.id === "string" &&
      typeof provider.name === "string" &&
      typeof provider.searchUrl === "string"
    ));
  } catch {
    return [];
  }
}

export type KaraokeVenueMetric = {
  venueId: number;
  venueName: string;
  totalLinks: number;
  workingLinks: number;
  unverifiedLinks: number;
  needsReviewLinks: number;
  workingRate: number;
};

export async function getOwnerKaraokeLinkMetrics() {
  const emptyTotals = { totalLinks: 0, workingLinks: 0, unverifiedLinks: 0, needsReviewLinks: 0, workingRate: 0 };
  const db = await getDb();
  if (!db) return { totals: emptyTotals, venues: [] as KaraokeVenueMetric[] };

  const activeVenues = await db.select({ id: venues.id, name: venues.name }).from(venues).where(eq(venues.isActive, true));
  if (activeVenues.length === 0) return { totals: emptyTotals, venues: [] as KaraokeVenueMetric[] };

  const links = await db.select({ venueId: songQueue.venueId, status: songQueue.karaokeLinkStatus }).from(songQueue).where(
    and(inArray(songQueue.venueId, activeVenues.map((venue) => venue.id)), isNotNull(songQueue.karaokeUrl))
  );
  const venueMetrics = activeVenues.map((venue) => {
    const venueLinks = links.filter((link) => link.venueId === venue.id);
    const workingLinks = venueLinks.filter((link) => link.status === "working").length;
    const needsReviewLinks = venueLinks.filter((link) => link.status === "needs_review").length;
    const unverifiedLinks = venueLinks.length - workingLinks - needsReviewLinks;
    return {
      venueId: venue.id,
      venueName: venue.name,
      totalLinks: venueLinks.length,
      workingLinks,
      unverifiedLinks,
      needsReviewLinks,
      workingRate: venueLinks.length ? Math.round((workingLinks / venueLinks.length) * 100) : 0,
    };
  }).sort((a, b) => a.venueName.localeCompare(b.venueName, "es"));

  const totals = venueMetrics.reduce((summary, venue) => ({
    totalLinks: summary.totalLinks + venue.totalLinks,
    workingLinks: summary.workingLinks + venue.workingLinks,
    unverifiedLinks: summary.unverifiedLinks + venue.unverifiedLinks,
    needsReviewLinks: summary.needsReviewLinks + venue.needsReviewLinks,
  }), { totalLinks: 0, workingLinks: 0, unverifiedLinks: 0, needsReviewLinks: 0 });
  return { totals: { ...totals, workingRate: totals.totalLinks ? Math.round((totals.workingLinks / totals.totalLinks) * 100) : 0 }, venues: venueMetrics };
}

export async function updateSongMetadataForVenue(songId: number, venueId: number, songName: string, artist: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.update(songQueue).set({ songName, artist }).where(and(eq(songQueue.id, songId), eq(songQueue.venueId, venueId)));
  return (result[0] as { affectedRows: number }).affectedRows > 0;
}

export async function updateCurrentSong(venueId: number, songId: number, playedBy: { id: number; name: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const [targetSong] = await db.select().from(songQueue).where(and(eq(songQueue.id, songId), eq(songQueue.venueId, venueId))).limit(1);
  if (!targetSong) return false;
  
  // Marcar la canción anterior como tocada
  await db.update(songQueue).set({ isCurrentlyPlaying: false, playedAt: new Date() }).where(
    and(eq(songQueue.venueId, venueId), eq(songQueue.isCurrentlyPlaying, true))
  );
  
  // Marcar la nueva canción como tocándose
  await db.update(songQueue).set({
    isCurrentlyPlaying: true,
    playedByUserId: playedBy.id,
    playedByUserName: playedBy.name || "Staff SongTap",
  }).where(and(eq(songQueue.id, songId), eq(songQueue.venueId, venueId)));
  return true;
}

export async function removeSongFromQueue(songId: number, venueId?: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const conditions = venueId
    ? and(eq(songQueue.id, songId), eq(songQueue.venueId, venueId))
    : eq(songQueue.id, songId);
  await db.delete(songQueue).where(conditions);
}

// ─── APPLAUSE VOTES ───────────────────────────────────────────────────────────

export async function submitAppauseVote(data: typeof appauseVotes.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(appauseVotes).values(data);
}

export async function getAppauseScore(venueId: number, songId: number) {
  const db = await getDb();
  if (!db) return { averageRating: 0, totalVotes: 0, ratingsByPerformingTable: [] };
  
  const votes = await db.select().from(appauseVotes).where(
    and(eq(appauseVotes.venueId, venueId), eq(appauseVotes.songId, songId))
  );
  
  if (votes.length === 0) {
    return { averageRating: 0, totalVotes: 0, ratingsByPerformingTable: [] };
  }
  
  const averageRating = votes.reduce((sum, v) => sum + v.rating, 0) / votes.length;
  
  // Agrupar por mesa que está cantando
  const ratingsByPerformingTable = votes.reduce((acc: any, v) => {
    const key = v.performingTableName || `Mesa ${v.performingTableId}`;
    if (!acc[key]) {
      acc[key] = { ratings: [], count: 0 };
    }
    acc[key].ratings.push(v.rating);
    acc[key].count += 1;
    return acc;
  }, {});
  
  // Calcular promedio por mesa
  const ratingsByTable = Object.entries(ratingsByPerformingTable).map(([tableName, data]: any) => ({
    tableName,
    averageRating: data.ratings.reduce((sum: number, r: number) => sum + r, 0) / data.count,
    totalVotes: data.count,
  }));
  
  return {
    averageRating: Math.round(averageRating * 10) / 10,
    totalVotes: votes.length,
    ratingsByPerformingTable: ratingsByTable,
  };
}

export async function getAppauseVotesByTable(venueId: number, performingTableId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(appauseVotes).where(
    and(eq(appauseVotes.venueId, venueId), eq(appauseVotes.performingTableId, performingTableId))
  ).orderBy(desc(appauseVotes.createdAt));
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0];
}

export const PASSWORD_LOGIN_MAX_ATTEMPTS = 10;
export const PASSWORD_LOGIN_LOCK_DURATION_MS = 15 * 60 * 1000;

export async function recordPasswordLoginFailure(user: Pick<typeof users.$inferSelect, "id" | "venueId" | "role">, now = new Date()) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");

  const nextLockedUntil = new Date(now.getTime() + PASSWORD_LOGIN_LOCK_DURATION_MS);
  const priorLockExpired = sql`(${users.loginLockedUntil} IS NOT NULL AND ${users.loginLockedUntil} <= ${now})`;
  await db
    .update(users)
    .set({
      failedLoginAttempts: sql`CASE
        WHEN ${priorLockExpired} THEN 1
        WHEN ${users.failedLoginAttempts} >= ${PASSWORD_LOGIN_MAX_ATTEMPTS - 1} THEN ${PASSWORD_LOGIN_MAX_ATTEMPTS}
        ELSE ${users.failedLoginAttempts} + 1
      END`,
      loginLockedUntil: sql`CASE
        WHEN ${priorLockExpired} THEN NULL
        WHEN ${users.failedLoginAttempts} >= ${PASSWORD_LOGIN_MAX_ATTEMPTS - 1} THEN ${nextLockedUntil}
        ELSE NULL
      END`,
    })
    .where(eq(users.id, user.id));

  const [persisted] = await db
    .select({ failedLoginAttempts: users.failedLoginAttempts, loginLockedUntil: users.loginLockedUntil })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);
  const lockedUntil = persisted?.loginLockedUntil ?? null;
  const isLocked = Boolean(lockedUntil && lockedUntil > now);

  if (isLocked && lockedUntil && persisted?.failedLoginAttempts === PASSWORD_LOGIN_MAX_ATTEMPTS) {
    await createAuditLog({
      venueId: user.venueId,
      userId: user.id,
      userRole: user.role,
      module: "Autenticación",
      action: "PASSWORD_LOGIN_TEMPORARILY_LOCKED",
      entity: "user",
      entityId: user.id,
      details: JSON.stringify({ reason: "10_failed_password_attempts", lockedUntil: lockedUntil.toISOString() }),
    });
  }

  return { attempts: persisted?.failedLoginAttempts ?? 0, lockedUntil, isLocked };
}

export async function clearPasswordLoginFailures(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  await db
    .update(users)
    .set({ failedLoginAttempts: 0, loginLockedUntil: null })
    .where(eq(users.id, userId));
}

export async function createUserWithPassword(data: {
  email: string;
  passwordHash: string;
  name: string;
  role?: "owner" | "manager" | "staff" | "user";
  venueId?: number | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  const openId = `local_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`;
  await db.insert(users).values({
    openId,
    email: data.email,
    passwordHash: data.passwordHash,
    name: data.name,
    role: data.role ?? "user",
    venueId: data.venueId ?? null,
    loginMethod: "password",
  });
  return getUserByEmail(data.email);
}

export async function setPasswordResetToken(email: string, token: string, expires: Date) {
  const db = await getDb();
  if (!db) return false;
  const tokenHash = createHash("sha256").update(token).digest("hex");
  await db
    .update(users)
    .set({ resetPasswordToken: tokenHash, resetPasswordExpires: expires })
    .where(eq(users.email, email));
  return true;
}

export async function getUserByResetToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const result = await db.select().from(users).where(eq(users.resetPasswordToken, tokenHash)).limit(1);
  return result[0];
}

export async function updateUserPassword(userId: number, passwordHash: string, mustChangePassword = false) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(users)
    .set({
      passwordHash,
      mustChangePassword,
      resetPasswordToken: null,
      resetPasswordExpires: null,
      failedLoginAttempts: 0,
      loginLockedUntil: null,
      sessionVersion: sql`${users.sessionVersion} + 1`,
    })
    .where(eq(users.id, userId));
}

export async function revokeUserSessions(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not connected");
  await db.update(users).set({ sessionVersion: sql`${users.sessionVersion} + 1` }).where(eq(users.id, userId));
  const [user] = await db.select({ sessionVersion: users.sessionVersion }).from(users).where(eq(users.id, userId)).limit(1);
  return user?.sessionVersion ?? null;
}

// ─── NOTIFICATION SETTINGS HELPERS ───────────────────────────────────────────
export async function getNotificationSettings(ownerId: number) {
  const db = await getDb();
  if (!db) return null;
  const [settings] = await db.select().from(venueNotificationSettings).where(eq(venueNotificationSettings.ownerId, ownerId)).limit(1);
  if (!settings) {
    // Retornar valores por defecto si no existen
    return {
      ownerId,
      enabled: true,
      emailNotifications: true,
      notificationEmail: "",
      notificationPhone: "",
      senderAccountEmail: "",
      soundType: "chime",
    };
  }
  return settings;
}

export async function updateNotificationSettings(ownerId: number, data: {
  enabled: boolean;
  emailNotifications: boolean;
  notificationEmail?: string;
  notificationPhone?: string;
  senderAccountEmail?: string;
  soundType: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const dbCheck = await getDb();
  if (!dbCheck) throw new Error("DB not available");
  const [existing] = await dbCheck.select().from(venueNotificationSettings).where(eq(venueNotificationSettings.ownerId, ownerId)).limit(1);
  if (!existing) {
    await db.insert(venueNotificationSettings).values({
      ownerId,
      ...data,
    });
  } else {
    await db.update(venueNotificationSettings).set({
      ...data,
      updatedAt: new Date(),
    }).where(eq(venueNotificationSettings.ownerId, ownerId));
  }
  return getNotificationSettings(ownerId);
}

export async function getOwnerNotificationHistory(ownerId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(ownerNotificationHistory)
    .where(eq(ownerNotificationHistory.ownerId, ownerId))
    .orderBy(desc(ownerNotificationHistory.createdAt))
    .limit(limit);
}

export async function getUnreadOwnerNotificationCount(ownerId: number) {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db
    .select()
    .from(ownerNotificationHistory)
    .where(and(eq(ownerNotificationHistory.ownerId, ownerId), eq(ownerNotificationHistory.isRead, false)));
  return rows.length;
}

export async function markOwnerNotificationRead(ownerId: number, notificationId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db
    .update(ownerNotificationHistory)
    .set({ isRead: true, readAt: new Date() })
    .where(and(eq(ownerNotificationHistory.id, notificationId), eq(ownerNotificationHistory.ownerId, ownerId)));
}

export async function markAllOwnerNotificationsRead(ownerId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db
    .update(ownerNotificationHistory)
    .set({ isRead: true, readAt: new Date() })
    .where(and(eq(ownerNotificationHistory.ownerId, ownerId), eq(ownerNotificationHistory.isRead, false)));
}

export async function createTestModeIncident(data: { ownerId: number; venueId: number; previewRole: "manager" | "staff"; route: string; title: string; description: string }) {
  const db = await getDb();
  if (!db) throw new Error("Base de datos no disponible");
  const result = await db.insert(testModeIncidents).values({
    ownerId: data.ownerId,
    venueId: data.venueId,
    previewRole: data.previewRole,
    route: data.route,
    title: data.title,
    description: data.description,
  });
  return Number(result[0].insertId);
}

// ─── OWNER SCHEDULED REPORTS ──────────────────────────────────────────────────

export type OwnerReportSummary = {
  periodStart: string;
  periodEnd: string;
  venueCount: number;
  activeVenueCount: number;
  deliveredOrderCount: number;
  totalRevenue: number;
  averageTicket: number;
  pqrsReceived: number;
  venues: Array<{
    venueId: number;
    venueName: string;
    revenue: number;
    orderCount: number;
    averageTicket: number;
  }>;
  comparison: {
    periodStart: string;
    periodEnd: string;
    totalRevenue: OwnerReportMetricComparison;
    deliveredOrderCount: OwnerReportMetricComparison;
    averageTicket: OwnerReportMetricComparison;
    pqrsReceived: OwnerReportMetricComparison;
  };
};

export type OwnerReportMetricComparison = {
  previousValue: number;
  change: number;
  percentChange: number | null;
};

export async function getOwnerReportSchedule(ownerId: number) {
  const db = await getDb();
  if (!db) return null;
  const [schedule] = await db
    .select()
    .from(ownerReportSchedules)
    .where(eq(ownerReportSchedules.ownerId, ownerId))
    .limit(1);
  return schedule ?? null;
}

export async function getOwnerReportScheduleByTaskUid(taskUid: string) {
  const db = await getDb();
  if (!db) return null;
  const [schedule] = await db
    .select()
    .from(ownerReportSchedules)
    .where(eq(ownerReportSchedules.scheduleCronTaskUid, taskUid))
    .limit(1);
  return schedule ?? null;
}

export async function saveOwnerReportSchedule(data: {
  ownerId: number;
  weekday: number;
  hour: number;
  minute: number;
  cronExpression: string;
  taskUid: string | null;
  isEnabled: boolean;
  nextExecutionAt?: Date | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Base de datos no disponible");
  await db
    .insert(ownerReportSchedules)
    .values({
      ownerId: data.ownerId,
      weekday: data.weekday,
      hour: data.hour,
      minute: data.minute,
      cronExpression: data.cronExpression,
      scheduleCronTaskUid: data.taskUid,
      isEnabled: data.isEnabled,
      nextExecutionAt: data.nextExecutionAt ?? null,
    })
    .onDuplicateKeyUpdate({
      set: {
        weekday: data.weekday,
        hour: data.hour,
        minute: data.minute,
        cronExpression: data.cronExpression,
        scheduleCronTaskUid: data.taskUid,
        isEnabled: data.isEnabled,
        nextExecutionAt: data.nextExecutionAt ?? null,
        updatedAt: new Date(),
      },
    });
  const schedule = await getOwnerReportSchedule(data.ownerId);
  if (!schedule) throw new Error("No fue posible guardar la programación del reporte");
  return schedule;
}

export async function getOwnerScheduledReports(ownerId: number, limit = 12) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(ownerScheduledReports)
    .where(eq(ownerScheduledReports.ownerId, ownerId))
    .orderBy(desc(ownerScheduledReports.createdAt))
    .limit(limit);
}

export async function getOwnerScheduledReport(ownerId: number, reportId: number) {
  const db = await getDb();
  if (!db) return null;
  const [report] = await db
    .select()
    .from(ownerScheduledReports)
    .where(and(eq(ownerScheduledReports.id, reportId), eq(ownerScheduledReports.ownerId, ownerId)))
    .limit(1);
  return report ?? null;
}

function colombiaPeriodEnd(now: Date): Date {
  const colombiaOffsetMs = 5 * 60 * 60 * 1000;
  const localClock = new Date(now.getTime() - colombiaOffsetMs);
  localClock.setUTCHours(0, 0, 0, 0);
  return new Date(localClock.getTime() + colombiaOffsetMs);
}

type OwnerReportSnapshot = Omit<OwnerReportSummary, "comparison">;
type OwnerReportScheduleRecord = NonNullable<Awaited<ReturnType<typeof getOwnerReportSchedule>>>;

function compareReportMetric(currentValue: number, previousValue: number): OwnerReportMetricComparison {
  return {
    previousValue,
    change: currentValue - previousValue,
    percentChange: previousValue === 0 ? null : ((currentValue - previousValue) / Math.abs(previousValue)) * 100,
  };
}

async function buildOwnerReportSnapshot(periodStart: Date, periodEnd: Date): Promise<OwnerReportSnapshot> {
  const db = await getDb();
  if (!db) throw new Error("Base de datos no disponible");
  const [venueStats, pqrsRows] = await Promise.all([
    getOwnerVenueAnalytics(periodStart, periodEnd),
    db
      .select({ count: sql<number>`COUNT(*)` })
      .from(pqrsTickets)
      .where(and(gte(pqrsTickets.createdAt, periodStart), lte(pqrsTickets.createdAt, periodEnd))),
  ]);
  const venues = venueStats.map(venue => ({
    venueId: venue.venueId,
    venueName: venue.venueName,
    revenue: Number(venue.revenue),
    orderCount: Number(venue.orderCount),
    averageTicket: Number(venue.averageTicket),
  }));
  const deliveredOrderCount = venues.reduce((total, venue) => total + venue.orderCount, 0);
  const totalRevenue = venues.reduce((total, venue) => total + venue.revenue, 0);
  return {
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    venueCount: venues.length,
    activeVenueCount: venueStats.filter(venue => venue.isActive).length,
    deliveredOrderCount,
    totalRevenue,
    averageTicket: deliveredOrderCount > 0 ? totalRevenue / deliveredOrderCount : 0,
    pqrsReceived: Number(pqrsRows[0]?.count ?? 0),
    venues,
  };
}

async function buildOwnerReportSummary(periodStart: Date, periodEnd: Date): Promise<OwnerReportSummary> {
  const previousPeriodEnd = periodStart;
  const previousPeriodStart = new Date(previousPeriodEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
  const [current, previous] = await Promise.all([
    buildOwnerReportSnapshot(periodStart, periodEnd),
    buildOwnerReportSnapshot(previousPeriodStart, previousPeriodEnd),
  ]);
  return {
    ...current,
    comparison: {
      periodStart: previousPeriodStart.toISOString(),
      periodEnd: previousPeriodEnd.toISOString(),
      totalRevenue: compareReportMetric(current.totalRevenue, previous.totalRevenue),
      deliveredOrderCount: compareReportMetric(current.deliveredOrderCount, previous.deliveredOrderCount),
      averageTicket: compareReportMetric(current.averageTicket, previous.averageTicket),
      pqrsReceived: compareReportMetric(current.pqrsReceived, previous.pqrsReceived),
    },
  };
}

async function persistOwnerReport(params: {
  schedule: OwnerReportScheduleRecord;
  source: "scheduled" | "manual";
  reportKey: string;
  now: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("Base de datos no disponible");
  const [existing] = await db
    .select({ id: ownerScheduledReports.id })
    .from(ownerScheduledReports)
    .where(and(eq(ownerScheduledReports.scheduleId, params.schedule.id), eq(ownerScheduledReports.reportKey, params.reportKey)))
    .limit(1);
  if (existing) return { status: "duplicate" as const, reportId: existing.id };

  const periodEnd = colombiaPeriodEnd(params.now);
  const periodStart = new Date(periodEnd.getTime() - 7 * 24 * 60 * 60 * 1000);
  const summary = await buildOwnerReportSummary(periodStart, periodEnd);
  let reportId: number;
  try {
    const result = await db.insert(ownerScheduledReports).values({
      scheduleId: params.schedule.id,
      ownerId: params.schedule.ownerId,
      generationSource: params.source,
      reportKey: params.reportKey,
      periodStart,
      periodEnd,
      summaryJson: JSON.stringify(summary),
    });
    reportId = Number(result[0].insertId);
  } catch (error) {
    if ((error as { code?: string }).code === "ER_DUP_ENTRY") {
      const [duplicate] = await db
        .select({ id: ownerScheduledReports.id })
        .from(ownerScheduledReports)
        .where(and(eq(ownerScheduledReports.scheduleId, params.schedule.id), eq(ownerScheduledReports.reportKey, params.reportKey)))
        .limit(1);
      return { status: "duplicate" as const, reportId: duplicate?.id };
    }
    throw error;
  }

  const sourceLabel = params.source === "scheduled" ? "programado" : "manual";
  await Promise.all([
    db.update(ownerReportSchedules).set({ lastGeneratedAt: params.now, updatedAt: params.now }).where(eq(ownerReportSchedules.id, params.schedule.id)),
    db.insert(ownerNotificationHistory).values({
      ownerId: params.schedule.ownerId,
      type: "scheduled_report",
      title: "Reporte consolidado semanal disponible",
      content: `El reporte ${sourceLabel} del ${periodStart.toLocaleDateString("es-CO")} al ${periodEnd.toLocaleDateString("es-CO")} está listo: ${summary.deliveredOrderCount} pedidos entregados, ${summary.pqrsReceived} PQRS y $${Math.round(summary.totalRevenue).toLocaleString("es-CO")} en ingresos.`,
    }),
    createAuditLog({
      venueId: null,
      userId: params.schedule.ownerId,
      userRole: "owner",
      module: "Reportes Owner",
      action: params.source === "scheduled" ? "OWNER_SCHEDULED_REPORT_GENERATED" : "OWNER_MANUAL_REPORT_GENERATED",
      entity: "owner_scheduled_report",
      entityId: reportId,
      details: JSON.stringify({ scheduleId: params.schedule.id, periodStart: summary.periodStart, periodEnd: summary.periodEnd, source: params.source }),
    }),
  ]);
  return { status: "created" as const, reportId, summary };
}

export async function generateOwnerScheduledReport(taskUid: string, now = new Date()) {
  const schedule = await getOwnerReportScheduleByTaskUid(taskUid);
  if (!schedule || !schedule.isEnabled) return { status: "ignored" as const };
  const periodEnd = colombiaPeriodEnd(now);
  return persistOwnerReport({
    schedule,
    source: "scheduled",
    reportKey: `scheduled:${periodEnd.toISOString()}`,
    now,
  });
}

export async function generateOwnerManualReport(ownerId: number, requestId: string, now = new Date()) {
  const schedule = await getOwnerReportSchedule(ownerId);
  if (!schedule) throw new Error("Configura primero el reporte interno semanal antes de generarlo manualmente.");
  return persistOwnerReport({ schedule, source: "manual", reportKey: `manual:${requestId}`, now });
}

// ─── ONBOARDING & SUPPORT ───────────────────────────────────────────────────

export type OnboardingRole = "owner" | "manager" | "staff";

export async function getUserOnboardingProgress(userId: number, role: OnboardingRole) {
  const db = await getDb();
  if (!db) return null;
  const [progress] = await db
    .select()
    .from(userOnboardingProgress)
    .where(and(eq(userOnboardingProgress.userId, userId), eq(userOnboardingProgress.role, role)))
    .limit(1);
  return progress ?? null;
}

export async function getOnboardingAnalytics() {
  const db = await getDb();
  const empty = { total: 0, started: 0, completed: 0, skipped: 0, pending: 0, completionRate: 0 };
  if (!db) return { overall: empty, byRole: { owner: empty, manager: empty, staff: empty } };
  const eligibleRoles: OnboardingRole[] = ["owner", "manager", "staff"];
  const [eligibleUsers, progressRows] = await Promise.all([
    db.select({ id: users.id, role: users.role }).from(users).where(inArray(users.role, eligibleRoles)),
    db.select().from(userOnboardingProgress),
  ]);
  const progressByUserRole = new Map(progressRows.map(row => [`${row.userId}:${row.role}`, row]));
  const createMetric = () => ({ total: 0, started: 0, completed: 0, skipped: 0, pending: 0, completionRate: 0 });
  const byRole = { owner: createMetric(), manager: createMetric(), staff: createMetric() };
  for (const user of eligibleUsers) {
    const role = user.role as OnboardingRole;
    if (!eligibleRoles.includes(role)) continue;
    const metric = byRole[role];
    metric.total += 1;
    const progress = progressByUserRole.get(`${user.id}:${role}`);
    if (!progress) { metric.pending += 1; continue; }
    metric.started += 1;
    if (progress.completedAt) metric.completed += 1;
    else if (progress.suppressAutoOnboarding) metric.skipped += 1;
    else metric.pending += 1;
  }
  for (const metric of Object.values(byRole)) metric.completionRate = metric.total ? Math.round((metric.completed / metric.total) * 100) : 0;
  const overall = Object.values(byRole).reduce((total, metric) => ({
    total: total.total + metric.total,
    started: total.started + metric.started,
    completed: total.completed + metric.completed,
    skipped: total.skipped + metric.skipped,
    pending: total.pending + metric.pending,
    completionRate: 0,
  }), createMetric());
  overall.completionRate = overall.total ? Math.round((overall.completed / overall.total) * 100) : 0;
  return { overall, byRole };
}

export async function markUserOnboardingOpened(userId: number, role: OnboardingRole) {
  const db = await getDb();
  if (!db) throw new Error("Base de datos no disponible");
  const now = new Date();
  await db.insert(userOnboardingProgress).values({ userId, role, lastOpenedAt: now }).onDuplicateKeyUpdate({ set: { lastOpenedAt: now } });
  return getUserOnboardingProgress(userId, role);
}

export async function markUserOnboardingAutoShown(userId: number, role: OnboardingRole) {
  const db = await getDb();
  if (!db) throw new Error("Base de datos no disponible");
  const now = new Date();
  await db.insert(userOnboardingProgress).values({ userId, role, autoShownAt: now, lastOpenedAt: now }).onDuplicateKeyUpdate({ set: { autoShownAt: now, lastOpenedAt: now } });
  return getUserOnboardingProgress(userId, role);
}

export async function setUserOnboardingAutoSuppressed(userId: number, role: OnboardingRole, suppressAutoOnboarding: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Base de datos no disponible");
  const now = new Date();
  await db.insert(userOnboardingProgress).values({ userId, role, suppressAutoOnboarding, lastOpenedAt: now }).onDuplicateKeyUpdate({ set: { suppressAutoOnboarding, lastOpenedAt: now } });
  return getUserOnboardingProgress(userId, role);
}

export async function completeUserOnboarding(userId: number, role: OnboardingRole) {
  const db = await getDb();
  if (!db) throw new Error("Base de datos no disponible");
  const now = new Date();
  await db.insert(userOnboardingProgress).values({ userId, role, completedAt: now, suppressAutoOnboarding: true, lastOpenedAt: now }).onDuplicateKeyUpdate({ set: { completedAt: now, suppressAutoOnboarding: true, lastOpenedAt: now } });
  return getUserOnboardingProgress(userId, role);
}

export async function resetUserOnboarding(userId: number, role: OnboardingRole) {
  const db = await getDb();
  if (!db) throw new Error("Base de datos no disponible");
  const now = new Date();
  await db.insert(userOnboardingProgress).values({ userId, role, autoShownAt: now, completedAt: null, lastOpenedAt: now }).onDuplicateKeyUpdate({ set: { completedAt: null, lastOpenedAt: now } });
}

export async function createSupportTicket(data: {
  reporterId: number;
  venueId: number | null;
  reporterRole: OnboardingRole;
  route: string;
  title: string;
  description: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Base de datos no disponible");
  const result = await db.insert(supportTickets).values(data);
  const ticketId = Number(result[0].insertId);
  if (data.reporterRole !== "owner") {
    const owners = await db.select({ id: users.id }).from(users).where(eq(users.role, "owner"));
    if (owners.length) {
      await db.insert(ownerNotificationHistory).values(owners.map(owner => ({
        ownerId: owner.id,
        type: "support_ticket",
        title: "Nueva incidencia reportada",
        content: `${data.reporterRole === "manager" ? "Un Manager" : "Un integrante del Staff"} reportó “${data.title}” en ${data.route}.`,
      })));
    }
  }
  await createAuditLog({
    venueId: data.venueId,
    userId: data.reporterId,
    userRole: data.reporterRole,
    module: "Ayuda y onboarding",
    action: "SUPPORT_TICKET_CREATED",
    entity: "support_ticket",
    entityId: ticketId,
    details: JSON.stringify({ route: data.route, title: data.title }),
  });
  return ticketId;
}

export async function getSupportTicketsForUser(userId: number, role: OnboardingRole) {
  const db = await getDb();
  if (!db) return [];
  if (role === "owner") return db.select().from(supportTickets).orderBy(desc(supportTickets.createdAt)).limit(25);
  return db.select().from(supportTickets).where(eq(supportTickets.reporterId, userId)).orderBy(desc(supportTickets.createdAt)).limit(12);
}

// ─── HELP ARTICLE INTERACTIONS ───────────────────────────────────────────────

export async function getHelpArticleInteractions(userId: number) {
  const db = await getDb();
  if (!db) return { votes: {} as Record<string, "up" | "down">, favorites: [] as string[] };
  const [feedback, favorites] = await Promise.all([
    db.select({ articleKey: helpArticleFeedback.articleKey, vote: helpArticleFeedback.vote }).from(helpArticleFeedback).where(eq(helpArticleFeedback.userId, userId)),
    db.select({ articleKey: helpArticleFavorites.articleKey }).from(helpArticleFavorites).where(eq(helpArticleFavorites.userId, userId)),
  ]);
  return {
    votes: Object.fromEntries(feedback.map(entry => [entry.articleKey, entry.vote])) as Record<string, "up" | "down">,
    favorites: favorites.map(entry => entry.articleKey),
  };
}

export async function setHelpArticleVote(userId: number, articleKey: string, vote: "up" | "down" | null) {
  const db = await getDb();
  if (!db) throw new Error("Base de datos no disponible");
  if (!vote) {
    await db.delete(helpArticleFeedback).where(and(eq(helpArticleFeedback.userId, userId), eq(helpArticleFeedback.articleKey, articleKey)));
    return null;
  }
  await db.insert(helpArticleFeedback).values({ userId, articleKey, vote }).onDuplicateKeyUpdate({ set: { vote } });
  return vote;
}

export async function toggleHelpArticleFavorite(userId: number, articleKey: string) {
  const db = await getDb();
  if (!db) throw new Error("Base de datos no disponible");
  const [existing] = await db.select({ id: helpArticleFavorites.id }).from(helpArticleFavorites).where(and(eq(helpArticleFavorites.userId, userId), eq(helpArticleFavorites.articleKey, articleKey))).limit(1);
  if (existing) {
    await db.delete(helpArticleFavorites).where(eq(helpArticleFavorites.id, existing.id));
    return false;
  }
  await db.insert(helpArticleFavorites).values({ userId, articleKey });
  return true;
}
