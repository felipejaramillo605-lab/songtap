import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createAuditLog } from "../db";
import {
  InventoryStockError,
  createInventoryItem,
  createInventoryMovement,
  createInventorySupplier,
  getInventoryDashboard,
  getInventoryExpiryAlerts,
  getInventoryMovements,
  getInventoryPurchases,
  getInventoryRecipes,
  getInventorySuppliers,
  getVenueMenuItemsForRecipe,
  receiveInventoryPurchase,
  replaceInventoryRecipe,
  updateInventoryItem,
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
        const item = await createInventoryItem({ venueId: input.venueId, name: input.name, sku: input.sku, dimension: input.dimension, reorderPointBase, isPerishable: input.isPerishable, expiryAlertDays: input.expiryAlertDays });
        await createAuditLog({ venueId: input.venueId, userId: ctx.user.id, userRole: ctx.user.role, module: "Inventario", action: "INVENTORY_ITEM_CREATED", entity: "inventory_item", entityId: item?.id, details: JSON.stringify({ name: input.name, dimension: input.dimension }) });
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
        await updateInventoryItem({ venueId: input.venueId, itemId: input.itemId, name: input.name, sku: input.sku, reorderPointBase, isActive: input.isActive, isPerishable: input.isPerishable, expiryAlertDays: input.expiryAlertDays });
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

  receivePurchase: protectedProcedure
    .input(z.object({
      venueId: z.number().int().positive(),
      supplierId: z.number().int().positive().optional(),
      reference: z.string().trim().max(128).optional(),
      receivedAt: z.coerce.date(),
      notes: z.string().trim().max(1000).optional(),
      lines: z.array(z.object({
        inventoryItemId: z.number().int().positive(),
        quantity: z.number().finite().positive(),
        unit: inventoryUnitSchema,
        packBaseQuantity: z.number().finite().positive().optional(),
        unitCost: z.number().finite().min(0).optional(),
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
        const result = await receiveInventoryPurchase({ venueId: input.venueId, supplierId: input.supplierId, reference: input.reference, receivedAt: input.receivedAt, notes: input.notes, createdByUserId: ctx.user.id, lines });
        await createAuditLog({ venueId: input.venueId, userId: ctx.user.id, userRole: ctx.user.role, module: "Inventario", action: "INVENTORY_PURCHASE_RECEIVED", entity: "inventory_purchase", entityId: result.purchaseId, details: JSON.stringify({ supplierId: input.supplierId ?? null, reference: input.reference ?? null, lineCount: lines.length, totalCost: result.totalCost }) });
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
