import { z } from "zod";
import { createAuditLog, createTestModeIncident } from "../db";
import { previewOwnerProcedure, router } from "../_core/trpc";

export const testIncidentsRouter = router({
  create: previewOwnerProcedure
    .input(z.object({ route: z.string().min(1).max(255), title: z.string().trim().min(4).max(180), description: z.string().trim().min(10).max(4000) }))
    .mutation(async ({ ctx, input }) => {
      const headers = ctx.req.headers;
      const previewRole = headers["x-songtap-preview-role"] as "manager" | "staff";
      const venueId = Number(headers["x-songtap-preview-venue"]);
      const owner = ctx.user!;
      const id = await createTestModeIncident({ ownerId: owner.id, venueId, previewRole, route: input.route, title: input.title, description: input.description });
      await createAuditLog({ venueId, userId: owner.id, userRole: "owner", module: "Modo de pruebas", action: "CREATE_TEST_INCIDENT", entity: "test_mode_incident", entityId: id, details: JSON.stringify({ previewRole, route: input.route, title: input.title }) });
      return { success: true, id };
    }),
});
