import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createAuditLog } from "../db";
import {
  InventoryStockError,
  createInventoryItem,
  createInventoryPhysicalCount,
  createInventoryPurchaseOrder,
  createInventoryMovement,
  createInventorySupplier,
  decideInventoryPhysicalCountApproval,
  getInventoryControlSettings,
  getInventoryCountMetrics,
  getInventoryCountTemplates,
  getInventoryDashboard,
  getInventoryExpiryAlerts,
  getInventoryMovements,
  getInventoryPhysicalCounts,
  getInventoryPurchaseOrders,
  getInventoryPurchases,
  getInventoryRecipes,
  getInventorySuppliers,
  getInventoryWastes,
  getRecipeCostMargins,
  getVenueMenuItemsForRecipe,
  receiveInventoryPurchase,
  recordExpiredInventoryWaste,
  reconcileInventoryPhysicalCount,
  replaceInventoryRecipe,
  saveInventoryControlSettings,
  saveInventoryCountTemplate,
  submitInventoryPhysicalCount,
  updateInventoryItem,
  updateInventoryPhysicalCountLine,
  updateInventoryPurchaseOrderStatus,
} from "../inventoryDb";
import { INVENTORY_UNITS, InventoryDimension, InventoryUnit, toBaseQuantity } from "../inventory";
import { protectedProcedure, router } from "../_core/trpc";

const inventoryUnitSchema = z.enum(INVENTORY_UNITS);
const dimensionSchema = z.enum(["count", "volume", "mass"]);

function assertVenueAccess(user: { role: string; venueId: number | null }, venueId: number) {
  if (user.role !== "owner" && user.venueId !== venueId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso para acceder al inventario de este local." });
  }
}

function assertInventoryManager(user: { role: string }) {
  if (user.role !== "owner" && user.role !== "manager") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Solo Manager u Owner pueden modificar inventario." });
  }
}

function convertQuantity(input: { dimension: InventoryDimension; quantity: number; unit: InventoryUnit; packBaseQuantity?: number | null }) {
  return toBaseQuantity(input);
}

