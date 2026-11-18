// Datas "puras" (sem hora) são tratadas sempre em UTC para não mudarem de dia por causa do fuso.

/** "2026-11-15" -> Date em 2026-11-15T00:00:00Z */
export function toDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

/** Date -> "2026-11-15" */
export function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Mês atual no formato "2026-11" */
export function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

/** "2026-11" -> { start: 1º dia do mês, end: 1º dia do mês seguinte } (end é exclusivo) */
export function monthRange(month: string) {
  const [year, m] = month.split("-").map(Number);
  const start = new Date(Date.UTC(year, m - 1, 1));
  const end = new Date(Date.UTC(year, m, 1));
  return { start, end };
}

/** Data do dia `day` dentro do mês; se o mês não tiver esse dia (ex.: 31 em fevereiro), usa o último. */
export function dayInMonth(month: string, day: number): Date {
  const [year, m] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, m, 0)).getUTCDate();
  return new Date(Date.UTC(year, m - 1, Math.min(day, lastDay)));
}
