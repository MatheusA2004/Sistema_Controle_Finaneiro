import { z } from "zod";

export const categoryTypeSchema = z.enum(["INCOME", "EXPENSE"], {
  message: "Tipo deve ser INCOME (receita) ou EXPENSE (despesa)",
});

export const createCategorySchema = z.object({
  name: z.string().trim().min(1, "Informe o nome").max(50),
  type: categoryTypeSchema,
});

// O tipo não muda depois de criada (evita despesas apontando para categoria de receita)
export const updateCategorySchema = z.object({
  name: z.string().trim().min(1, "Informe o nome").max(50),
});

export const listCategoriesQuerySchema = z.object({
  type: categoryTypeSchema.optional(),
});
