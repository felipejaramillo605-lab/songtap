import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  completeUserOnboarding,
  createSupportTicket,
  getSupportTicketsForUser,
  getUserOnboardingProgress,
  markUserOnboardingOpened,
  markUserOnboardingAutoShown,
  resetUserOnboarding,
  getHelpArticleInteractions,
  setHelpArticleVote,
  toggleHelpArticleFavorite,
  type OnboardingRole,
} from "../db";
import { isHelpArticleKey } from "../../shared/helpArticles";

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

  markAutoShown: protectedProcedure.mutation(({ ctx }) => {
    const role = requireSupportedRole(ctx.user.role);
    return markUserOnboardingAutoShown(ctx.user.id, role);
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

  getHelpInteractions: protectedProcedure.query(({ ctx }) => {
    requireSupportedRole(ctx.user.role);
    return getHelpArticleInteractions(ctx.user.id);
  }),

  setHelpVote: protectedProcedure
    .input(z.object({ articleKey: z.string().max(96), vote: z.enum(["up", "down"]).nullable() }))
    .mutation(async ({ ctx, input }) => {
      requireSupportedRole(ctx.user.role);
      if (!isHelpArticleKey(input.articleKey)) throw new TRPCError({ code: "BAD_REQUEST", message: "La solución de ayuda no existe." });
      const vote = await setHelpArticleVote(ctx.user.id, input.articleKey, input.vote);
      return { vote };
    }),

  toggleHelpFavorite: protectedProcedure
    .input(z.object({ articleKey: z.string().max(96) }))
    .mutation(async ({ ctx, input }) => {
      requireSupportedRole(ctx.user.role);
      if (!isHelpArticleKey(input.articleKey)) throw new TRPCError({ code: "BAD_REQUEST", message: "La solución de ayuda no existe." });
      const isFavorite = await toggleHelpArticleFavorite(ctx.user.id, input.articleKey);
      return { isFavorite };
    }),
});
