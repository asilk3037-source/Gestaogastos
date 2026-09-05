import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  computeCategoryStatus,
  computeMonthSummary,
  getFixedExpenseStateForMonth,
  getInstallmentStateForMonth,
  previousMonth,
  sumTransactionsForCategory,
} from "@/lib/finance";

export async function getCurrentUser() {
  const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  if (!user) {
    throw new Error(
      "Nenhum usuário encontrado. Rode `npm run db:seed` para criar os dados iniciais."
    );
  }
  return user;
}

/**
 * Retorna a competência (year, month), criando-a sob demanda — a "virada
 * de mês" (spec §12.3): copia despesas fixas/parcelas ainda ativas (elas
 * são calculadas, não copiadas) e os tetos do mês anterior (ou o padrão
 * da categoria), sem nunca copiar lançamentos variáveis.
 */
export async function getOrCreateMonth(userId: string, year: number, month: number) {
  const existing = await prisma.month.findUnique({
    where: { userId_year_month: { userId, year, month } },
    include: { monthlyLimits: true },
  });
  if (existing) return existing;

  const categories = await prisma.category.findMany({ where: { userId, active: true } });
  const prev = previousMonth(year, month);
  const prevMonth = await prisma.month.findUnique({
    where: { userId_year_month: { userId, year: prev.year, month: prev.month } },
    include: { monthlyLimits: true },
  });
  const prevLimitsMap = new Map(
    prevMonth?.monthlyLimits.map((l) => [l.categoryId, l.limitCents]) ?? []
  );

  return prisma.month.create({
    data: {
      userId,
      year,
      month,
      reserveTargetCents: prevMonth?.reserveTargetCents ?? 0,
      monthlyLimits: {
        create: categories.map((c) => ({
          categoryId: c.id,
          limitCents: prevLimitsMap.get(c.id) ?? c.defaultLimitCents,
        })),
      },
    },
    include: { monthlyLimits: true },
  });
}

export interface MonthDashboard {
  month: Awaited<ReturnType<typeof getOrCreateMonth>>;
  categories: {
    id: string;
    name: string;
    icon: string;
    color: string;
    limitCents: number;
    spentCents: number;
    saldoCents: number;
    percentUsed: number;
    alertLevel: ReturnType<typeof computeCategoryStatus>["alertLevel"];
  }[];
  installmentStates: (ReturnType<typeof getInstallmentStateForMonth> & {
    personName: string | null;
    paymentMethodName: string | null;
  })[];
  fixedExpenseStates: (ReturnType<typeof getFixedExpenseStateForMonth> & {
    personName: string | null;
  })[];
  transactions: Prisma.TransactionGetPayload<{ include: { category: true; paymentMethod: true } }>[];
  paymentMethods: Awaited<ReturnType<typeof prisma.paymentMethod.findMany>>;
  summary: ReturnType<typeof computeMonthSummary>;
}

