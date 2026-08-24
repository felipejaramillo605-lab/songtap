import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import {
  getUserByEmail,
  createUserWithPassword,
  setPasswordResetToken,
  getUserByResetToken,
  updateUserPassword,
  createVenueRequest,
} from "./db";
import { sdk } from "./_core/sdk";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import bcrypt from "bcrypt";
import { venuesRouter } from "./routers/venues";
import { usersRouter } from "./routers/users";
import { tablesRouter } from "./routers/tables";
import { qrRouter } from "./routers/qr";
import { menuRouter } from "./routers/menu";
import { ordersRouter } from "./routers/orders";
import { musicRouter } from "./routers/music";
import { financeRouter } from "./routers/finance";
import { uploadRouter } from "./routers/upload";
import { notificationsRouter } from "./routers/notifications";
import { activitiesRouter } from "./routers/activities";
import { pqrsRouter } from "./routers/pqrs";
import { accessRouter } from "./routers/access";
import { testIncidentsRouter } from "./routers/testIncidents";
import { onboardingRouter } from "./routers/onboarding";
import { ownerReportsRouter } from "./routers/ownerReports";

export const appRouter = router({
  system: systemRouter,
  testIncidents: testIncidentsRouter,
  onboarding: onboardingRouter,
  ownerReports: ownerReportsRouter,
  auth: router({
    me: publicProcedure.query(({ ctx }) => {
      return ctx.user || null;
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, cookieOptions);
      return { success: true };
    }),
    loginPassword: publicProcedure
      .input(z.object({ email: z.string().email(), password: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const user = await getUserByEmail(input.email);
        if (!user || !user.passwordHash) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Correo o contraseña incorrectos" });
        }
        const valid = await bcrypt.compare(input.password, user.passwordHash);
        if (!valid) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Correo o contraseña incorrectos" });
        }
        const sessionToken = await sdk.createSessionToken(user.openId, {
          name: user.name || user.email || "Usuario",
          sessionVersion: user.sessionVersion,
        });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: 365 * 24 * 60 * 60 * 1000 });
        return { success: true, user };
      }),
    registerPassword: publicProcedure
      .input(
        z.object({
          email: z.string().email(),
          password: z.string().min(6),
          name: z.string(),
          accountType: z.enum(["user", "manager"]).optional().default("user"),
          venueName: z.string().optional(),
          venueAddress: z.string().optional(),
          venuePhone: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (input.accountType === "manager" && (!input.venueName || input.venueName.trim() === "")) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "El nombre del local es obligatorio para cuentas de tipo Manager.",
          });
        }

        const existing = await getUserByEmail(input.email);
        if (existing) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "El correo ya está registrado" });
        }
        const passwordHash = await bcrypt.hash(input.password, 10);
        const role = input.accountType === "manager" ? "manager" : "user";
        const newUser = await createUserWithPassword({
          email: input.email,
          passwordHash,
          name: input.name,
          role,
        });
        if (!newUser) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        if (role === "manager" && input.venueName) {
          await createVenueRequest({
            managerId: newUser.id,
            venueName: input.venueName,
            venueAddress: input.venueAddress,
            venuePhone: input.venuePhone,
            venueEmail: newUser.email,
          });
        }

        const sessionToken = await sdk.createSessionToken(newUser.openId, {
          name: newUser.name || newUser.email || "Usuario",
        });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: 365 * 24 * 60 * 60 * 1000 });
        return { success: true, user: newUser };
      }),
    forgotPassword: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input }) => {
        const user = await getUserByEmail(input.email);
        if (!user) {
          return { success: true, message: "Si el correo está registrado, recibirás instrucciones." };
        }
        const token = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
        const expires = new Date(Date.now() + 3600 * 1000);
        await setPasswordResetToken(input.email, token, expires);
        console.log(`[Password Reset] Token para ${input.email}: ${token}`);
        return { success: true, message: "Instrucciones enviadas al correo electrónico." };
      }),
    resetPassword: publicProcedure
      .input(z.object({ token: z.string(), newPassword: z.string().min(6) }))
      .mutation(async ({ input }) => {
        const user = await getUserByResetToken(input.token);
        if (!user || !user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "El token es inválido o ha expirado" });
        }
        const passwordHash = await bcrypt.hash(input.newPassword, 10);
        await updateUserPassword(user.id, passwordHash);
        return { success: true, message: "Contraseña actualizada con éxito" };
      }),
  }),
  venues: venuesRouter,
  users: usersRouter,
  tables: tablesRouter,
  qr: qrRouter,
  menu: menuRouter,
  orders: ordersRouter,
  music: musicRouter,
  finance: financeRouter,
  upload: uploadRouter,
  notifications: notificationsRouter,
  activities: activitiesRouter,
  pqrs: pqrsRouter,
  access: accessRouter,
});

export type AppRouter = typeof appRouter;
