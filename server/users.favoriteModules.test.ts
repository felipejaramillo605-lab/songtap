import { afterEach, describe, expect, it } from "vitest";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { appRouter } from "./routers";
import { createUserWithPassword, getDb } from "./db";
import { auditLogs, userFavoriteModules, users } from "../drizzle/schema";

const createdUserIds: number[] = [];

function contextFor(user: { id: number; role: "manager" | "staff"; venueId: number }) {
  return {
    user: { id: user.id, openId: `test-${user.id}`, name: "Favorite Test", email: "favorite@example.com", loginMethod: "password", role: user.role, venueId: user.venueId, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { cookies: {}, headers: { "x-forwarded-proto": "https" } } as any,
    res: { cookie: () => {}, clearCookie: () => {} } as any,
  };
}

afterEach(async () => {
  const db = await getDb();
  if (!db) return;
  for (const userId of createdUserIds.splice(0)) {
    await db.delete(userFavoriteModules).where(eq(userFavoriteModules.userId, userId));
    await db.delete(auditLogs).where(eq(auditLogs.userId, userId));
    await db.delete(users).where(eq(users.id, userId));
  }
});

describe("users.favoriteModules", () => {
  it("guarda y elimina favoritos únicamente para el usuario autenticado", async () => {
    const user = await createUserWithPassword({ email: `favorite-manager-${Date.now()}@songtap.test`, passwordHash: await bcrypt.hash("Clave!26", 10), name: "Favorite Manager", role: "manager", venueId: 30001 });
    if (!user) throw new Error("No se creó el usuario temporal");
    createdUserIds.push(user.id);
    const caller = appRouter.createCaller(contextFor({ id: user.id, role: "manager", venueId: 30001 }));

    expect((await caller.users.favoriteModules()).find((module) => module.key === "manager.menu")?.isFavorite).toBe(false);
    await caller.users.setFavoriteModule({ moduleKey: "manager.menu", isFavorite: true });
    expect((await caller.users.favoriteModules()).find((module) => module.key === "manager.menu")?.isFavorite).toBe(true);
    await caller.users.setFavoriteModule({ moduleKey: "manager.menu", isFavorite: false });
    expect((await caller.users.favoriteModules()).find((module) => module.key === "manager.menu")?.isFavorite).toBe(false);
  });

  it("bloquea módulos que no pertenecen al rol autenticado", async () => {
    const user = await createUserWithPassword({ email: `favorite-staff-${Date.now()}@songtap.test`, passwordHash: await bcrypt.hash("Clave!26", 10), name: "Favorite Staff", role: "staff", venueId: 30001 });
    if (!user) throw new Error("No se creó el usuario temporal");
    createdUserIds.push(user.id);
    const caller = appRouter.createCaller(contextFor({ id: user.id, role: "staff", venueId: 30001 }));

    await expect(caller.users.setFavoriteModule({ moduleKey: "manager.finance", isFavorite: true })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
