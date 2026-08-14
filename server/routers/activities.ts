import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  createAuditLog,
  createStaffActivity,
  getDb,
  getStaffActivitiesByAssignee,
  getStaffActivitiesByVenue,
  updateStaffActivityForAssignee,
} from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

const activityStatus = z.enum(["pending", "in_progress", "completed"]);

function assertManagerScope(user: { role: string; venueId: number | null }, venueId: number) {
  if (user.role !== "owner" && (user.role !== "manager" || user.venueId !== venueId)) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
}

export const activitiesRouter = router({
  listByVenue: protectedProcedure
    .input(z.object({ venueId: z.number() }))
    .query(async ({ ctx, input }) => {
      assertManagerScope(ctx.user, input.venueId);
      return getStaffActivitiesByVenue(input.venueId);
    }),

  create: protectedProcedure
    .input(
      z.object({
        venueId: z.number(),
        assignedToUserId: z.number(),
        title: z.string().trim().min(3).max(255),
        description: z.string().trim().max(3000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      assertManagerScope(ctx.user, input.venueId);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [assignee] = await db.select().from(users).where(eq(users.id, input.assignedToUserId)).limit(1);
      if (!assignee || assignee.venueId !== input.venueId || assignee.role !== "staff") {
        throw new TRPCError({ code: "NOT_FOUND", message: "El Staff seleccionado no pertenece a este local" });
      }

      const result = await createStaffActivity({
        venueId: input.venueId,
        assignedToUserId: input.assignedToUserId,
        assignedByUserId: ctx.user.id,
        title: input.title,
        description: input.description,
        status: "pending",
      });

      await createAuditLog({
        venueId: input.venueId,
        userId: ctx.user.id,
        userRole: ctx.user.role,
        action: "CREATE_STAFF_ACTIVITY",
        entity: "staff_activity",
        entityId: Number((result as { insertId?: number })?.insertId) || undefined,
        details: JSON.stringify({ assignedToUserId: input.assignedToUserId, title: input.title }),
      });

      return { success: true };
    }),

  myActivities: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "staff" || !ctx.user.venueId) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    return getStaffActivitiesByAssignee(ctx.user.venueId, ctx.user.id);
  }),

  updateMyStatus: protectedProcedure
    .input(
      z.object({
        activityId: z.number(),
        status: activityStatus,
        completionComment: z.string().trim().max(3000).optional(),
        evidenceImageUrl: z.string().max(2048).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "staff" || !ctx.user.venueId) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const updated = await updateStaffActivityForAssignee(input.activityId, ctx.user.venueId, ctx.user.id, {
        status: input.status,
        completionComment: input.completionComment || null,
        evidenceImageUrl: input.evidenceImageUrl || null,
        completedAt: input.status === "completed" ? new Date() : null,
      });
      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Actividad no encontrada o sin permiso de actualización" });
      }

      await createAuditLog({
        venueId: ctx.user.venueId,
        userId: ctx.user.id,
        userRole: ctx.user.role,
        action: "UPDATE_STAFF_ACTIVITY",
        entity: "staff_activity",
        entityId: input.activityId,
        details: JSON.stringify({ status: input.status, hasComment: Boolean(input.completionComment), hasEvidence: Boolean(input.evidenceImageUrl) }),
      });

      return { success: true };
    }),
});
