/**
 * Núcleo de regras de negócio do sistema — funções puras, sem I/O.
 * Implementa a seção 8 (Fórmulas e regras de cálculo) e a seção 9
 * (Alertas) da especificação. Mantido isolado de Prisma/Next para ser
 * fácil de testar unitariamente contra os critérios de aceite (seção 15).
 *
 * Valores monetários trafegam sempre em centavos (inteiros).
 */

export type AlertLevel = "normal" | "atencao" | "atingido" | "excedido";

export function monthIndex(year: number, month: number): number {
  return year * 12 + (month - 1);
}

export function nextMonth(year: number, month: number): { year: number; month: number } {
  const idx = monthIndex(year, month) + 1;
  return { year: Math.floor(idx / 12), month: (idx % 12) + 1 };
}

export function previousMonth(year: number, month: number): { year: number; month: number } {
  const idx = monthIndex(year, month) - 1;
  return { year: Math.floor(idx / 12), month: (idx % 12) + 1 };
}

export function monthLabel(year: number, month: number): string {
  const names = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];
  return `${names[month - 1]} de ${year}`;
}

// ---------------------------------------------------------------------------
// Parcelamentos
// ---------------------------------------------------------------------------

export interface InstallmentInput {
  id: string;
  description: string;
  installmentAmountCents: number;
  totalInstallments: number;
  firstYear: number;
  firstMonth: number;
  personalPercentage: number;
  active: boolean;
}

export type InstallmentStatus = "ativo" | "ultima" | "encerrado";

export interface InstallmentState {
  id: string;
  description: string;
  currentInstallment: number;
  totalInstallments: number;
  fullValueCents: number;
  personalValueCents: number;
  status: InstallmentStatus;
}

/**
 * Calcula X/Y de um parcelamento para uma competência (year, month).
 * Retorna null quando o parcelamento ainda não começou ou já foi
 * encerrado (após a última parcela) — nesse caso ele simplesmente não
 * aparece no planejamento do mês, conforme regra da seção 9.
 */
export function getInstallmentStateForMonth(
  inst: InstallmentInput,
  year: number,
  month: number
): InstallmentState | null {
  if (!inst.active) return null;
  const current = monthIndex(year, month) - monthIndex(inst.firstYear, inst.firstMonth) + 1;
  if (current < 1 || current > inst.totalInstallments) return null;
  const personalValueCents = Math.round(inst.installmentAmountCents * inst.personalPercentage);
  return {
    id: inst.id,
    description: inst.description,
    currentInstallment: current,
    totalInstallments: inst.totalInstallments,
    fullValueCents: inst.installmentAmountCents,
    personalValueCents,
    status: current === inst.totalInstallments ? "ultima" : "ativo",
  };
}

// ---------------------------------------------------------------------------
// Despesas fixas / recorrentes
// ---------------------------------------------------------------------------

export interface FixedExpenseInput {
  id: string;
  name: string;
  amountCents: number;
  startYear: number;
  startMonth: number;
  durationMonths: number | null;
  endYear: number | null;
  endMonth: number | null;
  personalPercentage: number;
  mandatory: boolean;
  active: boolean;
}

export interface FixedExpenseState {
  id: string;
  name: string;
  fullValueCents: number;
  personalValueCents: number;
  monthsElapsed: number;
  totalMonths: number | null;
  mandatory: boolean;
  isLast: boolean;
}

export function getFixedExpenseStateForMonth(
  fx: FixedExpenseInput,
  year: number,
  month: number
): FixedExpenseState | null {
  if (!fx.active) return null;
  const startIdx = monthIndex(fx.startYear, fx.startMonth);
  const curIdx = monthIndex(year, month);
  if (curIdx < startIdx) return null;
  if (fx.durationMonths != null && curIdx >= startIdx + fx.durationMonths) return null;
  if (fx.endYear != null && fx.endMonth != null && curIdx > monthIndex(fx.endYear, fx.endMonth)) {
    return null;
  }
  const monthsElapsed = curIdx - startIdx + 1;
  const personalValueCents = Math.round(fx.amountCents * fx.personalPercentage);
  return {
    id: fx.id,
    name: fx.name,
    fullValueCents: fx.amountCents,
    personalValueCents,
    monthsElapsed,
    totalMonths: fx.durationMonths,
    mandatory: fx.mandatory,
    isLast: fx.durationMonths != null && monthsElapsed === fx.durationMonths,
  };
}

// ---------------------------------------------------------------------------
// Categorias / tetos
// ---------------------------------------------------------------------------

export interface CategoryStatus {
  limitCents: number;
  spentCents: number;
  saldoCents: number;
  percentUsed: number;
  alertLevel: AlertLevel;
}

