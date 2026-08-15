export const SLA_SIGNIFICANT_DROP_PP = -10;

export type SlaRisk = "significant_drop" | "stable_or_improving";

export function getSlaRisk(changeInPercentagePoints: number): SlaRisk {
  return changeInPercentagePoints <= SLA_SIGNIFICANT_DROP_PP ? "significant_drop" : "stable_or_improving";
}

export function getSlaRiskLabel(changeInPercentagePoints: number) {
  return getSlaRisk(changeInPercentagePoints) === "significant_drop" ? "Caída significativa" : "Sin caída significativa";
}
