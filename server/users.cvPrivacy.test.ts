import { afterEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";

const mocks = vi.hoisted(() => ({
  storageGetSignedUrl: vi.fn(async (key: string) => `https://signed.example.test/${encodeURIComponent(key)}?expires=900`),
}));

vi.mock("./storage", () => ({
  storageGetSignedUrl: mocks.storageGetSignedUrl,
  storagePut: vi.fn(),
}));

import { appRouter } from "./routers";
import { createUserWithPassword, getDb } from "./db";
import { users } from "../drizzle/schema";

const createdUserIds: number[] = [];

function context(role: "owner" | "manager" | "staff", venueId: number | null, id: number) {
  return {
    user: {
      id,
      openId: `cv-${role}-${id}`,
      name: `${role} CV`,
      email: `${role}-${id}@songtap.test`,
      role,
      venueId,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { headers: {} },
    res: { cookie: () => {}, clearCookie: () => {} },
  } as any;
}

async function createCvUser(venueId = 30001, cvUrl?: string) {
  const user = await createUserWithPassword({
    email: `cv-private-${Date.now()}-${Math.random().toString(36).slice(2)}@songtap.test`,
    passwordHash: await bcrypt.hash("ClaveCV!26", 10),
    name: "Staff CV privado",
    role: "staff",
    venueId,
  });
  if (!user) throw new Error("No se creó el usuario de CV temporal");
  createdUserIds.push(user.id);
  const db = await getDb();
  const privateReference = cvUrl ?? `private-cv://private/cv/${user.id}/cv-seguro.pdf`;
  await db!.update(users).set({ cvUrl: privateReference }).where(eq(users.id, user.id));
  return { ...user, cvUrl: privateReference };
}

afterEach(async () => {
  mocks.storageGetSignedUrl.mockClear();
  const db = await getDb();
  if (!db) return;
  for (const id of createdUserIds.splice(0)) {
    await db.delete(users).where(eq(users.id, id));
  }
});

describe("CV privado con URL temporal", () => {
  it("permite al titular generar una URL firmada temporal sin exponer la clave", async () => {
    const target = await createCvUser();
    const result = await appRouter.createCaller(context("staff", 30001, target.id)).users.getCvDownloadUrl({ userId: target.id });

    expect(result.url).toContain("https://signed.example.test/private%2Fcv%2F");
    expect(mocks.storageGetSignedUrl).toHaveBeenCalledWith(`private/cv/${target.id}/cv-seguro.pdf`);
  });

  it("permite a un Manager descargar únicamente CV de Staff de su propio local", async () => {
    const ownStaff = await createCvUser(30001);
    const otherStaff = await createCvUser(30002);
    const manager = appRouter.createCaller(context("manager", 30001, 801001));

    await expect(manager.users.getCvDownloadUrl({ userId: ownStaff.id })).resolves.toMatchObject({ url: expect.stringContaining("expires=900") });
    await expect(manager.users.getCvDownloadUrl({ userId: otherStaff.id })).rejects.toMatchObject({ code: "FORBIDDEN" });

    const listedStaff = (await manager.users.list()).find((user) => user.id === ownStaff.id);
    expect(listedStaff).toMatchObject({ id: ownStaff.id, hasCv: true });
    expect(listedStaff).not.toHaveProperty("cvUrl");
  });

  it("rechaza referencias heredadas o públicas al actualizar el perfil", async () => {
    const target = await createCvUser(30001, "/manus-storage/legacy-cv.pdf");
    const caller = appRouter.createCaller(context("staff", 30001, target.id));

    await expect(caller.users.getCvDownloadUrl({ userId: target.id })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(caller.users.updateProfile({ userId: target.id, cvUrl: "/manus-storage/otro-cv.pdf" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
