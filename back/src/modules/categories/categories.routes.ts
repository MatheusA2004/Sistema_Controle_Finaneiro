import type { FastifyInstance } from "fastify";
import { idParamsSchema } from "../../shared/schemas.js";
import { HttpError } from "../../shared/http-error.js";
import {
  createCategorySchema,
  listCategoriesQuerySchema,
  updateCategorySchema,
} from "./categories.schemas.js";

export default async function categoriesRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  // GET /categories?type=EXPENSE
  app.get("/", async (req) => {
    const { type } = listCategoriesQuerySchema.parse(req.query);
    return app.prisma.category.findMany({
      where: { userId: req.user.sub, type },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    });
  });

  app.post("/", async (req, reply) => {
    const data = createCategorySchema.parse(req.body);
    const category = await app.prisma.category.create({
      data: { ...data, userId: req.user.sub },
    });
    return reply.code(201).send(category);
  });

  app.patch("/:id", async (req) => {
    const { id } = idParamsSchema.parse(req.params);
    const data = updateCategorySchema.parse(req.body);

    const existing = await app.prisma.category.findFirst({ where: { id, userId: req.user.sub } });
    if (!existing) throw new HttpError(404, "Categoria não encontrada");

    return app.prisma.category.update({ where: { id }, data });
  });

  app.delete("/:id", async (req, reply) => {
    const { id } = idParamsSchema.parse(req.params);

    const existing = await app.prisma.category.findFirst({
      where: { id, userId: req.user.sub },
      include: { _count: { select: { expenses: true } } },
    });
    if (!existing) throw new HttpError(404, "Categoria não encontrada");

    // Receitas ficam sem categoria (SetNull); despesas exigem categoria, então bloqueamos
    if (existing._count.expenses > 0) {
      throw new HttpError(
        409,
        `Essa categoria tem ${existing._count.expenses} despesa(s). Mova-as para outra categoria antes de excluir.`,
      );
    }

    await app.prisma.category.delete({ where: { id } });
    return reply.code(204).send();
  });
}
