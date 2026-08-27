import { afterEach, describe, expect, it } from "vitest";
import bcrypt from "bcrypt";
import { and, eq } from "drizzle-orm";
import { auditLogs, users } from "../drizzle/schema";
import { createUserWithPassword, getDb } from "./db";
import { appRouter } from "./routers";

const createdUserIds: number[] = [];

afterEach(async () => {
  const db = await getDb();
  if (!db || !createdUserIds.length) return;
  for (const id of createdUserIds.splice(0)) {
    await db.delete(auditLogs).where(eq(auditLogs.userId, id));
    await db.delete(users).where(eq(users.id, id));
  }
});

function createLoginCaller() {
  const cookies: Array<{ name: string; value: string }> = [];
  const context = {
    user: null,
    req: { headers: {} },
    res: { cookie: (name: string, value: string) => cookies.push({ name, value }) },
  } as any;
  return { caller: appRouter.createCaller(context), cookies };
}

describe("Bloqueo temporal de inicio de sesión por contraseña", () => {
  it("bloquea la cuenta durante quince minutos en el décimo fallo y conserva un mensaje empático", async () => {
    const user = await createUserWithPassword({
      email: `lockout-${Date.now()}@songtap.test`,
      passwordHash: await bcrypt.hash("ClaveCorrecta!26", 4),
      name: "Cuenta protegida",
      role: "staff",
      venueId: 30001,
    });
    if (!user) throw new Error("No se creó el usuario temporal");
    createdUserIds.push(user.id);

    for (let attempt = 1; attempt <= 9; attempt += 1) {
      const { caller } = createLoginCaller();
      await expect(caller.auth.loginPassword({ email: user.email!, password: "ClaveIncorrecta!26" }))
        .rejects.toMatchObject({
          code: "UNAUTHORIZED",
          message: expect.stringContaining("No pudimos iniciar sesión"),
        });
    }

    const beforeLock = await getDb();
    const [afterNineFailures] = await beforeLock!.select().from(users).where(eq(users.id, user.id)).limit(1);
    expect(afterNineFailures).toMatchObject({ failedLoginAttempts: 9, loginLockedUntil: null });

    const { caller } = createLoginCaller();
    await expect(caller.auth.loginPassword({ email: user.email!, password: "ClaveIncorrecta!26" }))
      .rejects.toMatchObject({
        code: "TOO_MANY_REQUESTS",
        message: expect.stringContaining("pausamos temporalmente los intentos de acceso"),
      });

    const [locked] = await beforeLock!.select().from(users).where(eq(users.id, user.id)).limit(1);
    expect(locked?.failedLoginAttempts).toBe(10);
    expect(locked?.loginLockedUntil).toBeInstanceOf(Date);
    expect(locked!.loginLockedUntil!.getTime()).toBeGreaterThan(Date.now() + 14 * 60 * 1000);

    const audit = await beforeLock!
      .select()
      .from(auditLogs)
      .where(and(eq(auditLogs.userId, user.id), eq(auditLogs.action, "PASSWORD_LOGIN_TEMPORARILY_LOCKED")));
    expect(audit).toHaveLength(1);
  });

  it("impide el acceso mientras está bloqueada y restablece el contador al lograr un acceso válido posterior", async () => {
    const user = await createUserWithPassword({
      email: `lockout-recovery-${Date.now()}@songtap.test`,
      passwordHash: await bcrypt.hash("ClaveCorrecta!26", 4),
      name: "Cuenta recuperable",
      role: "staff",
      venueId: 30001,
    });
    if (!user) throw new Error("No se creó el usuario temporal");
    createdUserIds.push(user.id);
    const db = await getDb();
    await db!.update(users).set({ failedLoginAttempts: 10, loginLockedUntil: new Date(Date.now() + 60_000) }).where(eq(users.id, user.id));

    const blockedAttempt = createLoginCaller();
    await expect(blockedAttempt.caller.auth.loginPassword({ email: user.email!, password: "ClaveCorrecta!26" }))
      .rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
    expect(blockedAttempt.cookies).toHaveLength(0);

    await db!.update(users).set({ loginLockedUntil: new Date(Date.now() - 1_000) }).where(eq(users.id, user.id));
    const validAttempt = createLoginCaller();
    await expect(validAttempt.caller.auth.loginPassword({ email: user.email!, password: "ClaveCorrecta!26" }))
      .resolves.toMatchObject({ success: true, user: { id: user.id } });
    expect(validAttempt.cookies).toHaveLength(1);

    const [recovered] = await db!.select().from(users).where(eq(users.id, user.id)).limit(1);
    expect(recovered).toMatchObject({ failedLoginAttempts: 0, loginLockedUntil: null });
  });
});
