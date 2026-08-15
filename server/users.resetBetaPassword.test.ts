import { afterEach, describe, expect, it } from "vitest";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { appRouter } from "./routers";
import { createUserWithPassword, getDb } from "./db";
import { auditLogs, users } from "../drizzle/schema";

const ownerContext = {
  user: { id: 1, openId: "owner-test", name: "Owner", email: "owner@example.com", loginMethod: "test", role: "owner" as const, venueId: null, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
  req: { cookies: {}, headers: { "x-forwarded-proto": "https" } } as any,
  res: { cookie: () => {}, clearCookie: () => {} } as any,
};
const managerContext = { ...ownerContext, user: { ...ownerContext.user, id: 2, role: "manager" as const, venueId: 30001 } };
const createdUserIds: number[] = [];

afterEach(async () => {
  const db = await getDb();
  if (!db) return;
  for (const userId of createdUserIds.splice(0)) {
    await db.delete(auditLogs).where(eq(auditLogs.entityId, userId));
    await db.delete(users).where(eq(users.id, userId));
  }
});

describe("users.resetBetaPassword", () => {
  it("permite al Owner restablecer una cuenta beta y devuelve la clave temporal", async () => {
    const betaUser = await createUserWithPassword({ email: `beta-reset-${Date.now()}@songtap.test`, passwordHash: await bcrypt.hash("ClaveAnterior!26", 10), name: "Beta Reset", role: "staff", venueId: 30001 });
    if (!betaUser) throw new Error("No se creó la cuenta beta temporal");
    createdUserIds.push(betaUser.id);

    const result = await appRouter.createCaller(ownerContext).users.resetBetaPassword({ userId: betaUser.id });
    expect(result.success).toBe(true);
    expect(result.email).toBe(betaUser.email);
    expect(result.temporaryPassword).toMatch(/^Beta![A-Za-z0-9_-]{16}$/);

    const db = await getDb();
    const [updatedUser] = await db!.select().from(users).where(eq(users.id, betaUser.id)).limit(1);
    expect(await bcrypt.compare(result.temporaryPassword, updatedUser!.passwordHash!)).toBe(true);
    expect(await bcrypt.compare("ClaveAnterior!26", updatedUser!.passwordHash!)).toBe(false);
  });

  it("rechaza a usuarios que no sean Owner y a cuentas no beta", async () => {
    const betaUser = await createUserWithPassword({ email: `beta-blocked-${Date.now()}@songtap.test`, passwordHash: await bcrypt.hash("ClaveAnterior!26", 10), name: "Beta Blocked", role: "staff", venueId: 30001 });
    if (!betaUser) throw new Error("No se creó la cuenta beta temporal");
    createdUserIds.push(betaUser.id);

    await expect(appRouter.createCaller(managerContext).users.resetBetaPassword({ userId: betaUser.id })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(appRouter.createCaller(ownerContext).users.resetBetaPassword({ userId: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
