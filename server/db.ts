import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
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
  venueRequests,
  venues,
  venueNotificationSettings,
  ownerNotificationHistory,
} from "../drizzle/schema";
import { ENV } from "./_core/env";
import { notifyOwner } from "./_core/notification";

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
  
  // Obtener el estado anterior
  const [currentOrder] = await db.select().from(orders).where(and(eq(orders.id, id), eq(orders.venueId, venueId))).limit(1);
  if (!currentOrder) return false;
  const previousStatus = currentOrder?.status;
  
  const update: Record<string, unknown> = { status };
  if (handledByUserId) update.handledByUserId = handledByUserId;
  if (status === "delivered") update.completedAt = new Date();
  if (status === "cancelled") {
    update.cancelledAt = new Date();
    if (cancelReason) update.cancelReason = cancelReason;
  }
  await db.update(orders).set(update).where(and(eq(orders.id, id), eq(orders.venueId, venueId)));
  
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
  return true;
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

export async function updateSongMetadataForVenue(songId: number, venueId: number, songName: string, artist: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.update(songQueue).set({ songName, artist }).where(and(eq(songQueue.id, songId), eq(songQueue.venueId, venueId)));
  return (result[0] as { affectedRows: number }).affectedRows > 0;
}

export async function updateCurrentSong(venueId: number, songId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  const [targetSong] = await db.select().from(songQueue).where(and(eq(songQueue.id, songId), eq(songQueue.venueId, venueId))).limit(1);
  if (!targetSong) return false;
  
  // Marcar la canción anterior como tocada
  await db.update(songQueue).set({ isCurrentlyPlaying: false, playedAt: new Date() }).where(
    and(eq(songQueue.venueId, venueId), eq(songQueue.isCurrentlyPlaying, true))
  );
  
  // Marcar la nueva canción como tocándose
  await db.update(songQueue).set({ isCurrentlyPlaying: true }).where(and(eq(songQueue.id, songId), eq(songQueue.venueId, venueId)));
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
  await db
    .update(users)
    .set({ resetPasswordToken: token, resetPasswordExpires: expires })
    .where(eq(users.email, email));
  return true;
}

export async function getUserByResetToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.resetPasswordToken, token)).limit(1);
  return result[0];
}

export async function updateUserPassword(userId: number, passwordHash: string) {
  const db = await getDb();
  if (!db) return;
  await db
    .update(users)
    .set({ passwordHash, resetPasswordToken: null, resetPasswordExpires: null })
    .where(eq(users.id, userId));
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
