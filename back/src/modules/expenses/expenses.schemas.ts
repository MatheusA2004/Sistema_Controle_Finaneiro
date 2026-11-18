import { z } from "zod";
import { amountSchema, dateSchema, monthSchema } from "../../shared/schemas.js";

const kindSchema = z.enum(["FIXED", "VARIABLE"], {
  message: "Tipo deve ser FIXED (fixa) ou VARIABLE (variável)",
});

export const createExpenseSchema = z.object({
  description: z.string().trim().min(1, "Informe a descrição").max(120),
  amount: amountSchema,
  kind: kindSchema,
  date: dateSchema,
  categoryId: z.uuid("Categoria inválida"),
});

export const updateExpenseSchema = createExpenseSchema.partial();

export const listExpensesQuerySchema = z.object({
  month: monthSchema.optional(),
  kind: kindSchema.optional(),
  categoryId: z.uuid("Categoria inválida").optional(),
});
