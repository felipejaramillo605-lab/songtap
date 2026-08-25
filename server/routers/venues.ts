import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "../_core/trpc";
import {
  approveVenueRequest,
  createAuditLog,
  createVenue,
  createVenueRequest,
  getAllVenues,
  getPendingVenueRequests,
  getVenueById,
  getVenueRequestsByManager,
  rejectVenueRequest,
  updateVenue,
} from "../db";

const karaokeProviderSchema = z.object({
  id: z.string().trim().min(1).max(64).regex(/^[a-z0-9-]+$/),
  name: z.string().trim().min(2).max(80),
  searchUrl: z.string().url().max(2048).refine((value) => {
    try {
      const url = new URL(value);
      return ["http:", "https:"].includes(url.protocol) && value.includes("{query}");
    } catch {
      return false;
    }
  }, "La URL debe usar HTTP/HTTPS e incluir {query} como marcador de búsqueda"),
});

const karaokeProvidersSchema = z.array(karaokeProviderSchema).max(8).superRefine((providers, ctx) => {
  const identifiers = new Set<string>();
  providers.forEach((provider, index) => {
    if (identifiers.has(provider.id)) {
      ctx.addIssue({ code: "custom", message: "Cada proveedor debe tener un identificador distinto", path: [index, "id"] });
    }
    identifiers.add(provider.id);
  });
});

export const venuesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role === "owner") {
      return getAllVenues();
    }
    if (ctx.user.venueId) {
      const venue = await getVenueById(ctx.user.venueId);
      return venue ? [venue] : [];
    }
    return [];
  }),

  getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
    if (ctx.user.role !== "owner" && ctx.user.venueId !== input.id) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    const venue = await getVenueById(input.id);
    if (!venue) throw new TRPCError({ code: "NOT_FOUND" });
    return venue;
  }),

  getPublic: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    const venue = await getVenueById(input.id);
    if (!venue || !venue.isActive) throw new TRPCError({ code: "NOT_FOUND" });
    return {
      id: venue.id,
      name: venue.name,
      address: venue.address,
      phone: venue.phone,
      socialLinks: venue.socialLinks,
      logoUrl: venue.logoUrl,
      musicMode: venue.musicMode,
    };
  }),

  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        address: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().email().optional(),
        logoUrl: z.string().optional(),
        socialLinks: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await createVenue({ ...input, isActive: true });
      await createAuditLog({
        userId: ctx.user.id,
        userRole: ctx.user.role,
        action: "CREATE_VENUE",
        entity: "venue",
        details: JSON.stringify({ name: input.name }),
      });
      return { success: true };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        address: z.string().optional(),
        phone: z.string().optional(),
        email: z.string().email().optional(),
        logoUrl: z.string().optional(),
        socialLinks: z.string().optional(),
        musicMode: z.enum(["auto", "manual"]).optional(),
        musicProvider: z.enum(["manual", "spotify", "youtube", "soundcloud"]).optional(),
        karaokeProviders: karaokeProvidersSchema.optional(),
        isActive: z.boolean().optional(),
        privacyPolicyAccepted: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "owner" && ctx.user.venueId !== input.id) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const { id, karaokeProviders, ...data } = input;
      const venueData = {
        ...data,
        ...(karaokeProviders !== undefined ? { karaokeProviders: JSON.stringify(karaokeProviders) } : {}),
      };
      if (venueData.musicProvider) {
        (venueData as Record<string, unknown>).musicConnectionStatus = venueData.musicProvider === "manual" ? "not_configured" : "pending";
        (venueData as Record<string, unknown>).musicMode = "manual";
      }
      if (venueData.privacyPolicyAccepted) {
        (venueData as Record<string, unknown>).privacyPolicyAcceptedAt = new Date();
      }
      await updateVenue(id, venueData);
      await createAuditLog({
        venueId: id,
        userId: ctx.user.id,
        userRole: ctx.user.role,
        action: "UPDATE_VENUE",
        entity: "venue",
        entityId: id,
        details: JSON.stringify(venueData),
      });
      return { success: true };
    }),

  requestVenue: protectedProcedure
    .input(
      z.object({
        venueName: z.string().min(1),
        venueAddress: z.string().optional(),
        venuePhone: z.string().optional(),
        venueEmail: z.string().email().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "manager") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const existing = await getVenueRequestsByManager(ctx.user.id);
      const pending = existing.find((r) => r.status === "pending");
      if (pending) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Ya tienes una solicitud pendiente",
        });
      }
      await createVenueRequest({
        managerId: ctx.user.id,
        venueName: input.venueName,
        venueAddress: input.venueAddress,
        venuePhone: input.venuePhone,
        venueEmail: input.venueEmail,
      });
      return { success: true };
    }),

  getMyRequests: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "manager") {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    return getVenueRequestsByManager(ctx.user.id);
  }),

  getPendingRequests: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "owner") {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    return getPendingVenueRequests();
  }),

  approveRequest: protectedProcedure
    .input(z.object({ requestId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "owner") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const result = await approveVenueRequest(input.requestId, ctx.user.id);
      return result;
    }),

  rejectRequest: protectedProcedure
    .input(z.object({ requestId: z.number(), reason: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "owner") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      await rejectVenueRequest(input.requestId, input.reason);
      return { success: true };
    }),
});
