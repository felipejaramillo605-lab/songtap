import { describe, expect, it } from "vitest";
import { buildKaraokeMetricsFilename, createKaraokeMetricsCsv } from "./karaokeMetricsExport";

describe("karaokeMetricsExport", () => {
  const metrics = {
    totals: { totalLinks: 4, workingLinks: 3, unverifiedLinks: 0, needsReviewLinks: 1, workingRate: 75 },
    venues: [{ venueId: 7, venueName: "Bar, Central", totalLinks: 4, workingLinks: 3, unverifiedLinks: 0, needsReviewLinks: 1, workingRate: 75 }],
  };

  it("genera filas por local y un total con nombres CSV seguros", () => {
    const csv = createKaraokeMetricsCsv(metrics);
    expect(csv).toContain("Local,Enlaces guardados,Funcionales,Sin verificar,Requieren revisión,Proporción funcional (%)");
    expect(csv).toContain('"Bar, Central",4,3,0,1,75');
    expect(csv).toContain("Total,4,3,0,1,75");
  });

  it("nombra la exportación con la fecha seleccionada", () => {
    expect(buildKaraokeMetricsFilename(new Date("2030-08-31T12:00:00.000Z"))).toBe("songtap-salud-karaoke-2030-08-31.csv");
  });
});
