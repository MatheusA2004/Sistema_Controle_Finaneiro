import type { FastifyInstance } from "fastify";
import { currentMonth, monthRange } from "../../shared/dates.js";
import { money, sum, ZERO } from "../../shared/money.js";
import { monthQuerySchema } from "../../shared/schemas.js";
import { findIncomesForMonth } from "../incomes/incomes.service.js";

export default async function summaryRoutes(app: FastifyInstance) {
  app.addHook("onRequest", app.authenticate);

  // GET /summary?month=2026-11 — totais do mês para o dashboard
  app.get("/", async (req) => {
    const { month = currentMonth() } = monthQuerySchema.parse(req.query);
    const userId = req.user.sub;
    const { start, end } = monthRange(month);
    const expenseWhere = { userId, date: { gte: start, lt: end } };

    const [incomes, byCategory, byKind] = await Promise.all([
      findIncomesForMonth(app, userId, month),
      app.prisma.expense.groupBy({
        by: ["categoryId"],
        where: expenseWhere,
        _sum: { amount: true },
      }),
      app.prisma.expense.groupBy({
        by: ["kind"],
        where: expenseWhere,
        _sum: { amount: true },
      }),
    ]);

    const categories = await app.prisma.category.findMany({
      where: { id: { in: byCategory.map((c) => c.categoryId) } },
      select: { id: true, name: true },
    });
    const categoryName = new Map(categories.map((c) => [c.id, c.name]));

    const incomeTotal = sum(incomes.map((r) => r.income.amount));
    const recurringIncome = sum(
      incomes.filter((r) => r.income.recurrence === "MONTHLY").map((r) => r.income.amount),
    );
    const expenseTotal = sum(byKind.map((k) => k._sum.amount));
    const kindTotal = (kind: "FIXED" | "VARIABLE") =>
      byKind.find((k) => k.kind === kind)?._sum.amount ?? ZERO;

    return {
      month,
      balance: money(incomeTotal.minus(expenseTotal)),
      income: {
        total: money(incomeTotal),
        recurring: money(recurringIncome),
        oneTime: money(incomeTotal.minus(recurringIncome)),
      },
      expense: {
        total: money(expenseTotal),
        fixed: money(kindTotal("FIXED")),
        variable: money(kindTotal("VARIABLE")),
        byCategory: byCategory
          .map((c) => {
            const total = c._sum.amount ?? ZERO;
            return {
              categoryId: c.categoryId,
              name: categoryName.get(c.categoryId) ?? "—",
              total: money(total),
              percent: expenseTotal.isZero()
                ? 0
                : Number(total.div(expenseTotal).times(100).toFixed(1)),
            };
          })
          .sort((a, b) => Number(b.total) - Number(a.total)),
      },
    };
  });
}
