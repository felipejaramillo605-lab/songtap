import { afterEach, describe, expect, it } from "vitest";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";
import { appRouter } from "./routers";
import { createUserWithPassword, getDb, getUserByResetToken, setPasswordResetToken, updateUserPassword } from "./db";
import { sdk } from "./_core/sdk";
import { COOKIE_NAME } from "../shared/const";
import { users } from "../drizzle/schema";

const createdUserIds: number[] = [];

afterEach(async () => {
  const db = await getDb();
  if (!db || !createdUserIds.length) return;
  for (const id of createdUserIds.splice(0)) {
    await db.delete(users).where(eq(users.id, id));
  }
});

describe("Endurecimiento de autenticación y sesiones", () => {
  it("nunca devuelve hashes, tokens de recuperación ni versión de sesión a un cliente", async () => {
    const context = {
      user: {
        id: 701001,
        openId: "safe-user",
        email: "safe@songtap.test",
        name: "Usuario seguro",
        role: "staff",
        venueId: 30001,
        passwordHash: "hash-privado",
        resetPasswordToken: "token-privado",
        resetPasswordExpires: new Date(),
        sessionVersion: 7,
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      req: { headers: {} },
      res: { cookie: () => {}, clearCookie: () => {} },
    } as any;

    const response = await appRouter.createCaller(context).auth.me();
    expect(response).not.toHaveProperty("passwordHash");
    expect(response).not.toHaveProperty("resetPasswordToken");
    expect(response).not.toHaveProperty("resetPasswordExpires");
    expect(response).not.toHaveProperty("sessionVersion");
  });

  it("guarda el token de recuperación hasheado y revoca sesiones tras cambiar la clave", async () => {
    const user = await createUserWithPassword({
      email: `auth-security-${Date.now()}@songtap.test`,
      passwordHash: await bcrypt.hash("ClaveInicial!26", 10),
      name: "Auth Security",
      role: "staff",
      venueId: 30001,
    });
    if (!user) throw new Error("No se creó el usuario temporal");
    createdUserIds.push(user.id);

    const resetToken = "r".repeat(48);
    await setPasswordResetToken(user.email!, resetToken, new Date(Date.now() + 60_000));
    const db = await getDb();
    const [persisted] = await db!.select().from(users).where(eq(users.id, user.id)).limit(1);
    expect(persisted?.resetPasswordToken).not.toBe(resetToken);
    expect(await getUserByResetToken(resetToken)).toMatchObject({ id: user.id });

    const oldSession = await sdk.createSessionToken(user.openId, { name: user.name ?? "Auth Security", sessionVersion: user.sessionVersion });
    const request = { headers: { cookie: `${COOKIE_NAME}=${oldSession}` } } as any;
    await expect(sdk.authenticateRequest(request)).resolves.toMatchObject({ id: user.id });

    await db!.update(users).set({ failedLoginAttempts: 10, loginLockedUntil: new Date(Date.now() + 60_000) }).where(eq(users.id, user.id));
    await updateUserPassword(user.id, await bcrypt.hash("ClaveNueva!26", 10));
    await expect(sdk.authenticateRequest(request)).rejects.toThrow("Session revoked");
    const [updatedUser] = await db!.select().from(users).where(eq(users.id, user.id)).limit(1);
    expect(updatedUser).toMatchObject({ failedLoginAttempts: 0, loginLockedUntil: null });
  });
});
