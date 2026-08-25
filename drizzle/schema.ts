import {
  boolean,
  decimal,
  index,
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

// ─── INVENTORY ────────────────────────────────────────────────────────────────
// Todas las existencias se normalizan en una unidad base por dimensión:
// unidad (conteo), ml (volumen) o g (masa). Esto hace exactas las recetas y
// permite capturar cajas, litros y onzas sin mezclar medidas incompatibles.
export const inventoryItems = mysqlTable(
  "inventory_items",
  {
    id: int("id").autoincrement().primaryKey(),
    venueId: int("venueId").notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    sku: varchar("sku", { length: 96 }),
    family: varchar("family", { length: 100 }),
    dimension: mysqlEnum("dimension", ["count", "volume", "mass"]).notNull(),
    baseUnit: mysqlEnum("baseUnit", ["unit", "ml", "g"]).notNull(),
    currentStockBase: decimal("currentStockBase", { precision: 14, scale: 4 }).default("0").notNull(),
    averageUnitCostBase: decimal("averageUnitCostBase", { precision: 14, scale: 6 }).default("0").notNull(),
    reorderPointBase: decimal("reorderPointBase", { precision: 14, scale: 4 }).default("0").notNull(),
    isPerishable: boolean("isPerishable").default(false).notNull(),
    expiryAlertDays: int("expiryAlertDays").default(7).notNull(),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    venueIndex: index("inventory_items_venue_idx").on(table.venueId),
    venueSkuUnique: uniqueIndex("inventory_items_venue_sku_uq").on(table.venueId, table.sku),
  })
);

export type InventoryItem = typeof inventoryItems.$inferSelect;
export type InsertInventoryItem = typeof inventoryItems.$inferInsert;

export const inventoryRecipes = mysqlTable(
  "inventory_recipes",
  {
    id: int("id").autoincrement().primaryKey(),
    venueId: int("venueId").notNull(),
    menuItemId: int("menuItemId").notNull(),
    name: varchar("name", { length: 160 }),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    venueIndex: index("inventory_recipes_venue_idx").on(table.venueId),
    menuItemUnique: uniqueIndex("inventory_recipes_menu_item_uq").on(table.menuItemId),
  })
);

export type InventoryRecipe = typeof inventoryRecipes.$inferSelect;
export type InsertInventoryRecipe = typeof inventoryRecipes.$inferInsert;

