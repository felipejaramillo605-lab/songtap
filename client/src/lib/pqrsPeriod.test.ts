import { describe, expect, it } from "vitest";
import { getPreviousPqrsPeriod } from "./pqrsPeriod";

describe("getPreviousPqrsPeriod", () => {
  it("calcula un periodo anterior contiguo con la misma duración inclusiva", () => {
    const result = getPreviousPqrsPeriod(new Date("2026-08-10T00:00:00.000"), new Date("2026-08-16T23:59:59.999"));
    expect(result.dateFrom.toISOString()).toBe("2026-08-03T00:00:00.000Z");
    expect(result.dateTo.toISOString()).toBe("2026-08-09T23:59:59.999Z");
  });
});