export function computeCategoryStatus(limitCents: number, spentCents: number): CategoryStatus {
  const saldoCents = limitCents - spentCents;
  const percentUsed = limitCents > 0 ? (spentCents / limitCents) * 100 : spentCents > 0 ? 100 : 0;
  let alertLevel: AlertLevel = "normal";
  if (percentUsed >= 100) {
    alertLevel = spentCents > limitCents ? "excedido" : "atingido";
  } else if (percentUsed >= 80) {
    alertLevel = "atencao";
  }
  return { limitCents, spentCents, saldoCents, percentUsed, alertLevel };
}

/** Soma lançamentos de uma categoria dentro de UMA competência específica. */
export function sumTransactionsForCategory<
  T extends { monthId: string; categoryId: string; amountCents: number }
>(transactions: T[], monthId: string, categoryId: string): number {
  return transactions
    .filter((t) => t.monthId === monthId && t.categoryId === categoryId)
    .reduce((sum, t) => sum + t.amountCents, 0);
}

// ---------------------------------------------------------------------------
// Resumo mensal (dashboard / planejamento)
// ---------------------------------------------------------------------------

export interface MonthSummaryInput {
  netIncomeCents: number | null;
  reserveTargetCents: number;
  installmentsPersonalTotalCents: number;
  fixedExpensesMandatoryPersonalTotalCents: number;
  categoryLimitTotalCents: number;
  categorySpentTotalCents: number;
}

export interface MonthSummary {
  totalComprometido: number;
  tetoTotal: number;
  planejadoTotal: number;
  gastoRealTotal: number;
  gastoTotalMes: number;
  sobraPrevista: number | null;
  sobraReal: number | null;
  percentualRendaComprometida: number | null;
}

export function computeMonthSummary(input: MonthSummaryInput): MonthSummary {
  const totalComprometido =
    input.installmentsPersonalTotalCents + input.fixedExpensesMandatoryPersonalTotalCents;
  const tetoTotal = input.categoryLimitTotalCents;
  const planejadoTotal = totalComprometido + tetoTotal + input.reserveTargetCents;
  const gastoRealTotal = input.categorySpentTotalCents;
  const gastoTotalMes = totalComprometido + gastoRealTotal;

  const sobraPrevista = input.netIncomeCents != null ? input.netIncomeCents - planejadoTotal : null;
  // Sobra real: renda líquida − gastos reais (variáveis) − compromissos − reserva.
  // Assume compromissos e reserva como já cumpridos no mês corrente (MVP).
  const sobraReal =
    input.netIncomeCents != null
      ? input.netIncomeCents - gastoRealTotal - totalComprometido - input.reserveTargetCents
      : null;
  const percentualRendaComprometida =
    input.netIncomeCents != null && input.netIncomeCents > 0
      ? (totalComprometido / input.netIncomeCents) * 100
      : null;

  return {
    totalComprometido,
    tetoTotal,
    planejadoTotal,
    gastoRealTotal,
    gastoTotalMes,
    sobraPrevista,
    sobraReal,
    percentualRendaComprometida,
  };
}

// ---------------------------------------------------------------------------
// Virada de mês / tetos por competência (atualização imutável)
// ---------------------------------------------------------------------------

export interface MonthlyLimitRecord {
  monthId: string;
  categoryId: string;
  limitCents: number;
}

/**
 * Atualiza o teto de UMA categoria em UMA competência sem tocar nas
 * demais linhas (nenhuma outra competência é afetada) — garante o
 * critério "alterar o teto de novembro não deve alterar outubro".
 */
export function applyLimitUpdate(
  limits: MonthlyLimitRecord[],
  monthId: string,
  categoryId: string,
  newLimitCents: number
): MonthlyLimitRecord[] {
  return limits.map((l) =>
    l.monthId === monthId && l.categoryId === categoryId ? { ...l, limitCents: newLimitCents } : l
  );
}

/**
 * Gera os tetos padrão de uma nova competência a partir das categorias
 * cadastradas (ou dos tetos do mês anterior, se informados) — usado na
 * virada de mês / abertura de qualquer mês futuro, sem depender de
 * dados fixos de outubro–dezembro/2026.
 */
export function buildDefaultLimitsForNewMonth(
  monthId: string,
  categories: { id: string; defaultLimitCents: number }[],
  previousLimits?: Map<string, number>
): MonthlyLimitRecord[] {
  return categories.map((c) => ({
    monthId,
    categoryId: c.id,
    limitCents: previousLimits?.get(c.id) ?? c.defaultLimitCents,
  }));
}

export function alertMessage(level: AlertLevel, categoryName: string): string | null {
  switch (level) {
    case "atencao":
      return `Atenção: ${categoryName} já usou 80% do teto do mês.`;
    case "atingido":
      return `${categoryName} atingiu 100% do teto do mês.`;
    case "excedido":
      return `${categoryName} ultrapassou o teto do mês.`;
    default:
      return null;
  }
}
