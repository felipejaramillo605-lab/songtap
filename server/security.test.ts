import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { getDb } from "./db";
import { auditLogs, menuCategories, pqrsSlaTargets, pqrsTickets, qrSessions, songQueue, staffActivities, tables, users, venues } from "../drizzle/schema";
import { eq } from "drizzle-orm";

const req = { cookies: {}, headers: { "x-forwarded-proto": "https" } } as any;
const res = { cookie: () => {}, clearCookie: () => {} } as any;

function ctx(role: string, venueId: number | null, id = 9999) {
  return {
    user: {
      id,
      openId: `test-${role}-${id}`,
      name: `${role} Test`,
      email: `${role}@test.com`,
      loginMethod: "password",
      role,
      venueId,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req,
    res,
  } as any;
}

describe("Seguridad de roles y aislamiento por empresa", () => {
  it("un Staff no puede cambiar su propio rol a Manager", async () => {
    const caller = appRouter.createCaller(ctx("staff", 10, 9001));
    await expect(caller.users.assignToVenue({ userId: 9001, venueId: 10, role: "manager" })).rejects.toThrow();
  });

  it("un Manager no puede asignar a alguien como Manager (solo Staff)", async () => {
    const caller = appRouter.createCaller(ctx("manager", 10, 9002));
    await expect(caller.users.assignToVenue({ userId: 9003, venueId: 10, role: "manager" })).rejects.toThrow();
  });

  it("un Manager no puede modificar tablas de otra empresa", async () => {
    const caller = appRouter.createCaller(ctx("manager", 20, 9004));
    await expect(caller.tables.list({ venueId: 99 })).rejects.toThrow("FORBIDDEN");
  });

  it("un Manager no puede ver el menú de otra empresa", async () => {
    const caller = appRouter.createCaller(ctx("manager", 20, 9005));
    await expect(caller.menu.getFullMenu({ venueId: 99 })).rejects.toThrow("FORBIDDEN");
  });

  it("un Staff no puede crear categorías del menú", async () => {
    const caller = appRouter.createCaller(ctx("staff", 10, 9006));
    await expect(caller.menu.createCategory({ venueId: 10, name: "Bebidas" })).rejects.toThrow("FORBIDDEN");
  });

  it("un Staff no puede ver actividades de otra empresa", async () => {
    const caller = appRouter.createCaller(ctx("staff", 10, 9007));
    await expect(caller.activities.listByVenue({ venueId: 10 })).rejects.toThrow("FORBIDDEN");
  });

  it("un Manager puede listar actividades de su propio local", async () => {
    const caller = appRouter.createCaller(ctx("manager", 30001, 9008));
    const activities = await caller.activities.listByVenue({ venueId: 30001 });
    expect(Array.isArray(activities)).toBe(true);
  });

  it("un Staff puede consultar sus propias actividades", async () => {
    const caller = appRouter.createCaller(ctx("staff", 30001, 9009));
    const activities = await caller.activities.myActivities();
    expect(Array.isArray(activities)).toBe(true);
  });

  it("un Staff no puede actualizar actividades de otro Staff", async () => {
    const caller = appRouter.createCaller(ctx("staff", 30001, 9010));
    await expect(caller.activities.updateMyStatus({ activityId: 1, status: "completed" })).rejects.toThrow();
  });

  it("un Manager solo puede guardar la preferencia musical pendiente de su propio local", async () => {
    const db = await getDb();
    if (!db) return;
    const caller = appRouter.createCaller(ctx("manager", 30001, 9014));
    const [originalVenue] = await db.select().from(venues).where(eq(venues.id, 30001)).limit(1);
    await caller.venues.update({ id: 30001, musicProvider: "youtube" });
    const [updatedVenue] = await db.select().from(venues).where(eq(venues.id, 30001)).limit(1);
    expect(updatedVenue?.musicProvider).toBe("youtube");
    expect(updatedVenue?.musicConnectionStatus).toBe("pending");
    await expect(caller.venues.update({ id: 30002, musicProvider: "soundcloud" })).rejects.toThrow("FORBIDDEN");
    await db.update(venues).set({
      musicProvider: originalVenue?.musicProvider ?? "manual",
      musicConnectionStatus: originalVenue?.musicConnectionStatus ?? "not_configured",
      musicMode: originalVenue?.musicMode ?? "manual",
    }).where(eq(venues.id, 30001));
  });

  it("un Manager no puede editar, mover ni eliminar un usuario de otra empresa por ID", async () => {
    const db = await getDb();
    if (!db) return;
    const externalUserOpenId = `security-external-user-${Date.now()}`;
    const result = await db.insert(users).values({
      openId: externalUserOpenId,
      name: "Usuario Empresa Externa",
      email: `${externalUserOpenId}@test.com`,
      loginMethod: "password",
      role: "staff",
      venueId: 88302,
      lastSignedIn: new Date(),
    });
    const externalUserId = Number((result[0] as { insertId?: number }).insertId);
    const caller = appRouter.createCaller(ctx("manager", 88301, 9013));

    await expect(caller.users.updateProfile({ userId: externalUserId, name: "Perfil comprometido" })).rejects.toThrow("FORBIDDEN");
    await expect(caller.users.assignToVenue({ userId: externalUserId, venueId: 88301, role: "staff" })).rejects.toThrow("No se puede mover personal de otra empresa");
    await expect(caller.users.deleteUser({ userId: externalUserId })).rejects.toThrow("FORBIDDEN");

    const [externalUser] = await db.select().from(users).where(eq(users.id, externalUserId)).limit(1);
    expect(externalUser?.venueId).toBe(88302);
    expect(externalUser?.name).toBe("Usuario Empresa Externa");
    await db.delete(users).where(eq(users.id, externalUserId));
  });
});

describe("Aislamiento por IDs adivinables y token QR", () => {
  it("rechaza valores no numéricos antes de llegar a las consultas", async () => {
    const caller = appRouter.createCaller(ctx("manager", 20, 9000));
    await expect(caller.tables.list({ venueId: "20 OR 1=1" as never })).rejects.toThrow();
  });

  it("un Manager no puede actualizar una mesa de otra empresa usando un ID adivinable", async () => {
    const db = await getDb();
    if (!db) return;
    const result = await db.insert(tables).values({ venueId: 88002, name: "Mesa ajena", qrToken: `security-table-${Date.now()}`, isActive: true });
    const tableId = Number((result[0] as { insertId?: number }).insertId);
    const caller = appRouter.createCaller(ctx("manager", 88001, 9004));

    await expect(caller.tables.update({ id: tableId, venueId: 88001, name: "Mesa comprometida" })).rejects.toThrow("Mesa no encontrada");
    const [table] = await db.select().from(tables).where(eq(tables.id, tableId)).limit(1);
    expect(table?.name).toBe("Mesa ajena");
    await db.delete(tables).where(eq(tables.id, tableId));
  });

  it("un Manager no puede modificar una categoría de otra empresa usando un ID adivinable", async () => {
    const db = await getDb();
    if (!db) return;
    const result = await db.insert(menuCategories).values({ venueId: 88102, name: "Categoría ajena", isActive: true, sortOrder: 1 });
    const categoryId = Number((result[0] as { insertId?: number }).insertId);
    const caller = appRouter.createCaller(ctx("manager", 88101, 9005));

    await expect(caller.menu.updateCategory({ id: categoryId, venueId: 88101, name: "Categoría comprometida" })).rejects.toThrow("Categoría no encontrada");
    const [category] = await db.select().from(menuCategories).where(eq(menuCategories.id, categoryId)).limit(1);
    expect(category?.name).toBe("Categoría ajena");
    await db.delete(menuCategories).where(eq(menuCategories.id, categoryId));
  });

  it("un Staff no puede seleccionar una canción de otra empresa por ID", async () => {
    const db = await getDb();
    if (!db) return;
    const result = await db.insert(songQueue).values({ venueId: 88202, songName: "Canción ajena", artist: "Prueba", position: 1, isCurrentlyPlaying: false });
    const songId = Number((result[0] as { insertId?: number }).insertId);
    const caller = appRouter.createCaller(ctx("staff", 88201, 9006));

    await expect(caller.music.playSong({ venueId: 88201, songId })).rejects.toThrow("Canción no encontrada");
    const [song] = await db.select().from(songQueue).where(eq(songQueue.id, songId)).limit(1);
    expect(song?.isCurrentlyPlaying).toBe(false);
    await db.delete(songQueue).where(eq(songQueue.id, songId));
  });

  it("un token QR distinto no puede consultar pedidos de otra sesión", async () => {
    const db = await getDb();
    if (!db) return;
    const token = `security-session-${Date.now()}-token`;
    const result = await db.insert(qrSessions).values({ venueId: 30001, tableId: 99001, sessionToken: token, clientName: "Cliente de prueba", isActive: true });
    const sessionId = Number((result[0] as { insertId?: number }).insertId);
    const caller = appRouter.createCaller(ctx("user", null, 9011));

    await expect(caller.orders.getBySession({ sessionId, sessionToken: "wrong-security-session-token" })).rejects.toThrow("sesión QR no es válida");
    const orders = await caller.orders.getBySession({ sessionId, sessionToken: token });
    expect(Array.isArray(orders)).toBe(true);
    await db.delete(qrSessions).where(eq(qrSessions.id, sessionId));
  });

  it("recorre PQRS con persistencia real, bloquea otro local y devuelve la respuesta a la sesión QR", async () => {
    const db = await getDb();
    if (!db) return;
    const token = `security-pqrs-session-${Date.now()}-token`;
    const sessionResult = await db.insert(qrSessions).values({
      venueId: 30001,
      tableId: 99501,
      sessionToken: token,
      clientName: "Cliente PQRS",
      isActive: true,
    });
    const sessionId = Number((sessionResult[0] as { insertId?: number }).insertId);
    const client = appRouter.createCaller(ctx("user", null, 9025));
    let ticketId = 0;
    let targetId = 0;

    try {
      const created = await client.pqrs.create({
        sessionToken: token,
        sessionId,
        venueId: 30001,
        tableId: 99501,
        type: "complaint",
        subject: "Prueba integrada PQRS",
        message: "La prueba valida el recorrido completo con persistencia real.",
      });
      ticketId = created.ticketId;
      expect(ticketId).toBeGreaterThan(0);

      const [persisted] = await db.select().from(pqrsTickets).where(eq(pqrsTickets.id, ticketId)).limit(1);
      expect(persisted).toMatchObject({ venueId: 30001, sessionId, tableId: 99501, status: "open" });

      const manager = appRouter.createCaller(ctx("manager", 30001, 9026));
      await expect(manager.pqrs.listByVenue({ venueId: 30001, status: "open" })).resolves.toEqual(expect.arrayContaining([
        expect.objectContaining({ id: ticketId }),
      ]));
      const otherManager = appRouter.createCaller(ctx("manager", 30002, 9027));
      await expect(otherManager.pqrs.listByVenue({ venueId: 30001 })).rejects.toThrow("No tienes acceso");

      await manager.pqrs.update({
        venueId: 30001,
        ticketId,
        status: "resolved",
        response: "Respuesta integrada visible para el cliente QR.",
      });
      await expect(client.pqrs.getMyTickets({ sessionToken: token, sessionId, venueId: 30001 })).resolves.toEqual(expect.arrayContaining([
        expect.objectContaining({ id: ticketId, status: "resolved", response: "Respuesta integrada visible para el cliente QR." }),
      ]));

      const owner = appRouter.createCaller(ctx("owner", null, 9028));
      await owner.pqrs.upsertSlaTarget({ venueId: 30001, type: "complaint", targetMinutes: 10080 });
      const [target] = await db.select().from(pqrsSlaTargets).where(eq(pqrsSlaTargets.venueId, 30001)).limit(1);
      targetId = target?.id ?? 0;
      expect(target).toMatchObject({ venueId: 30001, type: "complaint", targetMinutes: 10080 });
      const analytics = await owner.pqrs.ownerAnalytics({ dateFrom: new Date("2020-01-01"), dateTo: new Date("2030-01-01") });
      const venueAnalytics = analytics.venues.find((venue) => venue.venueId === 30001);
      expect(venueAnalytics).toMatchObject({ venueId: 30001 });
      expect(venueAnalytics?.total).toBeGreaterThanOrEqual(1);
      expect(venueAnalytics?.resolved).toBeGreaterThanOrEqual(1);
      expect(venueAnalytics?.resolutionRate).toBeGreaterThan(0);
      expect(venueAnalytics?.slaEvaluated).toBeGreaterThanOrEqual(1);
      expect(venueAnalytics?.slaMet).toBeGreaterThanOrEqual(1);
    } finally {
      if (ticketId) {
        await db.delete(auditLogs).where(eq(auditLogs.entityId, ticketId));
        await db.delete(pqrsTickets).where(eq(pqrsTickets.id, ticketId));
      }
      if (targetId) await db.delete(pqrsSlaTargets).where(eq(pqrsSlaTargets.id, targetId));
      await db.delete(qrSessions).where(eq(qrSessions.id, sessionId));
    }
  });

  it("una sesión QR no permite consultar ni actuar sobre menú o música de otro contexto", async () => {
    const db = await getDb();
    if (!db) return;
    const token = `security-music-session-${Date.now()}-token`;
    const result = await db.insert(qrSessions).values({ venueId: 30001, tableId: 99002, sessionToken: token, clientName: "Cliente musical", isActive: true });
    const sessionId = Number((result[0] as { insertId?: number }).insertId);
    const caller = appRouter.createCaller(ctx("user", null, 9012));

    await expect(caller.menu.getPublicMenu({ venueId: 30001, sessionId, sessionToken: "wrong-security-music-token" })).rejects.toThrow("sesión QR no es válida");
    await expect(caller.music.getClientQueue({ venueId: 30001, sessionId, sessionToken: "wrong-security-music-token" })).rejects.toThrow("sesión QR no es válida");
    await expect(caller.music.requestSong({ venueId: 30001, sessionId, sessionToken: token, songName: "Solicitud cruzada", artist: "Prueba", addedByTableId: 99003 })).rejects.toThrow("no pertenece a esta mesa");
    await expect(caller.music.submitApplause({ venueId: 30001, sessionId, sessionToken: token, songId: 1, votingTableId: 99003, rating: 5 })).rejects.toThrow("no pertenece a esta mesa");

    await db.delete(qrSessions).where(eq(qrSessions.id, sessionId));
  });
});

describe("Flujo de actividades Manager → Staff", () => {
  const VENUE_ID = 30001;
  const MANAGER_ID = 9020;
  const STAFF_ID = 9021;

  it("un Manager puede crear una actividad si el Staff pertenece a su local", async () => {
    const db = await getDb();
    if (!db) return;

    // Preparar Staff de prueba en el local
    await db.insert(users).values({
      openId: `security-staff-${STAFF_ID}`,
      name: "Staff Actividades",
      email: `staff-act-${STAFF_ID}@test.com`,
      loginMethod: "password",
      role: "staff",
      venueId: VENUE_ID,
      lastSignedIn: new Date(),
    }).onDuplicateKeyUpdate({ set: { role: "staff", venueId: VENUE_ID } });

    const [staffUser] = await db.select().from(users).where(eq(users.openId, `security-staff-${STAFF_ID}`)).limit(1);
    if (!staffUser) return;

    const caller = appRouter.createCaller(ctx("manager", VENUE_ID, MANAGER_ID));
    const result = await caller.activities.create({ venueId: VENUE_ID, assignedToUserId: staffUser.id, title: "Verificar inventario" });
    expect(result.success).toBe(true);

    // Limpiar
    await db.delete(staffActivities).where(eq(staffActivities.assignedToUserId, staffUser.id));
    await db.delete(users).where(eq(users.id, staffUser.id));
  });

  it("un Manager no puede asignar actividades a Staff de otra empresa", async () => {
    const db = await getDb();
    if (!db) return;

    // Staff de otra empresa
    await db.insert(users).values({
      openId: `security-staff-other-${STAFF_ID}`,
      name: "Staff Otra Empresa",
      email: `staff-other-${STAFF_ID}@test.com`,
      loginMethod: "password",
      role: "staff",
      venueId: 99999,
      lastSignedIn: new Date(),
    }).onDuplicateKeyUpdate({ set: { role: "staff", venueId: 99999 } });

    const [otherStaff] = await db.select().from(users).where(eq(users.openId, `security-staff-other-${STAFF_ID}`)).limit(1);
    if (!otherStaff) return;

    const caller = appRouter.createCaller(ctx("manager", VENUE_ID, MANAGER_ID));
    await expect(caller.activities.create({ venueId: VENUE_ID, assignedToUserId: otherStaff.id, title: "Actividad cruzada" })).rejects.toThrow();

    await db.delete(users).where(eq(users.id, otherStaff.id));
  });

  it("un Staff puede actualizar su actividad con comentario, imagen o ambas evidencias", async () => {
    const db = await getDb();
    if (!db) return;

    await db.insert(users).values({
      openId: `security-staff-update-${STAFF_ID}`,
      name: "Staff Update",
      email: `staff-update-${STAFF_ID}@test.com`,
      loginMethod: "password",
      role: "staff",
      venueId: VENUE_ID,
      lastSignedIn: new Date(),
    }).onDuplicateKeyUpdate({ set: { role: "staff", venueId: VENUE_ID } });

    const [staffUser] = await db.select().from(users).where(eq(users.openId, `security-staff-update-${STAFF_ID}`)).limit(1);
    if (!staffUser) return;

    await db.insert(staffActivities).values({
      venueId: VENUE_ID,
      assignedToUserId: staffUser.id,
      assignedByUserId: MANAGER_ID,
      title: "Actividad de prueba de actualización",
      status: "pending",
    });

    const [activity] = await db.select().from(staffActivities).where(eq(staffActivities.assignedToUserId, staffUser.id)).limit(1);
    if (!activity) return;

    const staffCaller = appRouter.createCaller(ctx("staff", VENUE_ID, staffUser.id));
    const commentOnly = await staffCaller.activities.updateMyStatus({ activityId: activity.id, status: "in_progress", completionComment: "Inventario revisado sin novedades" });
    expect(commentOnly.success).toBe(true);

    const imageOnly = await staffCaller.activities.updateMyStatus({ activityId: activity.id, status: "completed", evidenceImageUrl: "https://storage.example.com/evidence.jpg" });
    expect(imageOnly.success).toBe(true);

    const combinedEvidence = await staffCaller.activities.updateMyStatus({
      activityId: activity.id,
      status: "completed",
      completionComment: "Inventario cerrado y entregado",
      evidenceImageUrl: "https://storage.example.com/evidence-final.jpg",
    });
    expect(combinedEvidence.success).toBe(true);

    await db.delete(staffActivities).where(eq(staffActivities.id, activity.id));
    await db.delete(users).where(eq(users.id, staffUser.id));
  });
});