function toInventoryError(error: unknown): never {
  if (error instanceof TRPCError) throw error;
  if (error instanceof InventoryStockError) {
    throw new TRPCError({ code: "CONFLICT", message: error.message, cause: error.shortages });
  }
  const message = error instanceof Error ? error.message : "No fue posible completar la operación de inventario.";
  const knownMessages: Record<string, string> = {
    INSUMO_NO_ENCONTRADO: "El insumo no existe en este local.",
    PROVEEDOR_NO_ENCONTRADO: "El proveedor no existe o está inactivo en este local.",
    CANTIDAD_COMPRA_INVALIDA: "Cada línea de compra debe tener una cantidad positiva.",
    CADUCIDAD_REQUERIDA: "Los insumos perecederos requieren una fecha de caducidad.",
    CADUCIDAD_INVALIDA: "La caducidad debe ser posterior a la fecha de recepción.",
    LOTE_NO_ENCONTRADO: "El lote no existe en este local.",
    LOTE_AUN_VIGENTE: "Solo puedes registrar merma automática cuando el lote esté vencido.",
    CANTIDAD_MERMA_INVALIDA: "La cantidad de merma debe ser positiva y no puede superar el saldo del lote.",
    STOCK_INSUFICIENTE: "El saldo global del insumo no permite registrar esta merma.",
    ORDEN_NO_ENCONTRADA: "La orden de compra no existe en este local.",
    ORDEN_NO_DISPONIBLE: "La orden fue cancelada o ya se recibió completamente.",
    ORDEN_CON_RECEPCIONES_NO_EDITABLE: "Una orden con recepciones no puede volver a borrador, enviarse ni cancelarse.",
    LINEAS_ORDEN_INVALIDAS: "La orden requiere líneas únicas con cantidades positivas.",
    RECEPCION_ORDEN_INVALIDA: "La recepción supera lo pendiente o no coincide con la orden.",
    PROVEEDOR_NO_COINCIDE_CON_ORDEN: "El proveedor debe coincidir con el de la orden de compra.",
    CONTEO_SIN_INSUMOS: "No hay insumos activos para iniciar un conteo físico.",
    CONTEO_ACTIVO_EXISTENTE: "Ya hay un conteo físico pendiente en este local; finalízalo o recházalo antes de iniciar otro.",
    CONTEO_NO_ENCONTRADO: "El conteo físico no existe en este local.",
    CONTEO_NO_EDITABLE: "El conteo ya fue enviado, conciliado o cancelado y no admite cambios.",
    LINEA_CONTEO_NO_ENCONTRADA: "El insumo no pertenece a este conteo físico.",
    CANTIDAD_CONTEO_INVALIDA: "La cantidad física debe ser igual o mayor que cero.",
    CONTEO_INCOMPLETO: "Registra una cantidad física para todos los insumos antes de enviar el conteo.",
    CONTEO_NO_CONCILIABLE: "El conteo debe estar listo para conciliar.",
    CONTEO_DESACTUALIZADO: "El inventario cambió durante el conteo. Inicia un nuevo conteo para evitar sobrescribir movimientos recientes.",
    UMBRAL_APROBACION_INVALIDO: "El umbral de aprobación debe ser igual o mayor que cero.",
    PLANTILLA_CONTEO_NO_ENCONTRADA: "La plantilla no existe, está inactiva o pertenece a otro local.",
    PLANTILLA_CONTEO_SIN_FAMILIAS: "La plantilla debe incluir al menos una familia de insumos.",
    PLANTILLA_CONTEO_INVALIDA: "La plantilla requiere un nombre y al menos una familia válida.",
    CONTEO_NO_REQUIERE_APROBACION: "Este conteo no está pendiente de una aprobación dual.",
    APROBADOR_DEBE_SER_DISTINTO: "La aprobación debe realizarla otra persona diferente a quien inició o envió el conteo.",
    CONTEO_YA_APROBADO: "El conteo ya tiene una decisión de aprobación registrada.",
    PRODUCTO_NO_ENCONTRADO: "El producto de menú no existe en este local.",
    PEDIDO_ENTREGADO_FINAL: "Un pedido entregado no puede cambiarse a otro estado; registra un ajuste de inventario si es necesario.",
  };
  throw new TRPCError({ code: "BAD_REQUEST", message: knownMessages[message] ?? message });
}

