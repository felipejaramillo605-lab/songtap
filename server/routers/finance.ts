import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import { getAuditLogs, getFinanceSummary, getOrderHistory, getRevenueByCategory } from "../db";

export const financeRouter = router({
  summary: protectedProcedure
    .input(
      z.object({
        venueId: z.number(),
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "owner" && ctx.user.venueId !== input.venueId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const now = new Date();
      const dateFrom = input.dateFrom ?? new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const dateTo = input.dateTo ?? new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      return getFinanceSummary(input.venueId, dateFrom, dateTo);
    }),

  revenueByCategory: protectedProcedure
    .input(
      z.object({
        venueId: z.number(),
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "owner" && ctx.user.venueId !== input.venueId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const now = new Date();
      const dateFrom = input.dateFrom ?? new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      const dateTo = input.dateTo ?? new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
      return getRevenueByCategory(input.venueId, dateFrom, dateTo);
    }),

  orderHistory: protectedProcedure
    .input(
      z.object({
        venueId: z.number(),
        dateFrom: z.date(),
        dateTo: z.date(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "owner" && ctx.user.venueId !== input.venueId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return getOrderHistory(input.venueId, input.dateFrom, input.dateTo);
    }),

  auditLogs: adminProcedure
    .input(z.object({ venueId: z.number().optional(), limit: z.number().optional() }))
    .query(async ({ input }) => {
      return getAuditLogs(input.venueId, input.limit);
    }),
});
