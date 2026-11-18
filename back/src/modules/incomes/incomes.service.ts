import type { FastifyInstance } from "fastify";
import type { IncomeRecurrence } from "../../generated/prisma/client.js";
import { dayInMonth, formatDate, monthRange } from "../../shared/dates.js";
import { HttpError } from "../../shared/http-error.js";
import { money } from "../../shared/money.js";

const includeCategory = { category: { select: { id: true, name: true } } } as const;

/**
 * Receitas que caem no mês:
 * - avulsas com data dentro do mês;
 * - recorrentes que já começaram e ainda não terminaram, no dia `recurringDay` do mês.
 */
export async function findIncomesForMonth(app: FastifyInstance, userId: string, month: string) {
  const { start, end } = monthRange(month);

  const incomes = await app.prisma.income.findMany({
    where: {
      userId,
      OR: [
        { recurrence: "ONE_TIME", date: { gte: start, lt: end } },
        {
          recurrence: "MONTHLY",
          date: { lt: end },
          OR: [{ endDate: null }, { endDate: { gte: start } }],
        },
      ],
    },
    include: includeCategory,
  });

  return incomes
    .flatMap((income) => {
      let occurrence = income.date;
      if (income.recurrence === "MONTHLY") {
        occurrence = dayInMonth(month, income.recurringDay ?? income.date.getUTCDate());
        // no mês de início/fim, o dia pode cair antes do início ou depois do fim
        if (occurrence < income.date) return [];
        if (income.endDate && occurrence > income.endDate) return [];
      }
      return [{ income, occurrence }];
    })
    .sort((a, b) => a.occurrence.getTime() - b.occurrence.getTime());
}

type IncomeWithCategory = Awaited<ReturnType<typeof findIncomesForMonth>>[number]["income"];

export function serializeIncome(income: IncomeWithCategory, occurrence?: Date) {
  return {
    id: income.id,
    description: income.description,
    amount: money(income.amount),
    recurrence: income.recurrence,
    date: formatDate(income.date),
    recurringDay: income.recurringDay,
    endDate: income.endDate ? formatDate(income.endDate) : null,
    category: income.category,
    // dia em que essa receita cai no mês consultado (só aparece na listagem por mês)
    ...(occurrence && { occurrenceDate: formatDate(occurrence) }),
    createdAt: income.createdAt,
    updatedAt: income.updatedAt,
  };
}

/** Ajusta os campos de recorrência: avulsa não tem dia fixo nem fim; recorrente sempre tem dia. */
export function normalizeRecurrence(input: {
  recurrence: IncomeRecurrence;
  date: Date;
  recurringDay: number | null;
  endDate: Date | null;
}) {
  if (input.recurrence === "ONE_TIME") {
    return { recurrence: input.recurrence, date: input.date, recurringDay: null, endDate: null };
  }
  if (input.endDate && input.endDate < input.date) {
    throw new HttpError(400, "A data de término não pode ser antes da data de início");
  }
  return {
    recurrence: input.recurrence,
    date: input.date,
    recurringDay: input.recurringDay ?? input.date.getUTCDate(),
    endDate: input.endDate,
  };
}

export { includeCategory };