export const inventoryRouter = router({
  dashboard: protectedProcedure
    .input(z.object({ venueId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      assertVenueAccess(ctx.user, input.venueId);
      return getInventoryDashboard(input.venueId);
    }),

  movements: protectedProcedure
    .input(z.object({ venueId: z.number().int().positive(), inventoryItemId: z.number().int().positive().optional() }))
    .query(async ({ ctx, input }) => {
      assertVenueAccess(ctx.user, input.venueId);
      return getInventoryMovements(input.venueId, input.inventoryItemId);
    }),

  recipeSetup: protectedProcedure
    .input(z.object({ venueId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      assertVenueAccess(ctx.user, input.venueId);
      const [menuItems, items, recipes] = await Promise.all([
        getVenueMenuItemsForRecipe(input.venueId),
        getInventoryDashboard(input.venueId),
        getInventoryRecipes(input.venueId),
      ]);
      return { menuItems, items: items.items, recipes };
    }),

  createItem: protectedProcedure
    .input(z.object({
      venueId: z.number().int().positive(),
      name: z.string().trim().min(2).max(160),
      sku: z.string().trim().max(96).optional(),
      family: z.string().trim().min(2).max(100).optional(),
      dimension: dimensionSchema,
      reorderPointQuantity: z.number().finite().min(0),
      reorderPointUnit: inventoryUnitSchema,
      reorderPointPackBaseQuantity: z.number().finite().positive().optional(),
      isPerishable: z.boolean().optional().default(false),
      expiryAlertDays: z.number().int().min(1).max(90).optional().default(7),
    }))
    .mutation(async ({ ctx, input }) => {
      assertVenueAccess(ctx.user, input.venueId);
      assertInventoryManager(ctx.user);
      try {
        const reorderPointBase = input.reorderPointQuantity === 0 ? 0 : convertQuantity({
          dimension: input.dimension,
          quantity: input.reorderPointQuantity,
          unit: input.reorderPointUnit,
          packBaseQuantity: input.reorderPointPackBaseQuantity,
        });
        const item = await createInventoryItem({ venueId: input.venueId, name: input.name, sku: input.sku, family: input.family, dimension: input.dimension, reorderPointBase, isPerishable: input.isPerishable, expiryAlertDays: input.expiryAlertDays });
        await createAuditLog({ venueId: input.venueId, userId: ctx.user.id, userRole: ctx.user.role, module: "Inventario", action: "INVENTORY_ITEM_CREATED", entity: "inventory_item", entityId: item?.id, details: JSON.stringify({ name: input.name, family: input.family ?? null, dimension: input.dimension }) });
        return { item };
      } catch (error) {
        return toInventoryError(error);
      }
    }),

  updateItem: protectedProcedure
    .input(z.object({
      venueId: z.number().int().positive(),
      itemId: z.number().int().positive(),
      name: z.string().trim().min(2).max(160),
      sku: z.string().trim().max(96).optional(),
      family: z.string().trim().min(2).max(100).optional(),
      reorderPointQuantity: z.number().finite().min(0),
      reorderPointUnit: inventoryUnitSchema,
      reorderPointPackBaseQuantity: z.number().finite().positive().optional(),
      isActive: z.boolean(),
      isPerishable: z.boolean().optional(),
      expiryAlertDays: z.number().int().min(1).max(90).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      assertVenueAccess(ctx.user, input.venueId);
      assertInventoryManager(ctx.user);
      try {
        const dashboard = await getInventoryDashboard(input.venueId);
        const item = dashboard.items.find((candidate) => candidate.id === input.itemId);
        if (!item) throw new Error("INSUMO_NO_ENCONTRADO");
        const reorderPointBase = input.reorderPointQuantity === 0 ? 0 : convertQuantity({
          dimension: item.dimension,
          quantity: input.reorderPointQuantity,
          unit: input.reorderPointUnit,
          packBaseQuantity: input.reorderPointPackBaseQuantity,
        });
        await updateInventoryItem({ venueId: input.venueId, itemId: input.itemId, name: input.name, sku: input.sku, family: input.family, reorderPointBase, isActive: input.isActive, isPerishable: input.isPerishable, expiryAlertDays: input.expiryAlertDays });
        return { success: true };
      } catch (error) {
        return toInventoryError(error);
      }
    }),

  registerMovement: protectedProcedure
    .input(z.object({
      venueId: z.number().int().positive(),
      inventoryItemId: z.number().int().positive(),
      movementType: z.enum(["initial", "restock", "adjustment"]),
      quantity: z.number().finite().refine((value) => value !== 0, "La cantidad no puede ser cero."),
      unit: inventoryUnitSchema,
      packBaseQuantity: z.number().finite().positive().optional(),
      note: z.string().trim().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      assertVenueAccess(ctx.user, input.venueId);
      assertInventoryManager(ctx.user);
      try {
        if (input.movementType !== "adjustment" && input.quantity < 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Las entradas y existencias iniciales deben ser positivas; usa ajuste para disminuciones." });
        }
        const dashboard = await getInventoryDashboard(input.venueId);
        const item = dashboard.items.find((candidate) => candidate.id === input.inventoryItemId);
        if (!item) throw new Error("INSUMO_NO_ENCONTRADO");
        const quantityBase = convertQuantity({ dimension: item.dimension, quantity: input.quantity, unit: input.unit, packBaseQuantity: input.packBaseQuantity });
        const result = await createInventoryMovement({
          venueId: input.venueId,
          inventoryItemId: input.inventoryItemId,
          movementType: input.movementType,
          quantityBase,
          sourceQuantity: input.quantity,
          sourceUnit: input.unit,
          packBaseQuantity: input.packBaseQuantity,
          performedByUserId: ctx.user.id,
          note: input.note,
        });
        await createAuditLog({ venueId: input.venueId, userId: ctx.user.id, userRole: ctx.user.role, module: "Inventario", action: `INVENTORY_${input.movementType.toUpperCase()}`, entity: "inventory_item", entityId: input.inventoryItemId, details: JSON.stringify({ quantity: input.quantity, unit: input.unit, quantityBase }) });
        return result;
      } catch (error) {
        return toInventoryError(error);
      }
    }),

  suppliers: protectedProcedure
    .input(z.object({ venueId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      assertVenueAccess(ctx.user, input.venueId);
      return getInventorySuppliers(input.venueId);
    }),

  purchases: protectedProcedure
    .input(z.object({ venueId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      assertVenueAccess(ctx.user, input.venueId);
      return getInventoryPurchases(input.venueId);
    }),

  purchaseOrders: protectedProcedure
    .input(z.object({ venueId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      assertVenueAccess(ctx.user, input.venueId);
      return getInventoryPurchaseOrders(input.venueId);
    }),

  wastes: protectedProcedure
    .input(z.object({ venueId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      assertVenueAccess(ctx.user, input.venueId);
      return getInventoryWastes(input.venueId);
    }),

  recipeMargins: protectedProcedure
    .input(z.object({ venueId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      assertVenueAccess(ctx.user, input.venueId);
      return getRecipeCostMargins(input.venueId);
    }),

  physicalCounts: protectedProcedure
    .input(z.object({ venueId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      assertVenueAccess(ctx.user, input.venueId);
      return getInventoryPhysicalCounts(input.venueId);
    }),

  countMetrics: protectedProcedure
    .input(z.object({ venueId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      assertVenueAccess(ctx.user, input.venueId);
      return getInventoryCountMetrics(input.venueId);
    }),

  controlSettings: protectedProcedure
    .input(z.object({ venueId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      assertVenueAccess(ctx.user, input.venueId);
      return getInventoryControlSettings(input.venueId);
    }),

  countTemplates: protectedProcedure
    .input(z.object({ venueId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      assertVenueAccess(ctx.user, input.venueId);
      return getInventoryCountTemplates(input.venueId);
    }),

  expiryAlerts: protectedProcedure
    .input(z.object({ venueId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      assertVenueAccess(ctx.user, input.venueId);
      return getInventoryExpiryAlerts(input.venueId);
    }),

  createSupplier: protectedProcedure
    .input(z.object({
      venueId: z.number().int().positive(),
      name: z.string().trim().min(2).max(160),
      contactName: z.string().trim().max(160).optional(),
      email: z.string().email().max(320).optional(),
      phone: z.string().trim().max(64).optional(),
      address: z.string().trim().max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      assertVenueAccess(ctx.user, input.venueId);
      assertInventoryManager(ctx.user);
      try {
        const supplier = await createInventorySupplier(input);
        await createAuditLog({ venueId: input.venueId, userId: ctx.user.id, userRole: ctx.user.role, module: "Inventario", action: "INVENTORY_SUPPLIER_CREATED", entity: "inventory_supplier", entityId: supplier?.id, details: JSON.stringify({ name: input.name }) });
        return { supplier };
      } catch (error) {
        return toInventoryError(error);
      }
    }),

  createPurchaseOrder: protectedProcedure
    .input(z.object({
      venueId: z.number().int().positive(),
      supplierId: z.number().int().positive(),
      reference: z.string().trim().max(128).optional(),
      expectedAt: z.coerce.date().optional(),
      notes: z.string().trim().max(1000).optional(),
      lines: z.array(z.object({
        inventoryItemId: z.number().int().positive(),
        quantity: z.number().finite().positive(),
        unit: inventoryUnitSchema,
        packBaseQuantity: z.number().finite().positive().optional(),
        estimatedUnitCost: z.number().finite().min(0).optional(),
      })).min(1).max(100),
    }))
    .mutation(async ({ ctx, input }) => {
      assertVenueAccess(ctx.user, input.venueId);
      assertInventoryManager(ctx.user);
      try {
        const dashboard = await getInventoryDashboard(input.venueId);
        const itemById = new Map(dashboard.items.map((item) => [item.id, item]));
        const lines = input.lines.map((line) => {
          const item = itemById.get(line.inventoryItemId);
          if (!item) throw new Error("INSUMO_NO_ENCONTRADO");
          return { inventoryItemId: item.id, quantityOrderedBase: convertQuantity({ dimension: item.dimension, quantity: line.quantity, unit: line.unit, packBaseQuantity: line.packBaseQuantity }), sourceQuantity: line.quantity, sourceUnit: line.unit, packBaseQuantity: line.packBaseQuantity, estimatedUnitCost: line.estimatedUnitCost };
        });
        const result = await createInventoryPurchaseOrder({ venueId: input.venueId, supplierId: input.supplierId, reference: input.reference, expectedAt: input.expectedAt, notes: input.notes, createdByUserId: ctx.user.id, lines });
        await createAuditLog({ venueId: input.venueId, userId: ctx.user.id, userRole: ctx.user.role, module: "Inventario", action: "INVENTORY_PURCHASE_ORDER_CREATED", entity: "inventory_purchase_order", entityId: result.purchaseOrderId, details: JSON.stringify({ supplierId: input.supplierId, lineCount: lines.length }) });
        return result;
      } catch (error) {
        return toInventoryError(error);
      }
    }),

  updatePurchaseOrderStatus: protectedProcedure
    .input(z.object({ venueId: z.number().int().positive(), purchaseOrderId: z.number().int().positive(), status: z.enum(["draft", "sent", "cancelled"]) }))
    .mutation(async ({ ctx, input }) => {
      assertVenueAccess(ctx.user, input.venueId);
      assertInventoryManager(ctx.user);
      try {
        const result = await updateInventoryPurchaseOrderStatus(input);
        await createAuditLog({ venueId: input.venueId, userId: ctx.user.id, userRole: ctx.user.role, module: "Inventario", action: `INVENTORY_PURCHASE_ORDER_${input.status.toUpperCase()}`, entity: "inventory_purchase_order", entityId: input.purchaseOrderId, details: null });
        return result;
      } catch (error) {
        return toInventoryError(error);
      }
    }),

  recordExpiredWaste: protectedProcedure
    .input(z.object({ venueId: z.number().int().positive(), inventoryLotId: z.number().int().positive(), quantityBase: z.number().finite().positive(), note: z.string().trim().max(500).optional() }))
    .mutation(async ({ ctx, input }) => {
      assertVenueAccess(ctx.user, input.venueId);
      assertInventoryManager(ctx.user);
      try {
        const result = await recordExpiredInventoryWaste({ ...input, performedByUserId: ctx.user.id });
        await createAuditLog({ venueId: input.venueId, userId: ctx.user.id, userRole: ctx.user.role, module: "Inventario", action: "INVENTORY_EXPIRED_WASTE_RECORDED", entity: "inventory_waste", entityId: result.wasteId, details: JSON.stringify({ inventoryLotId: input.inventoryLotId, quantityBase: result.quantityBase, totalCost: result.totalCost }) });
        return result;
      } catch (error) {
        return toInventoryError(error);
      }
    }),

  startPhysicalCount: protectedProcedure
    .input(z.object({ venueId: z.number().int().positive(), notes: z.string().trim().max(1000).optional(), templateId: z.number().int().positive().optional() }))
    .mutation(async ({ ctx, input }) => {
      assertVenueAccess(ctx.user, input.venueId);
      assertInventoryManager(ctx.user);
      try {
        const result = await createInventoryPhysicalCount({ venueId: input.venueId, createdByUserId: ctx.user.id, notes: input.notes, templateId: input.templateId });
        await createAuditLog({ venueId: input.venueId, userId: ctx.user.id, userRole: ctx.user.role, module: "Inventario", action: "INVENTORY_PHYSICAL_COUNT_STARTED", entity: "inventory_physical_count", entityId: result.physicalCountId, details: JSON.stringify({ itemCount: result.itemCount, templateId: input.templateId ?? null }) });
        return result;
      } catch (error) {
        return toInventoryError(error);
      }
    }),

  saveControlSettings: protectedProcedure
    .input(z.object({ venueId: z.number().int().positive(), dualApprovalEnabled: z.boolean(), dualApprovalThresholdCost: z.number().finite().min(0) }))
    .mutation(async ({ ctx, input }) => {
      assertVenueAccess(ctx.user, input.venueId);
      assertInventoryManager(ctx.user);
      try {
        const result = await saveInventoryControlSettings(input);
        await createAuditLog({ venueId: input.venueId, userId: ctx.user.id, userRole: ctx.user.role, module: "Inventario", action: "INVENTORY_DUAL_APPROVAL_SETTINGS_SAVED", entity: "inventory_control_settings", entityId: "id" in result ? result.id : undefined, details: JSON.stringify({ enabled: result.dualApprovalEnabled, threshold: result.dualApprovalThresholdCost }) });
        return result;
      } catch (error) {
        return toInventoryError(error);
      }
    }),

  saveCountTemplate: protectedProcedure
    .input(z.object({ venueId: z.number().int().positive(), templateId: z.number().int().positive().optional(), name: z.string().trim().min(2).max(160), families: z.array(z.string().trim().min(2).max(100)).min(1).max(30), isActive: z.boolean().optional() }))
    .mutation(async ({ ctx, input }) => {
      assertVenueAccess(ctx.user, input.venueId);
      assertInventoryManager(ctx.user);
      try {
        const result = await saveInventoryCountTemplate({ ...input, createdByUserId: ctx.user.id });
        await createAuditLog({ venueId: input.venueId, userId: ctx.user.id, userRole: ctx.user.role, module: "Inventario", action: input.templateId ? "INVENTORY_COUNT_TEMPLATE_UPDATED" : "INVENTORY_COUNT_TEMPLATE_CREATED", entity: "inventory_count_template", entityId: result.templateId, details: JSON.stringify({ name: input.name, familyCount: result.familyCount }) });
        return result;
      } catch (error) {
        return toInventoryError(error);
      }
    }),

  recordPhysicalCountLine: protectedProcedure
    .input(z.object({ venueId: z.number().int().positive(), physicalCountId: z.number().int().positive(), inventoryItemId: z.number().int().positive(), physicalQuantity: z.number().finite().min(0), unit: inventoryUnitSchema, packBaseQuantity: z.number().finite().positive().optional(), note: z.string().trim().max(500).optional() }))
    .mutation(async ({ ctx, input }) => {
      assertVenueAccess(ctx.user, input.venueId);
      assertInventoryManager(ctx.user);
      try {
        const dashboard = await getInventoryDashboard(input.venueId);
        const item = dashboard.items.find((candidate) => candidate.id === input.inventoryItemId);
        if (!item) throw new Error("INSUMO_NO_ENCONTRADO");
        const physicalStockBase = input.physicalQuantity === 0
          ? (convertQuantity({ dimension: item.dimension, quantity: 1, unit: input.unit, packBaseQuantity: input.packBaseQuantity }), 0)
          : convertQuantity({ dimension: item.dimension, quantity: input.physicalQuantity, unit: input.unit, packBaseQuantity: input.packBaseQuantity });
        const result = await updateInventoryPhysicalCountLine({ venueId: input.venueId, physicalCountId: input.physicalCountId, inventoryItemId: input.inventoryItemId, physicalStockBase, countedByUserId: ctx.user.id, note: input.note });
        await createAuditLog({ venueId: input.venueId, userId: ctx.user.id, userRole: ctx.user.role, module: "Inventario", action: "INVENTORY_PHYSICAL_COUNT_LINE_RECORDED", entity: "inventory_physical_count_line", entityId: result.lineId, details: JSON.stringify({ physicalCountId: input.physicalCountId, inventoryItemId: input.inventoryItemId, physicalStockBase: result.physicalStockBase, varianceBase: result.varianceBase }) });
        return result;
      } catch (error) {
        return toInventoryError(error);
      }
    }),

  submitPhysicalCount: protectedProcedure
    .input(z.object({ venueId: z.number().int().positive(), physicalCountId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      assertVenueAccess(ctx.user, input.venueId);
      assertInventoryManager(ctx.user);
      try {
        const result = await submitInventoryPhysicalCount({ ...input, submittedByUserId: ctx.user.id });
        await createAuditLog({ venueId: input.venueId, userId: ctx.user.id, userRole: ctx.user.role, module: "Inventario", action: "INVENTORY_PHYSICAL_COUNT_SUBMITTED", entity: "inventory_physical_count", entityId: input.physicalCountId, details: JSON.stringify({ differenceCount: result.differenceCount, totalVarianceCost: result.totalVarianceCost, approvalRequired: result.approvalRequired }) });
        return result;
      } catch (error) {
        return toInventoryError(error);
      }
    }),

  decidePhysicalCountApproval: protectedProcedure
    .input(z.object({ venueId: z.number().int().positive(), physicalCountId: z.number().int().positive(), approved: z.boolean(), note: z.string().trim().max(500).optional() }))
    .mutation(async ({ ctx, input }) => {
      assertVenueAccess(ctx.user, input.venueId);
      assertInventoryManager(ctx.user);
      try {
        const result = await decideInventoryPhysicalCountApproval({ ...input, approverUserId: ctx.user.id });
        await createAuditLog({ venueId: input.venueId, userId: ctx.user.id, userRole: ctx.user.role, module: "Inventario", action: input.approved ? "INVENTORY_PHYSICAL_COUNT_APPROVED" : "INVENTORY_PHYSICAL_COUNT_REJECTED", entity: "inventory_physical_count", entityId: input.physicalCountId, details: JSON.stringify({ totalVarianceCost: result.totalVarianceCost, note: input.note ?? null }) });
        return result;
      } catch (error) {
        return toInventoryError(error);
      }
    }),

  reconcilePhysicalCount: protectedProcedure
    .input(z.object({ venueId: z.number().int().positive(), physicalCountId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      assertVenueAccess(ctx.user, input.venueId);
      assertInventoryManager(ctx.user);
      try {
        const result = await reconcileInventoryPhysicalCount({ ...input, reconciledByUserId: ctx.user.id });
        await createAuditLog({ venueId: input.venueId, userId: ctx.user.id, userRole: ctx.user.role, module: "Inventario", action: "INVENTORY_PHYSICAL_COUNT_RECONCILED", entity: "inventory_physical_count", entityId: input.physicalCountId, details: JSON.stringify({ adjustmentCount: result.adjustmentCount }) });
        return result;
      } catch (error) {
        return toInventoryError(error);
      }
    }),

  receivePurchase: protectedProcedure
    .input(z.object({
      venueId: z.number().int().positive(),
      supplierId: z.number().int().positive().optional(),
      purchaseOrderId: z.number().int().positive().optional(),
      reference: z.string().trim().max(128).optional(),
      receivedAt: z.coerce.date(),
      notes: z.string().trim().max(1000).optional(),
      lines: z.array(z.object({
        inventoryItemId: z.number().int().positive(),
        quantity: z.number().finite().positive(),
        unit: inventoryUnitSchema,
        packBaseQuantity: z.number().finite().positive().optional(),
        unitCost: z.number().finite().min(0).optional(),
        purchaseOrderLineId: z.number().int().positive().optional(),
        lotCode: z.string().trim().max(128).optional(),
        expiresAt: z.coerce.date().optional(),
      })).min(1).max(100),
    }))
    .mutation(async ({ ctx, input }) => {
      assertVenueAccess(ctx.user, input.venueId);
      assertInventoryManager(ctx.user);
      try {
        const dashboard = await getInventoryDashboard(input.venueId);
        const itemById = new Map(dashboard.items.map((item) => [item.id, item]));
        const lines = input.lines.map((line) => {
          const item = itemById.get(line.inventoryItemId);
          if (!item) throw new Error("INSUMO_NO_ENCONTRADO");
          return {
            inventoryItemId: line.inventoryItemId,
            quantityBase: convertQuantity({ dimension: item.dimension, quantity: line.quantity, unit: line.unit, packBaseQuantity: line.packBaseQuantity }),
            sourceQuantity: line.quantity,
            sourceUnit: line.unit,
            packBaseQuantity: line.packBaseQuantity,
            unitCost: line.unitCost,
            lotCode: line.lotCode,
            expiresAt: line.expiresAt,
          };
        });
        const result = await receiveInventoryPurchase({ venueId: input.venueId, supplierId: input.supplierId, purchaseOrderId: input.purchaseOrderId, reference: input.reference, receivedAt: input.receivedAt, notes: input.notes, createdByUserId: ctx.user.id, lines: lines.map((line, index) => ({ ...line, purchaseOrderLineId: input.lines[index].purchaseOrderLineId })) });
        await createAuditLog({ venueId: input.venueId, userId: ctx.user.id, userRole: ctx.user.role, module: "Inventario", action: "INVENTORY_PURCHASE_RECEIVED", entity: "inventory_purchase", entityId: result.purchaseId, details: JSON.stringify({ supplierId: input.supplierId ?? null, purchaseOrderId: input.purchaseOrderId ?? null, reference: input.reference ?? null, lineCount: lines.length, totalCost: result.totalCost }) });
        return result;
      } catch (error) {
        return toInventoryError(error);
      }
    }),

  saveRecipe: protectedProcedure
    .input(z.object({
      venueId: z.number().int().positive(),
      menuItemId: z.number().int().positive(),
      name: z.string().trim().max(160).optional(),
      lines: z.array(z.object({
        inventoryItemId: z.number().int().positive(),
        quantity: z.number().finite().positive(),
        unit: inventoryUnitSchema,
        packBaseQuantity: z.number().finite().positive().optional(),
      })).min(1).max(50),
    }))
    .mutation(async ({ ctx, input }) => {
      assertVenueAccess(ctx.user, input.venueId);
      assertInventoryManager(ctx.user);
      try {
        const uniqueItems = new Set(input.lines.map((line) => line.inventoryItemId));
        if (uniqueItems.size !== input.lines.length) throw new TRPCError({ code: "BAD_REQUEST", message: "Un insumo solo puede aparecer una vez en la misma fórmula." });
        const dashboard = await getInventoryDashboard(input.venueId);
        const itemById = new Map(dashboard.items.map((item) => [item.id, item]));
        const lines = input.lines.map((line) => {
          const item = itemById.get(line.inventoryItemId);
          if (!item) throw new Error("INSUMO_NO_ENCONTRADO");
          return {
            inventoryItemId: line.inventoryItemId,
            quantityBase: convertQuantity({ dimension: item.dimension, quantity: line.quantity, unit: line.unit, packBaseQuantity: line.packBaseQuantity }),
            displayQuantity: line.quantity,
            displayUnit: line.unit,
          };
        });
        const result = await replaceInventoryRecipe({ venueId: input.venueId, menuItemId: input.menuItemId, name: input.name, lines });
        await createAuditLog({ venueId: input.venueId, userId: ctx.user.id, userRole: ctx.user.role, module: "Inventario", action: "INVENTORY_RECIPE_SAVED", entity: "inventory_recipe", entityId: result.recipeId, details: JSON.stringify({ menuItemId: input.menuItemId, lineCount: lines.length }) });
        return { success: true, ...result };
      } catch (error) {
        return toInventoryError(error);
      }
    }),
});
