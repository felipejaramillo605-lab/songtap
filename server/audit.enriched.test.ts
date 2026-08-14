import { describe, expect, it } from "vitest";
import { createAuditLog, getAuditLogs } from "./db";

describe("auditoría enriquecida", () => {
  it("expone compañía, módulo, ejecutor y marca de tiempo en cada movimiento", async () => {
    const marker = `audit-contract-${Date.now()}`;

    await createAuditLog({
      userId: 1,
      userRole: "owner",
      action: "UPDATE_USER_PROFILE",
      details: marker,
    });

    const logs = await getAuditLogs(undefined, 100);
    const record = logs.find((log) => log.details === marker);

    expect(record).toBeDefined();
    expect(record).toHaveProperty("companyName");
    expect(record).toHaveProperty("executorName");
    expect(record).toHaveProperty("executorEmail");
    expect(record).toHaveProperty("createdAt");
    expect(record?.module).toBe("Equipo y usuarios");
  });
});
