import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { getUserByEmail, createUserWithPassword, setPasswordResetToken, getUserByResetToken, updateUserPassword } from "./db";
import bcrypt from "bcrypt";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@shared/const";
import { sdk } from "./_core/sdk";
import { ENV } from "./_core/env";
import { venuesRouter } from "./routers/venues";
import { usersRouter } from "./routers/users";
import { tablesRouter } from "./routers/tables";
import { qrRouter } from "./routers/qr";
import { menuRouter } from "./routers/menu";
import { ordersRouter } from "./routers/orders";
import { musicRouter } from "./routers/music";
import { financeRouter } from "./routers/finance";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
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
        // Emit session cookie using SDK session signing
        const sessionToken = await sdk.createSessionToken(user.openId, {
          name: user.name || user.email || "Usuario",
        });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: 365 * 24 * 60 * 60 * 1000 });
        return { success: true, user };
      }),
    registerPassword: publicProcedure
      .input(z.object({ email: z.string().email(), password: z.string().min(6), name: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const existing = await getUserByEmail(input.email);
        if (existing) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "El correo ya está registrado" });
        }
        const passwordHash = await bcrypt.hash(input.password, 10);
        const newUser = await createUserWithPassword({
          email: input.email,
          passwordHash,
          name: input.name,
          role: "user",
        });
        if (!newUser) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
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
          // Por seguridad respondemos éxito aunque no exista el correo
          return { success: true, message: "Si el correo está registrado, recibirás instrucciones." };
        }
        const token = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2);
        const expires = new Date(Date.now() + 3600 * 1000); // 1 hora
        await setPasswordResetToken(input.email, token, expires);
        // En entorno de desarrollo mostramos un log con el token simulando envío de correo
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
});

export type AppRouter = typeof appRouter;