export const inventoryRecipeLines = mysqlTable(
  "inventory_recipe_lines",
  {
    id: int("id").autoincrement().primaryKey(),
    recipeId: int("recipeId").notNull(),
    inventoryItemId: int("inventoryItemId").notNull(),
    quantityBase: decimal("quantityBase", { precision: 14, scale: 4 }).notNull(),
    displayQuantity: decimal("displayQuantity", { precision: 14, scale: 4 }).notNull(),
    displayUnit: varchar("displayUnit", { length: 24 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    recipeIndex: index("inventory_recipe_lines_recipe_idx").on(table.recipeId),
    recipeItemUnique: uniqueIndex("inventory_recipe_lines_recipe_item_uq").on(table.recipeId, table.inventoryItemId),
  })
);

export type InventoryRecipeLine = typeof inventoryRecipeLines.$inferSelect;
export type InsertInventoryRecipeLine = typeof inventoryRecipeLines.$inferInsert;

export const inventoryMovements = mysqlTable(
  "inventory_movements",
  {
    id: int("id").autoincrement().primaryKey(),
    venueId: int("venueId").notNull(),
    inventoryItemId: int("inventoryItemId").notNull(),
    movementType: mysqlEnum("movementType", ["initial", "restock", "adjustment", "order_delivery", "order_reversal", "waste"]).notNull(),
    quantityBase: decimal("quantityBase", { precision: 14, scale: 4 }).notNull(),
    stockAfterBase: decimal("stockAfterBase", { precision: 14, scale: 4 }).notNull(),
    sourceQuantity: decimal("sourceQuantity", { precision: 14, scale: 4 }),
    sourceUnit: varchar("sourceUnit", { length: 24 }),
    packBaseQuantity: decimal("packBaseQuantity", { precision: 14, scale: 4 }),
    unitCostBase: decimal("unitCostBase", { precision: 14, scale: 6 }),
    totalCost: decimal("totalCost", { precision: 14, scale: 4 }),
    orderId: int("orderId"),
    performedByUserId: int("performedByUserId"),
    note: text("note"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    venueIndex: index("inventory_movements_venue_idx").on(table.venueId, table.createdAt),
    itemIndex: index("inventory_movements_item_idx").on(table.inventoryItemId, table.createdAt),
    orderItemTypeUnique: uniqueIndex("inventory_movements_order_item_type_uq").on(table.orderId, table.inventoryItemId, table.movementType),
  })
);

export type InventoryMovement = typeof inventoryMovements.$inferSelect;
export type InsertInventoryMovement = typeof inventoryMovements.$inferInsert;

export const inventoryAlerts = mysqlTable(
  "inventory_alerts",
  {
    id: int("id").autoincrement().primaryKey(),
    venueId: int("venueId").notNull(),
    inventoryItemId: int("inventoryItemId").notNull(),
    status: mysqlEnum("status", ["active", "resolved"]).default("active").notNull(),
    triggeredStockBase: decimal("triggeredStockBase", { precision: 14, scale: 4 }).notNull(),
    resolvedAt: timestamp("resolvedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    venueStatusIndex: index("inventory_alerts_venue_status_idx").on(table.venueId, table.status),
    itemIndex: index("inventory_alerts_item_idx").on(table.inventoryItemId),
  })
);

export type InventoryAlert = typeof inventoryAlerts.$inferSelect;
export type InsertInventoryAlert = typeof inventoryAlerts.$inferInsert;

export const inventoryWastes = mysqlTable(
  "inventory_wastes",
  {
    id: int("id").autoincrement().primaryKey(),
    venueId: int("venueId").notNull(),
    inventoryItemId: int("inventoryItemId").notNull(),
    inventoryLotId: int("inventoryLotId").notNull(),
    quantityBase: decimal("quantityBase", { precision: 14, scale: 4 }).notNull(),
    unitCostBase: decimal("unitCostBase", { precision: 14, scale: 6 }).notNull(),
    totalCost: decimal("totalCost", { precision: 14, scale: 4 }).notNull(),
    reason: mysqlEnum("reason", ["expired"]).notNull(),
    note: text("note"),
    performedByUserId: int("performedByUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    venueIndex: index("inventory_wastes_venue_idx").on(table.venueId, table.createdAt),
    lotIndex: index("inventory_wastes_lot_idx").on(table.inventoryLotId),
  })
);

export type InventoryWaste = typeof inventoryWastes.$inferSelect;
export type InsertInventoryWaste = typeof inventoryWastes.$inferInsert;

export const inventoryPhysicalCounts = mysqlTable(
  "inventory_physical_counts",
  {
    id: int("id").autoincrement().primaryKey(),
    venueId: int("venueId").notNull(),
    status: mysqlEnum("status", ["draft", "in_progress", "pending_approval", "ready_to_reconcile", "reconciled", "rejected", "cancelled"]).default("draft").notNull(),
    notes: text("notes"),
    templateId: int("templateId"),
    createdByUserId: int("createdByUserId").notNull(),
    startedAt: timestamp("startedAt"),
    submittedAt: timestamp("submittedAt"),
    submittedByUserId: int("submittedByUserId"),
    totalVarianceCost: decimal("totalVarianceCost", { precision: 14, scale: 4 }).default("0").notNull(),
    approvalRequired: boolean("approvalRequired").default(false).notNull(),
    approvalThresholdCost: decimal("approvalThresholdCost", { precision: 14, scale: 4 }),
    approvalDecisionAt: timestamp("approvalDecisionAt"),
    approvalDecisionByUserId: int("approvalDecisionByUserId"),
    reconciledAt: timestamp("reconciledAt"),
    reconciledByUserId: int("reconciledByUserId"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    venueStatusIndex: index("inventory_physical_counts_venue_status_idx").on(table.venueId, table.status, table.createdAt),
  })
);

export type InventoryPhysicalCount = typeof inventoryPhysicalCounts.$inferSelect;
export type InsertInventoryPhysicalCount = typeof inventoryPhysicalCounts.$inferInsert;

export const inventoryPhysicalCountLines = mysqlTable(
  "inventory_physical_count_lines",
  {
    id: int("id").autoincrement().primaryKey(),
    physicalCountId: int("physicalCountId").notNull(),
    inventoryItemId: int("inventoryItemId").notNull(),
    systemStockBase: decimal("systemStockBase", { precision: 14, scale: 4 }).notNull(),
    physicalStockBase: decimal("physicalStockBase", { precision: 14, scale: 4 }),
    varianceBase: decimal("varianceBase", { precision: 14, scale: 4 }),
    unitCostBaseSnapshot: decimal("unitCostBaseSnapshot", { precision: 14, scale: 6 }).default("0").notNull(),
    varianceCost: decimal("varianceCost", { precision: 14, scale: 4 }).default("0").notNull(),
    countedByUserId: int("countedByUserId"),
    countedAt: timestamp("countedAt"),
    note: text("note"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    countItemUnique: uniqueIndex("inventory_physical_count_line_uq").on(table.physicalCountId, table.inventoryItemId),
    countIndex: index("inventory_physical_count_lines_count_idx").on(table.physicalCountId),
    itemIndex: index("inventory_physical_count_lines_item_idx").on(table.inventoryItemId),
  })
);

export type InventoryPhysicalCountLine = typeof inventoryPhysicalCountLines.$inferSelect;
export type InsertInventoryPhysicalCountLine = typeof inventoryPhysicalCountLines.$inferInsert;

export const inventoryControlSettings = mysqlTable(
  "inventory_control_settings",
  {
    id: int("id").autoincrement().primaryKey(),
    venueId: int("venueId").notNull(),
    dualApprovalEnabled: boolean("dualApprovalEnabled").default(false).notNull(),
    dualApprovalThresholdCost: decimal("dualApprovalThresholdCost", { precision: 14, scale: 4 }).default("0").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({ venueUnique: uniqueIndex("inventory_control_settings_venue_uq").on(table.venueId) })
);

export type InventoryControlSettings = typeof inventoryControlSettings.$inferSelect;
export type InsertInventoryControlSettings = typeof inventoryControlSettings.$inferInsert;

export const inventoryCountTemplates = mysqlTable(
  "inventory_count_templates",
  {
    id: int("id").autoincrement().primaryKey(),
    venueId: int("venueId").notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    isActive: boolean("isActive").default(true).notNull(),
    createdByUserId: int("createdByUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({ venueNameUnique: uniqueIndex("inventory_count_templates_venue_name_uq").on(table.venueId, table.name) })
);

export type InventoryCountTemplate = typeof inventoryCountTemplates.$inferSelect;
export type InsertInventoryCountTemplate = typeof inventoryCountTemplates.$inferInsert;

export const inventoryCountTemplateFamilies = mysqlTable(
  "inventory_count_template_families",
  {
    id: int("id").autoincrement().primaryKey(),
    templateId: int("templateId").notNull(),
    family: varchar("family", { length: 100 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({ templateFamilyUnique: uniqueIndex("inventory_count_template_family_uq").on(table.templateId, table.family), templateIndex: index("inventory_count_template_families_template_idx").on(table.templateId) })
);

export type InventoryCountTemplateFamily = typeof inventoryCountTemplateFamilies.$inferSelect;
export type InsertInventoryCountTemplateFamily = typeof inventoryCountTemplateFamilies.$inferInsert;

export const inventoryPhysicalCountApprovals = mysqlTable(
  "inventory_physical_count_approvals",
  {
    id: int("id").autoincrement().primaryKey(),
    venueId: int("venueId").notNull(),
    physicalCountId: int("physicalCountId").notNull(),
    status: mysqlEnum("status", ["approved", "rejected"]).notNull(),
    approverUserId: int("approverUserId").notNull(),
    totalVarianceCost: decimal("totalVarianceCost", { precision: 14, scale: 4 }).notNull(),
    thresholdCost: decimal("thresholdCost", { precision: 14, scale: 4 }).notNull(),
    note: text("note"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({ countUnique: uniqueIndex("inventory_physical_count_approval_uq").on(table.physicalCountId), venueIndex: index("inventory_physical_count_approvals_venue_idx").on(table.venueId, table.createdAt) })
);

export type InventoryPhysicalCountApproval = typeof inventoryPhysicalCountApprovals.$inferSelect;
export type InsertInventoryPhysicalCountApproval = typeof inventoryPhysicalCountApprovals.$inferInsert;

export const inventorySuppliers = mysqlTable(
  "inventory_suppliers",
  {
    id: int("id").autoincrement().primaryKey(),
    venueId: int("venueId").notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    contactName: varchar("contactName", { length: 160 }),
    email: varchar("email", { length: 320 }),
    phone: varchar("phone", { length: 64 }),
    address: text("address"),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    venueIndex: index("inventory_suppliers_venue_idx").on(table.venueId, table.name),
  })
);

export type InventorySupplier = typeof inventorySuppliers.$inferSelect;
export type InsertInventorySupplier = typeof inventorySuppliers.$inferInsert;

export const inventoryPurchases = mysqlTable(
  "inventory_purchases",
  {
    id: int("id").autoincrement().primaryKey(),
    venueId: int("venueId").notNull(),
    supplierId: int("supplierId"),
    purchaseOrderId: int("purchaseOrderId"),
    reference: varchar("reference", { length: 128 }),
    receivedAt: timestamp("receivedAt").defaultNow().notNull(),
    totalCost: decimal("totalCost", { precision: 12, scale: 2 }).default("0").notNull(),
    notes: text("notes"),
    createdByUserId: int("createdByUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    venueIndex: index("inventory_purchases_venue_idx").on(table.venueId, table.receivedAt),
    supplierIndex: index("inventory_purchases_supplier_idx").on(table.supplierId),
  })
);

export type InventoryPurchase = typeof inventoryPurchases.$inferSelect;
export type InsertInventoryPurchase = typeof inventoryPurchases.$inferInsert;

export const inventoryPurchaseLines = mysqlTable(
  "inventory_purchase_lines",
  {
    id: int("id").autoincrement().primaryKey(),
    purchaseId: int("purchaseId").notNull(),
    purchaseOrderLineId: int("purchaseOrderLineId"),
    inventoryItemId: int("inventoryItemId").notNull(),
    quantityBase: decimal("quantityBase", { precision: 14, scale: 4 }).notNull(),
    sourceQuantity: decimal("sourceQuantity", { precision: 14, scale: 4 }).notNull(),
    sourceUnit: varchar("sourceUnit", { length: 24 }).notNull(),
    packBaseQuantity: decimal("packBaseQuantity", { precision: 14, scale: 4 }),
    unitCost: decimal("unitCost", { precision: 12, scale: 4 }),
    lotCode: varchar("lotCode", { length: 128 }),
    expiresAt: timestamp("expiresAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    purchaseIndex: index("inventory_purchase_lines_purchase_idx").on(table.purchaseId),
    itemIndex: index("inventory_purchase_lines_item_idx").on(table.inventoryItemId),
  })
);

export type InventoryPurchaseLine = typeof inventoryPurchaseLines.$inferSelect;
export type InsertInventoryPurchaseLine = typeof inventoryPurchaseLines.$inferInsert;

export const inventoryPurchaseOrders = mysqlTable(
  "inventory_purchase_orders",
  {
    id: int("id").autoincrement().primaryKey(),
    venueId: int("venueId").notNull(),
    supplierId: int("supplierId").notNull(),
    reference: varchar("reference", { length: 128 }),
    status: mysqlEnum("status", ["draft", "sent", "partially_received", "received", "cancelled"]).default("draft").notNull(),
    expectedAt: timestamp("expectedAt"),
    notes: text("notes"),
    createdByUserId: int("createdByUserId").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    venueIndex: index("inventory_purchase_orders_venue_idx").on(table.venueId, table.status, table.createdAt),
    supplierIndex: index("inventory_purchase_orders_supplier_idx").on(table.supplierId),
  })
);

export type InventoryPurchaseOrder = typeof inventoryPurchaseOrders.$inferSelect;
export type InsertInventoryPurchaseOrder = typeof inventoryPurchaseOrders.$inferInsert;

export const inventoryPurchaseOrderLines = mysqlTable(
  "inventory_purchase_order_lines",
  {
    id: int("id").autoincrement().primaryKey(),
    purchaseOrderId: int("purchaseOrderId").notNull(),
    inventoryItemId: int("inventoryItemId").notNull(),
    quantityOrderedBase: decimal("quantityOrderedBase", { precision: 14, scale: 4 }).notNull(),
    quantityReceivedBase: decimal("quantityReceivedBase", { precision: 14, scale: 4 }).default("0").notNull(),
    sourceQuantity: decimal("sourceQuantity", { precision: 14, scale: 4 }).notNull(),
    sourceUnit: varchar("sourceUnit", { length: 24 }).notNull(),
    packBaseQuantity: decimal("packBaseQuantity", { precision: 14, scale: 4 }),
    estimatedUnitCost: decimal("estimatedUnitCost", { precision: 12, scale: 4 }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    orderIndex: index("inventory_purchase_order_lines_order_idx").on(table.purchaseOrderId),
    itemIndex: index("inventory_purchase_order_lines_item_idx").on(table.inventoryItemId),
  })
);

export type InventoryPurchaseOrderLine = typeof inventoryPurchaseOrderLines.$inferSelect;
export type InsertInventoryPurchaseOrderLine = typeof inventoryPurchaseOrderLines.$inferInsert;

export const inventoryLots = mysqlTable(
  "inventory_lots",
  {
    id: int("id").autoincrement().primaryKey(),
    venueId: int("venueId").notNull(),
    inventoryItemId: int("inventoryItemId").notNull(),
    purchaseLineId: int("purchaseLineId"),
    lotCode: varchar("lotCode", { length: 128 }),
    initialQuantityBase: decimal("initialQuantityBase", { precision: 14, scale: 4 }).notNull(),
    remainingQuantityBase: decimal("remainingQuantityBase", { precision: 14, scale: 4 }).notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    lastAlertState: mysqlEnum("lastAlertState", ["none", "expiring", "expired"]).default("none").notNull(),
    lastAlertedAt: timestamp("lastAlertedAt"),
    receivedAt: timestamp("receivedAt").defaultNow().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    venueExpiryIndex: index("inventory_lots_venue_expiry_idx").on(table.venueId, table.expiresAt),
    itemExpiryIndex: index("inventory_lots_item_expiry_idx").on(table.inventoryItemId, table.expiresAt),
  })
);

export type InventoryLot = typeof inventoryLots.$inferSelect;
export type InsertInventoryLot = typeof inventoryLots.$inferInsert;

export const inventoryAutomationSettings = mysqlTable(
  "inventory_automation_settings",
  {
    id: int("id").autoincrement().primaryKey(),
    scheduleCronTaskUid: varchar("scheduleCronTaskUid", { length: 65 }),
    expiryAlertDays: int("expiryAlertDays").default(7).notNull(),
    isEnabled: boolean("isEnabled").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    taskIndex: index("inventory_automation_task_idx").on(table.scheduleCronTaskUid),
  })
);

export type InventoryAutomationSettings = typeof inventoryAutomationSettings.$inferSelect;
export type InsertInventoryAutomationSettings = typeof inventoryAutomationSettings.$inferInsert;

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
  karaokeLinkStatus: mysqlEnum("karaokeLinkStatus", ["unverified", "working", "needs_review"]).default("unverified").notNull(),
  karaokeLinkReviewNote: varchar("karaokeLinkReviewNote", { length: 500 }),
  karaokeReviewDueAt: timestamp("karaokeReviewDueAt"),
  karaokeLinkStatusUpdatedByUserId: int("karaokeLinkStatusUpdatedByUserId"),
  karaokeLinkStatusUpdatedAt: timestamp("karaokeLinkStatusUpdatedAt"),
  playedByUserId: int("playedByUserId"),
  playedByUserName: varchar("playedByUserName", { length: 255 }),
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
