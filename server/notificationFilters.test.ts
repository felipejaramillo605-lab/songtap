import { describe, expect, it } from "vitest";
import { filterNotificationHistory } from "../client/src/lib/notificationFilters";

const alerts = [
  {
    title: "Nueva Solicitud de Local: Bar La Noche",
    content: "Solicitud creada por Manager Camila para revisión.",
    createdAt: new Date("2026-08-10T15:00:00"),
  },
  {
    title: "Nueva Solicitud de Local: Karaoke Central",
    content: "Solicitud creada por Manager Andrés para revisión.",
    createdAt: new Date("2026-08-14T10:30:00"),
  },
];

describe("filterNotificationHistory", () => {
  it("encuentra alertas por texto dentro del título y contenido", () => {
    expect(filterNotificationHistory(alerts, { query: "camila" })).toEqual([alerts[0]]);
    expect(filterNotificationHistory(alerts, { query: "karaoke" })).toEqual([alerts[1]]);
  });

  it("aplica rangos de fecha inclusivos y permite limpiar los filtros", () => {
    expect(filterNotificationHistory(alerts, { startDate: "2026-08-14", endDate: "2026-08-14" })).toEqual([alerts[1]]);
    expect(filterNotificationHistory(alerts, {})).toEqual(alerts);
  });
});
