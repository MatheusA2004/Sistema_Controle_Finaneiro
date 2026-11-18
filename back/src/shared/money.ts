import { Prisma } from "../generated/prisma/client.js";

export const Decimal = Prisma.Decimal;
export type Decimal = Prisma.Decimal;

export const ZERO = new Decimal(0);

/** Decimal -> "150.50" (sempre 2 casas, para o front formatar como R$) */
export function money(value: Decimal | null | undefined): string {
  return (value ?? ZERO).toFixed(2);
}

export function sum(values: (Decimal | null | undefined)[]): Decimal {
  return values.reduce<Decimal>((acc, v) => acc.plus(v ?? ZERO), ZERO);
}
