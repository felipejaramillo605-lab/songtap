import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getNotificationSettings, updateNotificationSettings, getPendingVenueRequests } from "../db";
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
});
