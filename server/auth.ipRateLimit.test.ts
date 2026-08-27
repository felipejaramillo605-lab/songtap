import { afterEach, describe, expect, it } from "vitest";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { authIpLoginLimits, users } from "../drizzle/schema";
import { createUserWithPassword, getDb, hashLoginIp, recordIpLoginFailure } from "./db";
import { appRouter } from "./routers";

const createdUserIds: number[] = [];
const testedIpHashes: string[] = [];

afterEach(async () => {
  const db = await getDb();
  if (!db) return;
  for (const ipHash of testedIpHashes.splice(0)) {
    await db.delete(authIpLoginLimits).where(eq(authIpLoginLimits.ipHash, ipHash));
  }
  for (const userId of createdUserIds.splice(0)) {
    await db.delete(users).where(eq(users.id, userId));
  }
});

function createLoginCaller(ip: string) {
  const cookies: Array<{ name: string; value: string }> = [];
  const context = {
    user: null,
    req: { headers: {}, ip },
    res: { cookie: (name: string, value: string) => cookies.push({ name, value }) },
  } as any;
  return { caller: appRouter.createCaller(context), cookies };
}

describe("Limitación de inicio de sesión por dirección IP", () => {
  it("pausa una red después de treinta fallos y no conserva su IP original", async () => {
    const ip = `203.0.113.${(Date.now() % 200) + 10}`;
    const ipHash = hashLoginIp(ip);
    testedIpHashes.push(ipHash);

    const firstAttempt = createLoginCaller(ip);
    await expect(firstAttempt.caller.auth.loginPassword({ email: `missing-ip-${Date.now()}-1@songtap.test`, password: "ClaveIncorrecta!26" }))
      .rejects.toMatchObject({ code: "UNAUTHORIZED" });
    for (let attempt = 2; attempt <= 29; attempt += 1) {
      await recordIpLoginFailure(ip);
    }

    const thresholdFailure = await recordIpLoginFailure(ip);
    expect(thresholdFailure).toMatchObject({ attempts: 30, isBlocked: true });

    const blockedAttempt = createLoginCaller(ip);
    await expect(blockedAttempt.caller.auth.loginPassword({ email: `missing-ip-${Date.now()}-30@songtap.test`, password: "ClaveIncorrecta!26" }))
      .rejects.toMatchObject({
        code: "TOO_MANY_REQUESTS",
        message: expect.stringContaining("pausamos temporalmente los accesos desde esta red"),
      });

    const db = await getDb();
    const [record] = await db!.select().from(authIpLoginLimits).where(eq(authIpLoginLimits.ipHash, ipHash)).limit(1);
    expect(record).toMatchObject({ ipHash, failedAttempts: 30 });
    expect(record?.blockedUntil).toBeInstanceOf(Date);
    expect(JSON.stringify(record)).not.toContain(ip);
  });

  it("bloquea antes de validar credenciales y borra el límite tras un acceso válido posterior", async () => {
    const ip = `198.51.100.${(Date.now() % 200) + 10}`;
    const ipHash = hashLoginIp(ip);
    testedIpHashes.push(ipHash);
    const user = await createUserWithPassword({
      email: `ip-recovery-${Date.now()}@songtap.test`,
      passwordHash: await bcrypt.hash("ClaveCorrecta!26", 4),
      name: "Cuenta con red limitada",
      role: "staff",
      venueId: 30001,
    });
    if (!user) throw new Error("No se creó el usuario temporal");
    createdUserIds.push(user.id);
    const db = await getDb();
    await db!.insert(authIpLoginLimits).values({
      ipHash,
      windowStartedAt: new Date(),
      failedAttempts: 30,
      blockedUntil: new Date(Date.now() + 60_000),
      lastAttemptAt: new Date(),
    });

    const blockedAttempt = createLoginCaller(ip);
    await expect(blockedAttempt.caller.auth.loginPassword({ email: user.email!, password: "ClaveCorrecta!26" }))
      .rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
    expect(blockedAttempt.cookies).toHaveLength(0);

    await db!.update(authIpLoginLimits).set({ blockedUntil: new Date(Date.now() - 1_000) }).where(eq(authIpLoginLimits.ipHash, ipHash));
    const validAttempt = createLoginCaller(ip);
    await expect(validAttempt.caller.auth.loginPassword({ email: user.email!, password: "ClaveCorrecta!26" }))
      .resolves.toMatchObject({ success: true, user: { id: user.id } });
    expect(validAttempt.cookies).toHaveLength(1);

    const [cleared] = await db!.select().from(authIpLoginLimits).where(eq(authIpLoginLimits.ipHash, ipHash)).limit(1);
    expect(cleared).toBeUndefined();
  });
});
