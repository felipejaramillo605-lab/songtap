import { describe, expect, it } from "vitest";
import { getSlaRisk, getSlaRiskLabel, SLA_SIGNIFICANT_DROP_PP } from "./pqrsSlaRisk";

describe("pqrsSlaRisk", () => {
  it("marca sólo caídas de diez o más puntos porcentuales como significativas", () => {
    expect(SLA_SIGNIFICANT_DROP_PP).toBe(-10);
    expect(getSlaRisk(-9)).toBe("stable_or_improving");
    expect(getSlaRisk(-10)).toBe("significant_drop");
    expect(getSlaRiskLabel(-12)).toBe("Caída significativa");
    expect(getSlaRiskLabel(4)).toBe("Sin caída significativa");
  });
});
