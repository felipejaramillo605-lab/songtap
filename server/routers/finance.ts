import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import { getAuditLogs, getFinanceSummary, getOrderHistory, getOwnerRevenueByDay, getOwnerVenueAnalytics, getRevenueByCategory, getRevenueByHour } from "../db";

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

  revenueByHour: protectedProcedure
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
      return getRevenueByHour(input.venueId, dateFrom, dateTo);
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

  ownerVenueAnalytics: adminProcedure
    .input(z.object({ dateFrom: z.date(), dateTo: z.date() }))
    .query(async ({ input }) => {
      const [venues, dailyRevenue] = await Promise.all([
        getOwnerVenueAnalytics(input.dateFrom, input.dateTo),
        getOwnerRevenueByDay(input.dateFrom, input.dateTo),
      ]);
      const totals = venues.reduce(
        (acc, venue) => ({
          revenue: acc.revenue + Number(venue.revenue),
          orderCount: acc.orderCount + Number(venue.orderCount),
        }),
        { revenue: 0, orderCount: 0 }
      );
      return {
        venues: venues.map((venue) => ({
          ...venue,
          revenue: Number(venue.revenue),
          orderCount: Number(venue.orderCount),
          averageTicket: Number(venue.averageTicket),
        })),
        dailyRevenue: dailyRevenue.map((day) => ({ ...day, revenue: Number(day.revenue), orderCount: Number(day.orderCount) })),
        totals: { ...totals, averageTicket: totals.orderCount ? totals.revenue / totals.orderCount : 0 },
      };
    }),
});
