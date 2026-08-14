import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import {
  createAuditLog,
  createOrder,
  createOrderItems,
  getOrdersBySession,
  getOrdersByVenue,
  getOrderWithItems,
  getOrderStatusHistory,
  updateOrderStatus,
} from "../db";
import { getDb } from "../db";
import { menuItems } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export const ordersRouter = router({
  // Cliente: crear pedido desde el portal QR
  create: publicProcedure
    .input(
      z.object({
        sessionToken: z.string(),
        sessionId: z.number(),
        venueId: z.number(),
        tableId: z.number(),
        clientName: z.string(),
        items: z.array(
          z.object({
            menuItemId: z.number(),
            quantity: z.number().min(1),
            notes: z.string().optional(),
          })
        ),
        ageConfirmed: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Obtener precios actuales de los ítems y verificar alcohol
      let totalAmount = 0;
      let totalCost = 0;
      let hasAlcohol = false;
      const enrichedItems: {
        menuItemId: number;
        menuItemName: string;
        quantity: number;
        unitPrice: number;
        unitCost: number | null;
        subtotal: number;
        notes?: string;
      }[] = [];

      for (const item of input.items) {
        const [menuItem] = await db.select().from(menuItems).where(eq(menuItems.id, item.menuItemId)).limit(1);
        if (!menuItem || !menuItem.isAvailable) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `Ítem ${item.menuItemId} no disponible` });
        }
        if (menuItem.isAlcoholic) {
          hasAlcohol = true;
        }
        const unitPrice = Number(menuItem.price);
        const unitCost = menuItem.cost ? Number(menuItem.cost) : null;
        const subtotal = unitPrice * item.quantity;
        totalAmount += subtotal;
        if (unitCost !== null) totalCost += unitCost * item.quantity;
        enrichedItems.push({
          menuItemId: item.menuItemId,
          menuItemName: menuItem.name,
          quantity: item.quantity,
          unitPrice,
          unitCost,
          subtotal,
          notes: item.notes,
        });
      }

      if (hasAlcohol && !input.ageConfirmed) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Este pedido incluye bebidas alcohólicas y requiere confirmar que eres mayor de 18 años." });
      }

      // Crear la orden
      await createOrder({
        venueId: input.venueId,
        tableId: input.tableId,
        sessionId: input.sessionId,
        clientName: input.clientName,
        status: "pending",
        totalAmount: totalAmount.toFixed(2),
        totalCost: totalCost.toFixed(2),
        ageConfirmed: !!input.ageConfirmed,
      });

      // Obtener el ID de la orden recién creada
      const recentOrders = await getOrdersBySession(input.sessionId);
      const newOrder = recentOrders[0];
      if (!newOrder) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await createOrderItems(
        enrichedItems.map((item) => ({
          orderId: newOrder.id,
          menuItemId: item.menuItemId,
          menuItemName: item.menuItemName,
          quantity: item.quantity,
          unitPrice: item.unitPrice.toFixed(2),
          unitCost: item.unitCost !== null ? item.unitCost.toFixed(2) : undefined,
          subtotal: item.subtotal.toFixed(2),
          notes: item.notes,
        }))
      );

      return { success: true, orderId: newOrder.id };
    }),

  // Cliente: ver sus pedidos de la sesión
  getBySession: publicProcedure
    .input(z.object({ sessionId: z.number() }))
    .query(async ({ input }) => {
      return getOrdersBySession(input.sessionId);
    }),

  // Staff/Manager: ver cola de pedidos del local
  getByVenue: protectedProcedure
    .input(z.object({ venueId: z.number(), status: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "owner" && ctx.user.venueId !== input.venueId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return getOrdersByVenue(input.venueId, input.status);
    }),

  // Staff/Manager: ver detalle de un pedido
  getDetail: protectedProcedure.input(z.object({ orderId: z.number() })).query(async ({ input, ctx }) => {
    const order = await getOrderWithItems(input.orderId);
    if (!order) throw new TRPCError({ code: "NOT_FOUND" });
    if (ctx.user.role !== "owner" && ctx.user.venueId !== order.venueId) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    return order;
  }),

  // Staff: actualizar estado del pedido
  updateStatus: protectedProcedure
    .input(
      z.object({
        orderId: z.number(),
        venueId: z.number(),
        status: z.enum(["pending", "preparing", "delivered", "cancelled"]),
        cancelReason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "owner" && ctx.user.venueId !== input.venueId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      await updateOrderStatus(input.orderId, input.status, ctx.user.id, input.cancelReason, ctx.user.name || undefined);
      await createAuditLog({
        venueId: input.venueId,
        userId: ctx.user.id,
        userRole: ctx.user.role,
        action: `ORDER_${input.status.toUpperCase()}`,
        entity: "order",
        entityId: input.orderId,
        details: JSON.stringify({ status: input.status }),
      });
      return { success: true };
    }),

  // Obtener historial de cambios de estado del pedido
  getStatusHistory: protectedProcedure
    .input(z.object({ orderId: z.number() }))
    .query(async ({ input, ctx }) => {
      // Verificar que el usuario tiene acceso al pedido
      const order = await getOrderWithItems(input.orderId);
      if (!order) throw new TRPCError({ code: "NOT_FOUND" });
      if (ctx.user.role !== "owner" && ctx.user.venueId !== order.venueId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const history = await getOrderStatusHistory(input.orderId);
      return history;
    }),
});
