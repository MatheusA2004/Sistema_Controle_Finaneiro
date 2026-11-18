import type { FastifyInstance } from "fastify";
import type { Prisma } from "../../generated/prisma/client.js";
import { currentMonth, formatDate, monthRange, toDate } from "../../shared/dates.js";
import { HttpError } from "../../shared/http-error.js";
import { money, sum } from "../../shared/money.js";
import { idParamsSchema } from "../../shared/schemas.js";
import { assertCategory } from "../categories/categories.service.js";
import {
  createExpenseSchema,
  listExpensesQuerySchema,
  updateExpenseSchema,
} from "./expenses.schemas.js";

const includeCategory = { category: { select: { id: true, name: true } } } as const;

type ExpenseWithCategory = Prisma.ExpenseGetPayload<{ include: typeof includeCategory }>;

function serializeExpense(expense: ExpenseWithCategory) {
  return {
    id: expense.id,
    description: expense.description,
    amount: money(expense.amount),
    kind: expense.kind,
    date: formatDate(expense.date),
    category: expense.category,
    createdAt: expense.createdAt,
    updatedAt: expense.updatedAt,
  };
}

export default async function expensesRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  // GET /expenses?month=2026-11&kind=FIXED&categoryId=...  (sem month = mês atual)
  app.get("/", async (req) => {
    const { month = currentMonth(), kind, categoryId } = listExpensesQuerySchema.parse(req.query);
    const { start, end } = monthRange(month);

    const expenses = await app.prisma.expense.findMany({
      where: { userId: req.user.sub, date: { gte: start, lt: end }, kind, categoryId },
      include: includeCategory,
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    });

    return {
      month,
      total: money(sum(expenses.map((e) => e.amount))),
      items: expenses.map(serializeExpense),
    };
  });

  app.get("/:id", async (req) => {
    const { id } = idParamsSchema.parse(req.params);
    const expense = await app.prisma.expense.findFirst({
      where: { id, userId: req.user.sub },
      include: includeCategory,
    });
    if (!expense) throw new HttpError(404, "Despesa não encontrada");
    return serializeExpense(expense);
  });

  app.post("/", async (req, reply) => {
    const input = createExpenseSchema.parse(req.body);
    const userId = req.user.sub;

    await assertCategory(app, userId, input.categoryId, "EXPENSE");

    const expense = await app.prisma.expense.create({
      data: { ...input, date: toDate(input.date), userId },
      include: includeCategory,
    });

    return reply.code(201).send(serializeExpense(expense));
  });

  app.patch("/:id", async (req) => {
    const { id } = idParamsSchema.parse(req.params);
    const input = updateExpenseSchema.parse(req.body);
    const userId = req.user.sub;

    const existing = await app.prisma.expense.findFirst({ where: { id, userId } });
    if (!existing) throw new HttpError(404, "Despesa não encontrada");

    if (input.categoryId) await assertCategory(app, userId, input.categoryId, "EXPENSE");

    const expense = await app.prisma.expense.update({
      where: { id },
      data: { ...input, date: input.date ? toDate(input.date) : undefined },
      include: includeCategory,
    });

    return serializeExpense(expense);
  });

  app.delete("/:id", async (req, reply) => {
    const { id } = idParamsSchema.parse(req.params);
    const { count } = await app.prisma.expense.deleteMany({ where: { id, userId: req.user.sub } });
    if (count === 0) throw new HttpError(404, "Despesa não encontrada");
    return reply.code(204).send();
  });
}