export async function getMonthDashboard(
  userId: string,
  year: number,
  month: number
): Promise<MonthDashboard> {
  const monthRow = await getOrCreateMonth(userId, year, month);

  const [categoriesRaw, installmentsRaw, fixedExpensesRaw, transactions, paymentMethods] =
    await Promise.all([
      prisma.category.findMany({ where: { userId, active: true }, orderBy: { sortOrder: "asc" } }),
      prisma.installment.findMany({ where: { userId, active: true }, include: { paymentMethod: true } }),
      prisma.fixedExpense.findMany({ where: { userId, active: true } }),
      prisma.transaction.findMany({
        where: { monthId: monthRow.id },
        include: { category: true, paymentMethod: true },
        orderBy: { date: "desc" },
      }),
      prisma.paymentMethod.findMany({ where: { userId, active: true } }),
    ]);

  const installmentStates = installmentsRaw
    .map((inst) => {
      const state = getInstallmentStateForMonth(inst, year, month);
      return state
        ? { ...state, personName: inst.personName, paymentMethodName: inst.paymentMethod?.name ?? null }
        : null;
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);

  const fixedExpenseStates = fixedExpensesRaw
    .map((fx) => {
      const state = getFixedExpenseStateForMonth(fx, year, month);
      return state ? { ...state, personName: fx.personName } : null;
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);

  const limitByCategory = new Map(monthRow.monthlyLimits.map((l) => [l.categoryId, l.limitCents]));
  const txPlain = transactions.map((t) => ({
    monthId: t.monthId,
    categoryId: t.categoryId,
    amountCents: t.amountCents,
  }));

  const categories = categoriesRaw.map((c) => {
    const limitCents = limitByCategory.get(c.id) ?? c.defaultLimitCents;
    const spentCents = sumTransactionsForCategory(txPlain, monthRow.id, c.id);
    const status = computeCategoryStatus(limitCents, spentCents);
    return {
      id: c.id,
      name: c.name,
      icon: c.icon,
      color: c.color,
      ...status,
    };
  });

  const installmentsPersonalTotalCents = installmentStates.reduce(
    (sum, s) => sum + s.personalValueCents,
    0
  );
  const fixedExpensesMandatoryPersonalTotalCents = fixedExpenseStates
    .filter((s) => s.mandatory)
    .reduce((sum, s) => sum + s.personalValueCents, 0);
  const categoryLimitTotalCents = categories.reduce((sum, c) => sum + c.limitCents, 0);
  const categorySpentTotalCents = categories.reduce((sum, c) => sum + c.spentCents, 0);

  const summary = computeMonthSummary({
    netIncomeCents: monthRow.netIncomeCents,
    reserveTargetCents: monthRow.reserveTargetCents,
    installmentsPersonalTotalCents,
    fixedExpensesMandatoryPersonalTotalCents,
    categoryLimitTotalCents,
    categorySpentTotalCents,
  });

  return {
    month: monthRow,
    categories,
    installmentStates,
    fixedExpenseStates,
    transactions,
    paymentMethods,
    summary,
  };
}

/**
 * Versão somente-leitura do resumo mensal — usada para históricos/gráficos
 * de meses que talvez ainda não tenham sido "abertos" (nenhum registro é
 * criado). Usa os tetos padrão das categorias quando o mês ainda não existe.
 */
export async function getMonthSummaryLight(userId: string, year: number, month: number) {
  const [existingMonth, categories, installmentsRaw, fixedExpensesRaw] = await Promise.all([
    prisma.month.findUnique({
      where: { userId_year_month: { userId, year, month } },
      include: { monthlyLimits: true },
    }),
    prisma.category.findMany({ where: { userId, active: true } }),
    prisma.installment.findMany({ where: { userId, active: true } }),
    prisma.fixedExpense.findMany({ where: { userId, active: true } }),
  ]);

  const limitByCategory = new Map(
    existingMonth
      ? existingMonth.monthlyLimits.map((l) => [l.categoryId, l.limitCents])
      : categories.map((c) => [c.id, c.defaultLimitCents])
  );

  const transactions = existingMonth
    ? await prisma.transaction.findMany({ where: { monthId: existingMonth.id } })
    : [];
  const txPlain = transactions.map((t) => ({
    monthId: t.monthId,
    categoryId: t.categoryId,
    amountCents: t.amountCents,
  }));

  const categorySpentTotalCents = existingMonth
    ? categories.reduce((sum, c) => sum + sumTransactionsForCategory(txPlain, existingMonth.id, c.id), 0)
    : 0;
  const categoryLimitTotalCents = categories.reduce(
    (sum, c) => sum + (limitByCategory.get(c.id) ?? c.defaultLimitCents),
    0
  );

  const installmentsPersonalTotalCents = installmentsRaw.reduce((sum, inst) => {
    const state = getInstallmentStateForMonth(inst, year, month);
    return sum + (state?.personalValueCents ?? 0);
  }, 0);
  const fixedExpensesMandatoryPersonalTotalCents = fixedExpensesRaw.reduce((sum, fx) => {
    if (!fx.mandatory) return sum;
    const state = getFixedExpenseStateForMonth(fx, year, month);
    return sum + (state?.personalValueCents ?? 0);
  }, 0);

  return computeMonthSummary({
    netIncomeCents: existingMonth?.netIncomeCents ?? null,
    reserveTargetCents: existingMonth?.reserveTargetCents ?? 0,
    installmentsPersonalTotalCents,
    fixedExpensesMandatoryPersonalTotalCents,
    categoryLimitTotalCents,
    categorySpentTotalCents,
  });
}

export async function listCategories(userId: string) {
  return prisma.category.findMany({ where: { userId }, orderBy: { sortOrder: "asc" } });
}

export async function listPaymentMethods(userId: string) {
  return prisma.paymentMethod.findMany({ where: { userId }, orderBy: { createdAt: "asc" } });
}

export async function listInstallments(userId: string) {
  return prisma.installment.findMany({
    where: { userId },
    include: { paymentMethod: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function listFixedExpenses(userId: string) {
  return prisma.fixedExpense.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
}

/** Histórico de meses já criados, mais recente primeiro. */
export async function listMonths(userId: string) {
  return prisma.month.findMany({ where: { userId }, orderBy: [{ year: "desc" }, { month: "desc" }] });
}
