import {
  boolean,
  decimal,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

// ─── USERS (autenticación base) ──────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull(),
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(),
  passwordHash: varchar("passwordHash", { length: 255 }),
  googleId: varchar("googleId", { length: 128 }),
  appleId: varchar("appleId", { length: 128 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["owner", "manager", "staff", "user"]).default("user").notNull(),
  venueId: int("venueId"), // null = owner global
  phone: varchar("phone", { length: 64 }),
  cedula: varchar("cedula", { length: 64 }),
  address: text("address"),
  photoUrl: text("photoUrl"),
  cvUrl: text("cvUrl"),
  resetPasswordToken: varchar("resetPasswordToken", { length: 255 }),
  resetPasswordExpires: timestamp("resetPasswordExpires"),
  mustChangePassword: boolean("mustChangePassword").default(false).notNull(),
  sessionVersion: int("sessionVersion").default(0).notNull(),
  language: varchar("language", { length: 16 }).default("es").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── USER FAVORITE MODULES (accesos personales) ──────────────────────────────
export const userFavoriteModules = mysqlTable(
  "user_favorite_modules",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    moduleKey: varchar("moduleKey", { length: 96 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    userModuleUnique: uniqueIndex("user_favorite_modules_user_module_uq").on(table.userId, table.moduleKey),
  })
);

export type UserFavoriteModule = typeof userFavoriteModules.$inferSelect;

// ─── VENUES (locales) ─────────────────────────────────────────────────────────
export const venues = mysqlTable("venues", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address"),
  phone: varchar("phone", { length: 64 }),
  email: varchar("email", { length: 320 }),
  logoUrl: text("logoUrl"),
  socialLinks: text("socialLinks"), // JSON string
  musicMode: mysqlEnum("musicMode", ["auto", "manual"]).default("manual").notNull(),
  musicProvider: mysqlEnum("musicProvider", ["manual", "spotify", "youtube", "soundcloud"]).default("manual").notNull(),
  musicConnectionStatus: mysqlEnum("musicConnectionStatus", ["not_configured", "pending", "connected"]).default("not_configured").notNull(),
  karaokeProviders: text("karaokeProviders"), // JSON: proveedores de búsqueda definidos por este local
  isActive: boolean("isActive").default(true).notNull(),
  privacyPolicyAccepted: boolean("privacyPolicyAccepted").default(false).notNull(),
  privacyPolicyAcceptedAt: timestamp("privacyPolicyAcceptedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Venue = typeof venues.$inferSelect;
export type InsertVenue = typeof venues.$inferInsert;

// ─── TABLES (mesas) ───────────────────────────────────────────────────────────
export const tables = mysqlTable("tables", {
  id: int("id").autoincrement().primaryKey(),
  venueId: int("venueId").notNull(),
  name: varchar("name", { length: 64 }).notNull(), // "Mesa 1", "VIP-A", etc.
  qrToken: varchar("qrToken", { length: 128 }).notNull().unique(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Table = typeof tables.$inferSelect;
export type InsertTable = typeof tables.$inferInsert;

// ─── QR SESSIONS (sesiones de cliente por QR) ─────────────────────────────────
export const qrSessions = mysqlTable("qr_sessions", {
  id: int("id").autoincrement().primaryKey(),
  tableId: int("tableId").notNull(),
  venueId: int("venueId").notNull(),
  clientName: varchar("clientName", { length: 128 }).notNull(),
  sessionToken: varchar("sessionToken", { length: 128 }).notNull().unique(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  closedAt: timestamp("closedAt"),
});

export type QrSession = typeof qrSessions.$inferSelect;
export type InsertQrSession = typeof qrSessions.$inferInsert;

// ─── MENU CATEGORIES ──────────────────────────────────────────────────────────
export const menuCategories = mysqlTable("menu_categories", {
  id: int("id").autoincrement().primaryKey(),
  venueId: int("venueId").notNull(),
  name: varchar("name", { length: 128 }).notNull(),
  description: text("description"),
  sortOrder: int("sortOrder").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MenuCategory = typeof menuCategories.$inferSelect;
export type InsertMenuCategory = typeof menuCategories.$inferInsert;

// ─── MENU ITEMS ───────────────────────────────────────────────────────────────
export const menuItems = mysqlTable("menu_items", {
  id: int("id").autoincrement().primaryKey(),
  venueId: int("venueId").notNull(),
  categoryId: int("categoryId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  cost: decimal("cost", { precision: 10, scale: 2 }), // confidencial, solo Manager
  imageUrl: text("imageUrl"),
  isAvailable: boolean("isAvailable").default(true).notNull(),
  isAlcoholic: boolean("isAlcoholic").default(false).notNull(),
  taxIncluded: boolean("taxIncluded").default(true).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MenuItem = typeof menuItems.$inferSelect;
export type InsertMenuItem = typeof menuItems.$inferInsert;

// ─── ORDERS ───────────────────────────────────────────────────────────────────
export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  venueId: int("venueId").notNull(),
  tableId: int("tableId").notNull(),
  sessionId: int("sessionId").notNull(),
  clientName: varchar("clientName", { length: 128 }).notNull(),
  status: mysqlEnum("status", ["pending", "preparing", "delivered", "cancelled"]).default("pending").notNull(),
  totalAmount: decimal("totalAmount", { precision: 10, scale: 2 }).default("0").notNull(),
  totalCost: decimal("totalCost", { precision: 10, scale: 2 }).default("0").notNull(),
  ageConfirmed: boolean("ageConfirmed").default(false).notNull(),
  invoiceStatus: mysqlEnum("invoiceStatus", ["pending", "issued", "not_applicable"]).default("not_applicable").notNull(),
  invoiceNumber: varchar("invoiceNumber", { length: 64 }),
  handledByUserId: int("handledByUserId"), // staff que gestionó
  completedAt: timestamp("completedAt"),
  cancelledAt: timestamp("cancelledAt"),
  cancelReason: text("cancelReason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

// ─── ORDER ITEMS ──────────────────────────────────────────────────────────────
export const orderItems = mysqlTable("order_items", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  menuItemId: int("menuItemId").notNull(),
  menuItemName: varchar("menuItemName", { length: 255 }).notNull(), // snapshot
  quantity: int("quantity").notNull().default(1),
  unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }).notNull(),
  unitCost: decimal("unitCost", { precision: 10, scale: 2 }),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = typeof orderItems.$inferInsert;

// ─── MUSIC REQUESTS ───────────────────────────────────────────────────────────
export const musicRequests = mysqlTable("music_requests", {
  id: int("id").autoincrement().primaryKey(),
  venueId: int("venueId").notNull(),
  sessionId: int("sessionId").notNull(),
  clientName: varchar("clientName", { length: 128 }).notNull(),
  songTitle: varchar("songTitle", { length: 255 }).notNull(),
  artist: varchar("artist", { length: 255 }),
  spotifyUri: varchar("spotifyUri", { length: 255 }),
  status: mysqlEnum("status", ["queued", "playing", "played", "rejected"]).default("queued").notNull(),
  handledByUserId: int("handledByUserId"),
  playedAt: timestamp("playedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MusicRequest = typeof musicRequests.$inferSelect;
export type InsertMusicRequest = typeof musicRequests.$inferInsert;

// ─── AUDIT LOG ────────────────────────────────────────────────────────────────
export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  venueId: int("venueId"), // null = acción global
  userId: int("userId"),
  userRole: varchar("userRole", { length: 32 }),
  module: varchar("module", { length: 64 }).default("Sistema").notNull(),
  action: varchar("action", { length: 128 }).notNull(),
  entity: varchar("entity", { length: 64 }),
  entityId: int("entityId"),
  details: text("details"), // JSON
  ipAddress: varchar("ipAddress", { length: 64 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

// ─── ACCESS REQUESTS (solicitudes de módulos protegidos) ───────────────────────
export const accessRequests = mysqlTable(
  "access_requests",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    venueId: int("venueId"),
    requesterRole: varchar("requesterRole", { length: 32 }).notNull(),
    targetPath: varchar("targetPath", { length: 128 }).notNull(),
    moduleName: varchar("moduleName", { length: 128 }).notNull(),
    status: mysqlEnum("status", ["pending", "reviewed", "approved", "rejected"]).default("pending").notNull(),
    reviewedByOwnerId: int("reviewedByOwnerId"),
    decisionReason: text("decisionReason"),
    internalComment: text("internalComment"),
    reviewedAt: timestamp("reviewedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    pendingRequestUnique: uniqueIndex("access_requests_user_target_status_uq").on(table.userId, table.targetPath, table.status),
  })
);

export type AccessRequest = typeof accessRequests.$inferSelect;
export type InsertAccessRequest = typeof accessRequests.$inferInsert;

// ─── STAFF ACTIVITIES ──────────────────────────────────────────────────────────
export const staffActivities = mysqlTable("staff_activities", {
  id: int("id").autoincrement().primaryKey(),
  venueId: int("venueId").notNull(),
  assignedToUserId: int("assignedToUserId").notNull(),
  assignedByUserId: int("assignedByUserId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["pending", "in_progress", "completed"]).default("pending").notNull(),
  completionComment: text("completionComment"),
  evidenceImageUrl: text("evidenceImageUrl"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type StaffActivity = typeof staffActivities.$inferSelect;
export type InsertStaffActivity = typeof staffActivities.$inferInsert;

// ─── ORDER STATUS HISTORY ─────────────────────────────────────────────────────
export const orderStatusHistory = mysqlTable("order_status_history", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  previousStatus: mysqlEnum("previousStatus", ["pending", "preparing", "delivered", "cancelled"]),
  newStatus: mysqlEnum("newStatus", ["pending", "preparing", "delivered", "cancelled"]).notNull(),
  changedByUserId: int("changedByUserId").notNull(),
  changedByUserName: varchar("changedByUserName", { length: 255 }),
  reason: text("reason"), // motivo del cambio (ej: cancelación)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OrderStatusHistory = typeof orderStatusHistory.$inferSelect;
export type InsertOrderStatusHistory = typeof orderStatusHistory.$inferInsert;

// ─── PQRS (peticiones, quejas, reclamos y sugerencias) ───────────────────────
export const pqrsTickets = mysqlTable("pqrs_tickets", {
  id: int("id").autoincrement().primaryKey(),
  venueId: int("venueId").notNull(),
  tableId: int("tableId").notNull(),
  sessionId: int("sessionId").notNull(),
  clientName: varchar("clientName", { length: 128 }).notNull(),
  type: mysqlEnum("type", ["petition", "complaint", "claim", "suggestion", "congratulation"]).notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  message: text("message").notNull(),
  status: mysqlEnum("status", ["open", "in_review", "resolved", "closed"]).default("open").notNull(),
  response: text("response"),
  respondedByUserId: int("respondedByUserId"),
  respondedAt: timestamp("respondedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PqrsTicket = typeof pqrsTickets.$inferSelect;
export type InsertPqrsTicket = typeof pqrsTickets.$inferInsert;

// ─── PQRS SLA TARGETS (objetivos de respuesta por local y tipo) ───────────────
export const pqrsSlaTargets = mysqlTable(
  "pqrs_sla_targets",
  {
    id: int("id").autoincrement().primaryKey(),
    venueId: int("venueId").notNull(),
    type: mysqlEnum("type", ["petition", "complaint", "claim", "suggestion", "congratulation"]).notNull(),
    targetMinutes: int("targetMinutes").notNull().default(1440),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    venueTypeUnique: uniqueIndex("pqrs_sla_targets_venue_type_uq").on(table.venueId, table.type),
  })
);

export type PqrsSlaTarget = typeof pqrsSlaTargets.$inferSelect;
export type InsertPqrsSlaTarget = typeof pqrsSlaTargets.$inferInsert;

// ─── VENUE REQUESTS (solicitudes de empresas por managers) ────────────────────
export const venueRequests = mysqlTable("venue_requests", {
  id: int("id").autoincrement().primaryKey(),
  managerId: int("managerId").notNull(),
  venueName: varchar("venueName", { length: 255 }).notNull(),
  venueAddress: text("venueAddress"),
  venuePhone: varchar("venuePhone", { length: 64 }),
  venueEmail: varchar("venueEmail", { length: 320 }),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  rejectionReason: text("rejectionReason"),
  approvedAt: timestamp("approvedAt"),
  approvedByOwnerId: int("approvedByOwnerId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type VenueRequest = typeof venueRequests.$inferSelect;
export type InsertVenueRequest = typeof venueRequests.$inferInsert;

// ─── SONG QUEUE (cola de canciones) ──────────────────────────────────────────
export const songQueue = mysqlTable("song_queue", {
  id: int("id").autoincrement().primaryKey(),
  venueId: int("venueId").notNull(),
  spotifyTrackId: varchar("spotifyTrackId", { length: 255 }),
  songName: varchar("songName", { length: 255 }).notNull(),
  artist: varchar("artist", { length: 255 }).notNull(),
  duration: int("duration"), // en segundos
  isCurrentlyPlaying: boolean("isCurrentlyPlaying").default(false).notNull(),
  position: int("position").notNull(), // posición en la cola
  addedByTableId: int("addedByTableId"),
  addedByTableName: varchar("addedByTableName", { length: 255 }),
  karaokeUrl: varchar("karaokeUrl", { length: 2048 }),
  karaokeProviderName: varchar("karaokeProviderName", { length: 128 }),
  karaokeSavedByUserId: int("karaokeSavedByUserId"),
  karaokeSavedAt: timestamp("karaokeSavedAt"),
  playedAt: timestamp("playedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type SongQueue = typeof songQueue.$inferSelect;
export type InsertSongQueue = typeof songQueue.$inferInsert;

// ─── APPLAUSE VOTES (aplausos por mesa) ──────────────────────────────────────
export const appauseVotes = mysqlTable("applause_votes", {
  id: int("id").autoincrement().primaryKey(),
  venueId: int("venueId").notNull(),
  songId: int("songId").notNull(),
  votingTableId: int("votingTableId").notNull(),
  votingTableName: varchar("votingTableName", { length: 255 }),
  performingTableId: int("performingTableId"),
  performingTableName: varchar("performingTableName", { length: 255 }),
  rating: int("rating").notNull(), // 1-5 estrellas
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AppauseVote = typeof appauseVotes.$inferSelect;
export type InsertAppauseVote = typeof appauseVotes.$inferInsert;

// ─── NOTIFICATION SETTINGS ───────────────────────────────────────────────────
export const venueNotificationSettings = mysqlTable("venue_notification_settings", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull().unique(),
  enabled: boolean("enabled").default(true).notNull(),
  emailNotifications: boolean("emailNotifications").default(true).notNull(),
  notificationEmail: varchar("notificationEmail", { length: 320 }),
  notificationPhone: varchar("notificationPhone", { length: 64 }),
  senderAccountEmail: varchar("senderAccountEmail", { length: 320 }),
  soundType: varchar("soundType", { length: 64 }).default("chime").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type VenueNotificationSettings = typeof venueNotificationSettings.$inferSelect;
export type InsertVenueNotificationSettings = typeof venueNotificationSettings.$inferInsert;

// ─── OWNER NOTIFICATION HISTORY ──────────────────────────────────────────────
export const ownerNotificationHistory = mysqlTable("owner_notification_history", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  type: varchar("type", { length: 64 }).default("venue_request").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  relatedRequestId: int("relatedRequestId"),
  isRead: boolean("isRead").default(false).notNull(),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OwnerNotificationHistory = typeof ownerNotificationHistory.$inferSelect;
export type InsertOwnerNotificationHistory = typeof ownerNotificationHistory.$inferInsert;

// ─── USER NOTIFICATION HISTORY (decisiones y avisos personales) ───────────────
export const userNotificationHistory = mysqlTable("user_notification_history", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: varchar("type", { length: 64 }).default("system").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  relatedAccessRequestId: int("relatedAccessRequestId"),
  isRead: boolean("isRead").default(false).notNull(),
  readAt: timestamp("readAt"),
  isArchived: boolean("isArchived").default(false).notNull(),
  archivedAt: timestamp("archivedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type UserNotificationHistory = typeof userNotificationHistory.$inferSelect;
export type InsertUserNotificationHistory = typeof userNotificationHistory.$inferInsert;

// ─── TEST MODE INCIDENTS (hallazgos capturados por Owner) ────────────────────
export const testModeIncidents = mysqlTable("test_mode_incidents", {
  id: int("id").autoincrement().primaryKey(),
  ownerId: int("ownerId").notNull(),
  venueId: int("venueId").notNull(),
  previewRole: mysqlEnum("previewRole", ["manager", "staff"]).notNull(),
  route: varchar("route", { length: 255 }).notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  description: text("description").notNull(),
  status: mysqlEnum("status", ["open", "resolved"]).default("open").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  resolvedAt: timestamp("resolvedAt"),
});

export type TestModeIncident = typeof testModeIncidents.$inferSelect;

// ─── OWNER SCHEDULED REPORTS (configuración y copias internas) ────────────────
export const ownerReportSchedules = mysqlTable(
  "owner_report_schedules",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: int("ownerId").notNull(),
    frequency: mysqlEnum("frequency", ["weekly"]).default("weekly").notNull(),
    weekday: int("weekday").default(1).notNull(), // 1 = lunes, ISO-8601
    hour: int("hour").default(8).notNull(), // Hora local de Colombia
    minute: int("minute").default(0).notNull(),
    timezone: varchar("timezone", { length: 64 }).default("America/Bogota").notNull(),
    cronExpression: varchar("cronExpression", { length: 64 }).default("0 0 13 * * 1").notNull(),
    scheduleCronTaskUid: varchar("scheduleCronTaskUid", { length: 128 }),
    isEnabled: boolean("isEnabled").default(false).notNull(),
    lastGeneratedAt: timestamp("lastGeneratedAt"),
    nextExecutionAt: timestamp("nextExecutionAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    ownerScheduleUnique: uniqueIndex("owner_report_schedules_owner_unique").on(table.ownerId),
    taskUidUnique: uniqueIndex("owner_report_schedules_task_uid_unique").on(table.scheduleCronTaskUid),
  })
);

export type OwnerReportSchedule = typeof ownerReportSchedules.$inferSelect;
export type InsertOwnerReportSchedule = typeof ownerReportSchedules.$inferInsert;

export const ownerScheduledReports = mysqlTable(
  "owner_scheduled_reports",
  {
    id: int("id").autoincrement().primaryKey(),
    scheduleId: int("scheduleId").notNull(),
    ownerId: int("ownerId").notNull(),
    generationSource: mysqlEnum("generationSource", ["scheduled", "manual"]).default("scheduled").notNull(),
    reportKey: varchar("reportKey", { length: 128 }).notNull(),
    periodStart: timestamp("periodStart").notNull(),
    periodEnd: timestamp("periodEnd").notNull(),
    summaryJson: text("summaryJson").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    reportKeyUnique: uniqueIndex("owner_scheduled_reports_key_unique").on(table.scheduleId, table.reportKey),
  })
);

export type OwnerScheduledReport = typeof ownerScheduledReports.$inferSelect;
export type InsertOwnerScheduledReport = typeof ownerScheduledReports.$inferInsert;

// ─── USER ONBOARDING & SUPPORT ──────────────────────────────────────────────
export const userOnboardingProgress = mysqlTable(
  "user_onboarding_progress",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    role: mysqlEnum("role", ["owner", "manager", "staff"]).notNull(),
    autoShownAt: timestamp("autoShownAt"),
    suppressAutoOnboarding: boolean("suppressAutoOnboarding").default(false).notNull(),
    completedAt: timestamp("completedAt"),
    lastOpenedAt: timestamp("lastOpenedAt").defaultNow().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    userRoleUnique: uniqueIndex("user_onboarding_progress_user_role_unique").on(table.userId, table.role),
  })
);

export type UserOnboardingProgress = typeof userOnboardingProgress.$inferSelect;

export const supportTickets = mysqlTable("support_tickets", {
  id: int("id").autoincrement().primaryKey(),
  reporterId: int("reporterId").notNull(),
  venueId: int("venueId"),
  reporterRole: mysqlEnum("reporterRole", ["owner", "manager", "staff"]).notNull(),
  route: varchar("route", { length: 255 }).notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  description: text("description").notNull(),
  status: mysqlEnum("status", ["open", "in_review", "resolved"]).default("open").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SupportTicket = typeof supportTickets.$inferSelect;

// ─── HELP ARTICLE INTERACTIONS ───────────────────────────────────────────────
export const helpArticleFeedback = mysqlTable(
  "help_article_feedback",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    articleKey: varchar("articleKey", { length: 96 }).notNull(),
    vote: mysqlEnum("vote", ["up", "down"]).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    userArticleUnique: uniqueIndex("help_article_feedback_user_article_unique").on(table.userId, table.articleKey),
  })
);

export type HelpArticleFeedback = typeof helpArticleFeedback.$inferSelect;

export const helpArticleFavorites = mysqlTable(
  "help_article_favorites",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    articleKey: varchar("articleKey", { length: 96 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    userArticleUnique: uniqueIndex("help_article_favorites_user_article_unique").on(table.userId, table.articleKey),
  })
);

export type HelpArticleFavorite = typeof helpArticleFavorites.$inferSelect;
