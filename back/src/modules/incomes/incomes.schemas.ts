import { z } from "zod";
import { amountSchema, dateSchema } from "../../shared/schemas.js";

const recurrenceSchema = z.enum(["ONE_TIME", "MONTHLY"], {
  message: "Recorrência deve ser ONE_TIME (avulsa) ou MONTHLY (todo mês)",
});

const incomeFields = z.object({
  description: z.string().trim().min(1, "Informe a descrição").max(120),
  amount: amountSchema,
  recurrence: recurrenceSchema,
  // Avulsa: dia em que entrou. Recorrente: a partir de quando vale.
  date: dateSchema,
  // Recorrente: dia do mês em que cai (se omitido, usa o dia de `date`)
  recurringDay: z.int().min(1).max(31).nullable().optional(),
  // Recorrente: até quando vale (null = sem fim). Use para "encerrar" uma receita recorrente.
  endDate: dateSchema.nullable().optional(),
  categoryId: z.uuid("Categoria inválida").nullable().optional(),
});

export const createIncomeSchema = incomeFields.extend({
  recurrence: recurrenceSchema.default("ONE_TIME"),
});

export const updateIncomeSchema = incomeFields.partial();
