import { TRPCError } from "@trpc/server";
import { parse as parseCookie } from "cookie";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { createHeartbeatJob, updateHeartbeatJob } from "../_core/heartbeat";
import { protectedProcedure, router } from "../_core/trpc";
import {
  getOwnerReportSchedule,
  getOwnerScheduledReport,
  getOwnerScheduledReports,
  generateOwnerManualReport,
  saveOwnerReportSchedule,
} from "../db";

const reportScheduleInput = z.object({
  weekday: z.number().int().min(1).max(7),
  hour: z.number().int().min(0).max(23),
  minute: z.number().int().min(0).max(59),
  isEnabled: z.boolean(),
});

function colombiaWeeklyCron(input: z.infer<typeof reportScheduleInput>) {
  const utcHour = input.hour + 5;
  const cronHour = utcHour % 24;
  const cronWeekday = utcHour >= 24 ? (input.weekday % 7) + 1 : input.weekday;
  return `0 ${input.minute} ${cronHour} * * ${cronWeekday}`;
}

function parseNextExecutionAt(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function ownerSessionFromCookie(cookieHeader?: string) {
  return parseCookie(cookieHeader ?? "")[COOKIE_NAME] ?? "";
}

async function requireOwner(user: { role: string }) {
  if (user.role !== "owner") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Solo el Owner puede configurar reportes internos." });
  }
}

export const ownerReportsRouter = router({
  getSchedule: protectedProcedure.query(async ({ ctx }) => {
    await requireOwner(ctx.user);
    return getOwnerReportSchedule(ctx.user.id);
  }),

  list: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(24).optional() }).optional())
    .query(async ({ ctx, input }) => {
      await requireOwner(ctx.user);
      return getOwnerScheduledReports(ctx.user.id, input?.limit ?? 12);
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      await requireOwner(ctx.user);
      const report = await getOwnerScheduledReport(ctx.user.id, input.id);
      if (!report) throw new TRPCError({ code: "NOT_FOUND", message: "Reporte no encontrado." });
      return report;
    }),

  generateManual: protectedProcedure
    .input(z.object({ requestId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await requireOwner(ctx.user);
      try {
        return await generateOwnerManualReport(ctx.user.id, input.requestId);
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error instanceof Error ? error.message : "No fue posible generar el reporte manual.",
        });
      }
    }),

  configure: protectedProcedure.input(reportScheduleInput).mutation(async ({ ctx, input }) => {
    await requireOwner(ctx.user);
    const existing = await getOwnerReportSchedule(ctx.user.id);
    const cronExpression = colombiaWeeklyCron(input);
    let taskUid = existing?.scheduleCronTaskUid ?? null;
    let nextExecutionAt = existing?.nextExecutionAt ?? null;

    if (input.isEnabled && process.env.NODE_ENV !== "production") {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Publica SongTap antes de activar el reporte programado. La configuración puede guardarse sin activarlo.",
      });
    }

    if (input.isEnabled && !taskUid) {
      const created = await createHeartbeatJob(
        {
          name: `owner-report-${ctx.user.id}`,
          cron: cronExpression,
          path: "/api/scheduled/owner-report",
          method: "POST",
          description: "Reporte consolidado interno semanal de SongTap para Owner.",
        },
        ownerSessionFromCookie(ctx.req.headers.cookie)
      );
      taskUid = created.taskUid;
      nextExecutionAt = parseNextExecutionAt(created.nextExecutionAt);
    } else if (taskUid) {
      const updated = await updateHeartbeatJob(
        taskUid,
        {
          cron: cronExpression,
          path: "/api/scheduled/owner-report",
          method: "POST",
          description: "Reporte consolidado interno semanal de SongTap para Owner.",
          enable: input.isEnabled,
        },
        ownerSessionFromCookie(ctx.req.headers.cookie)
      );
      nextExecutionAt = parseNextExecutionAt(updated.nextExecutionAt);
    }

    return saveOwnerReportSchedule({
      ownerId: ctx.user.id,
      weekday: input.weekday,
      hour: input.hour,
      minute: input.minute,
      cronExpression,
      taskUid,
      isEnabled: input.isEnabled,
      nextExecutionAt,
    });
  }),
});

export { colombiaWeeklyCron };
