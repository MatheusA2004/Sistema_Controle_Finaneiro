import type { FastifyInstance } from "fastify";
import type { CategoryType } from "../../generated/prisma/client.js";
import { HttpError } from "../../shared/http-error.js";

// Criadas automaticamente para cada usuário novo (no cadastro)
export const DEFAULT_CATEGORIES: { name: string; type: CategoryType }[] = [
  { name: "Salário", type: "INCOME" },
  { name: "Transferência", type: "INCOME" },
  { name: "Outras receitas", type: "INCOME" },
  { name: "Alimentação", type: "EXPENSE" },
  { name: "Conta da casa", type: "EXPENSE" },
  { name: "Lazer", type: "EXPENSE" },
  { name: "Transporte", type: "EXPENSE" },
  { name: "Saúde", type: "EXPENSE" },
  { name: "Outras despesas", type: "EXPENSE" },
];

/** Garante que a categoria existe, é do usuário e é do tipo certo (receita/despesa). */
export async function assertCategory(
  app: FastifyInstance,
  userId: string,
  categoryId: string,
  type: CategoryType,
) {
  const category = await app.prisma.category.findFirst({ where: { id: categoryId, userId } });
  if (!category) throw new HttpError(400, "Categoria não encontrada");
  if (category.type !== type) {
    throw new HttpError(
      400,
      type === "EXPENSE"
        ? "Essa categoria é de receita, escolha uma categoria de despesa"
        : "Essa categoria é de despesa, escolha uma categoria de receita",
    );
  }
  return category;
}
