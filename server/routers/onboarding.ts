import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  completeUserOnboarding,
  createSupportTicket,
  getSupportTicketsForUser,
  getUserOnboardingProgress,
  markUserOnboardingOpened,
  resetUserOnboarding,
  type OnboardingRole,
} from "../db";

function requireSupportedRole(role: string): OnboardingRole {
  if (role === "owner" || role === "manager" || role === "staff") return role;
  throw new TRPCError({ code: "FORBIDDEN", message: "El onboarding solo está disponible para roles operativos." });
}

export const onboardingRouter = router({
  getProgress: protectedProcedure.query(({ ctx }) => {
    const role = requireSupportedRole(ctx.user.role);
    return getUserOnboardingProgress(ctx.user.id, role);
  }),

  markOpened: protectedProcedure.mutation(({ ctx }) => {
    const role = requireSupportedRole(ctx.user.role);
    return markUserOnboardingOpened(ctx.user.id, role);
  }),

  complete: protectedProcedure.mutation(({ ctx }) => {
    const role = requireSupportedRole(ctx.user.role);
    return completeUserOnboarding(ctx.user.id, role);
  }),

  reset: protectedProcedure.mutation(async ({ ctx }) => {
    const role = requireSupportedRole(ctx.user.role);
    await resetUserOnboarding(ctx.user.id, role);
    return { success: true };
  }),

  reportIssue: protectedProcedure
    .input(z.object({
      route: z.string().min(1).max(255),
      title: z.string().trim().min(5).max(180),
      description: z.string().trim().min(10).max(5000),
    }))
    .mutation(async ({ ctx, input }) => {
      const role = requireSupportedRole(ctx.user.role);
      const ticketId = await createSupportTicket({
        reporterId: ctx.user.id,
        venueId: ctx.user.venueId ?? null,
        reporterRole: role,
        route: input.route,
        title: input.title,
        description: input.description,
      });
      return { ticketId };
    }),

  listSupportTickets: protectedProcedure.query(({ ctx }) => {
    const role = requireSupportedRole(ctx.user.role);
    return getSupportTicketsForUser(ctx.user.id, role);
  }),
});
