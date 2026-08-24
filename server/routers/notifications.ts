import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getNotificationSettings,
  updateNotificationSettings,
  getPendingVenueRequests,
  getOwnerNotificationHistory,
  getUnreadOwnerNotificationCount,
  markOwnerNotificationRead,
  markAllOwnerNotificationsRead,
  archiveAllReadUserNotifications,
  archiveUserNotification,
  getUserNotificationHistory,
  getUnreadUserNotificationCount,
  markUserNotificationRead,
  markAllUserNotificationsRead,
} from "../db";
import { TRPCError } from "@trpc/server";

export const notificationsRouter = router({
  getSettings: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "owner") {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    return getNotificationSettings(ctx.user.id);
  }),

  updateSettings: protectedProcedure
    .input(
      z.object({
        enabled: z.boolean(),
        emailNotifications: z.boolean(),
        notificationEmail: z.string().email().optional().or(z.literal("")),
        notificationPhone: z.string().optional(),
        senderAccountEmail: z.string().email().optional().or(z.literal("")),
        soundType: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "owner") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return updateNotificationSettings(ctx.user.id, input);
    }),

  getPendingCount: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "owner") {
      return 0;
    }
    const pending = await getPendingVenueRequests();
    return pending.length;
  }),

  getHistory: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).optional() }).optional())
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "owner") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return getOwnerNotificationHistory(ctx.user.id, input?.limit ?? 50);
    }),

  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "owner") {
      return 0;
    }
    return getUnreadOwnerNotificationCount(ctx.user.id);
  }),

  markRead: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "owner") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      await markOwnerNotificationRead(ctx.user.id, input.id);
      return { success: true };
    }),

  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.user.role !== "owner") {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    await markAllOwnerNotificationsRead(ctx.user.id);
      return { success: true };
    }),

  getMyHistory: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).optional(), archived: z.boolean().optional() }).optional())
    .query(async ({ ctx, input }) => getUserNotificationHistory(ctx.user.id, input?.limit ?? 50, input?.archived ?? false)),

  getMyUnreadCount: protectedProcedure.query(async ({ ctx }) => getUnreadUserNotificationCount(ctx.user.id)),

  markMyRead: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      await markUserNotificationRead(ctx.user.id, input.id);
      return { success: true };
    }),

  markAllMyRead: protectedProcedure.mutation(async ({ ctx }) => {
    await markAllUserNotificationsRead(ctx.user.id);
    return { success: true };
  }),

  archiveMyRead: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => ({ success: await archiveUserNotification(ctx.user.id, input.id) })),

  archiveAllMyRead: protectedProcedure.mutation(async ({ ctx }) => {
    await archiveAllReadUserNotifications(ctx.user.id);
    return { success: true };
  }),
});
