import type { FastifyInstance } from "fastify";
import { currentMonth, toDate } from "../../shared/dates.js";
import { HttpError } from "../../shared/http-error.js";
import { money, sum } from "../../shared/money.js";
import { idParamsSchema, monthQuerySchema } from "../../shared/schemas.js";
import { assertCategory } from "../categories/categories.service.js";
import { createIncomeSchema, updateIncomeSchema } from "./incomes.schemas.js";
import {
  findIncomesForMonth,
  includeCategory,
  normalizeRecurrence,
  serializeIncome,
} from "./incomes.service.js";

export default async function incomesRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  // GET /incomes?month=2026-11  (sem month = mês atual)
  app.get("/", async (req) => {
    const { month = currentMonth() } = monthQuerySchema.parse(req.query);
    const rows = await findIncomesForMonth(app, req.user.sub, month);

    return {
      month,
      total: money(sum(rows.map((r) => r.income.amount))),
      items: rows.map((r) => serializeIncome(r.income, r.occurrence)),
    };
  });

  app.get("/:id", async (req) => {
    const { id } = idParamsSchema.parse(req.params);
    const income = await app.prisma.income.findFirst({
      where: { id, userId: req.user.sub },
      include: includeCategory,
    });
    if (!income) throw new HttpError(404, "Receita não encontrada");
    return serializeIncome(income);
  });

  app.post("/", async (req, reply) => {
    const input = createIncomeSchema.parse(req.body);
    const userId = req.user.sub;

    if (input.categoryId) await assertCategory(app, userId, input.categoryId, "INCOME");

    const income = await app.prisma.income.create({
      data: {
        userId,
        description: input.description,
        amount: input.amount,
        categoryId: input.categoryId ?? null,
        ...normalizeRecurrence({
          recurrence: input.recurrence,
          date: toDate(input.date),
          recurringDay: input.recurringDay ?? null,
          endDate: input.endDate ? toDate(input.endDate) : null,
        }),
      },
      include: includeCategory,
    });

    return reply.code(201).send(serializeIncome(income));
  });

  app.patch("/:id", async (req) => {
    const { id } = idParamsSchema.parse(req.params);
    const input = updateIncomeSchema.parse(req.body);
    const userId = req.user.sub;

    const existing = await app.prisma.income.findFirst({ where: { id, userId } });
    if (!existing) throw new HttpError(404, "Receita não encontrada");

    if (input.categoryId) await assertCategory(app, userId, input.categoryId, "INCOME");

    // junta o que veio com o que já estava salvo antes de validar a recorrência
    const recurrence = normalizeRecurrence({
      recurrence: input.recurrence ?? existing.recurrence,
      date: input.date ? toDate(input.date) : existing.date,
      recurringDay: input.recurringDay !== undefined ? input.recurringDay : existing.recurringDay,
      endDate:
        input.endDate !== undefined
          ? input.endDate
            ? toDate(input.endDate)
            : null
          : existing.endDate,
    });

    const income = await app.prisma.income.update({
      where: { id },
      data: {
        description: input.description,
        amount: input.amount,
        categoryId: input.categoryId,
        ...recurrence,
      },
      include: includeCategory,
    });

    return serializeIncome(income);
  });

  // Atenção: apagar uma receita recorrente remove ela de TODOS os meses.
  // Para parar de receber a partir de agora, use PATCH com { "endDate": "AAAA-MM-DD" }.
  app.delete("/:id", async (req, reply) => {
    const { id } = idParamsSchema.parse(req.params);
    const { count } = await app.prisma.income.deleteMany({ where: { id, userId: req.user.sub } });
    if (count === 0) throw new HttpError(404, "Receita não encontrada");
    return reply.code(204).send();
  });
}
