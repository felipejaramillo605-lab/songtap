import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { getUserByEmail, createUserWithPassword } from "./db";
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
