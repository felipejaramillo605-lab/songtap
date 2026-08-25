import { TRPCError } from "@trpc/server";

export const INVENTORY_DIMENSIONS = ["count", "volume", "mass"] as const;
export type InventoryDimension = (typeof INVENTORY_DIMENSIONS)[number];

export const INVENTORY_UNITS = ["unit", "box", "ml", "liter", "fl_oz", "g", "kg", "oz"] as const;
export type InventoryUnit = (typeof INVENTORY_UNITS)[number];

export const UNIT_LABELS: Record<InventoryUnit, string> = {
  unit: "unidades",
  box: "cajas",
  ml: "mililitros",
  liter: "litros",
  fl_oz: "onzas líquidas",
  g: "gramos",
  kg: "kilogramos",
  oz: "onzas",
};

export function getBaseUnit(dimension: InventoryDimension) {
  if (dimension === "count") return "unit" as const;
  if (dimension === "volume") return "ml" as const;
  return "g" as const;
}

function invalidUnit(message: string): never {
  throw new TRPCError({ code: "BAD_REQUEST", message });
}

/** Convierte una captura de compra o fórmula a la unidad base de su insumo. */
export function toBaseQuantity(input: {
  dimension: InventoryDimension;
  quantity: number;
  unit: InventoryUnit;
  packBaseQuantity?: number | null;
}) {
  if (!Number.isFinite(input.quantity) || input.quantity === 0) {
    invalidUnit("La cantidad debe ser un número distinto de cero.");
  }
  if (input.unit === "box") {
    if (!Number.isFinite(input.packBaseQuantity) || (input.packBaseQuantity ?? 0) <= 0) {
      invalidUnit("Indica el contenido real de cada caja en la unidad base del insumo.");
    }
    return roundBase(input.quantity * Number(input.packBaseQuantity));
  }

  const validUnits: Record<InventoryDimension, InventoryUnit[]> = {
    count: ["unit"],
    volume: ["ml", "liter", "fl_oz"],
    mass: ["g", "kg", "oz"],
  };
  if (!validUnits[input.dimension].includes(input.unit)) {
    invalidUnit("La unidad no es compatible con la dimensión del insumo.");
  }

  const factors: Partial<Record<InventoryUnit, number>> = {
    unit: 1,
    ml: 1,
    liter: 1000,
    fl_oz: 29.5735,
    g: 1,
    kg: 1000,
    oz: 28.3495,
  };
  return roundBase(input.quantity * Number(factors[input.unit]));
}

export function roundBase(value: number) {
  return Math.round((value + Number.EPSILON) * 10_000) / 10_000;
}

export function formatBaseQuantity(value: number, unit: "unit" | "ml" | "g") {
  return `${new Intl.NumberFormat("es-CO", { maximumFractionDigits: 4 }).format(value)} ${UNIT_LABELS[unit]}`;
}
