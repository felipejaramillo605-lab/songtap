import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
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
