import { z } from "zod";

// "2026-11-15"
export const dateSchema = z.iso.date({ message: "Data inválida, use o formato AAAA-MM-DD" });

// "2026-11"
export const monthSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Mês inválido, use o formato AAAA-MM");

// Valor em reais: positivo, no máximo 2 casas decimais. Vira string ("150.50") para o Prisma
// gravar em Decimal sem erro de arredondamento de float.
export const amountSchema = z.coerce
  .number({ message: "Valor inválido" })
  .positive("O valor precisa ser maior que zero")
  .max(9_999_999_999.99, "Valor muito alto")
  .refine((v) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-6, "Use no máximo 2 casas decimais")
  .transform((v) => v.toFixed(2));

export const idParamsSchema = z.object({ id: z.uuid("ID inválido") });

export const monthQuerySchema = z.object({ month: monthSchema.optional() });
