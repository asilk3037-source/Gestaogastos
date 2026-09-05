/**
 * Testes dos critérios de aceite CA-01 a CA-08 (especificação, seção 15),
 * validados diretamente contra as funções puras de lib/finance.ts.
 */
import { describe, expect, it } from "vitest";
import {
  applyLimitUpdate,
  buildDefaultLimitsForNewMonth,
  computeCategoryStatus,
  computeMonthSummary,
  getFixedExpenseStateForMonth,
  getInstallmentStateForMonth,
  nextMonth,
  sumTransactionsForCategory,
} from "@/lib/finance";

describe("CA-01 — sobra prevista com renda informada", () => {
  it("renda R$3.000 e planejado R$2.706,22 → sobra prevista R$293,78", () => {
    const summary = computeMonthSummary({
      netIncomeCents: 300_000,
      reserveTargetCents: 0,
      installmentsPersonalTotalCents: 136_948, // outubro/2026
      fixedExpensesMandatoryPersonalTotalCents: 35_000 + 38_674, // aluguel + empréstimo
      categoryLimitTotalCents: 60_000,
      categorySpentTotalCents: 0,
    });
    expect(summary.planejadoTotal).toBe(270_622);
    expect(summary.sobraPrevista).toBe(29_378);
  });
});

describe("CA-02 e CA-03 — alertas de teto por categoria", () => {
  it("R$120 em Transporte (teto R$150) → 80% usado, alerta de atenção", () => {
    const status = computeCategoryStatus(15_000, 12_000);
    expect(status.percentUsed).toBeCloseTo(80);
    expect(status.alertLevel).toBe("atencao");
  });

  it("mais R$40 no mesmo mês → R$160 gastos, -R$10 disponíveis, teto excedido", () => {
    const status = computeCategoryStatus(15_000, 16_000);
    expect(status.saldoCents).toBe(-1_000);
    expect(status.alertLevel).toBe("excedido");
  });
});

describe("CA-04 — despesa compartilhada (Casas Bahia)", () => {
  it("parcela R$363,79 com 50% pessoal → impacto de ~R$181,90", () => {
    const state = getInstallmentStateForMonth(
      {
        id: "cb",
        description: "Casas Bahia",
        installmentAmountCents: 36_379,
        totalInstallments: 10,
        firstYear: 2026,
        firstMonth: 3,
        personalPercentage: 0.5,
        active: true,
      },
      2026,
      10
    );
    expect(state).not.toBeNull();
    expect(state!.currentInstallment).toBe(8);
    expect(state!.personalValueCents).toBe(18_190);
  });
});

describe("CA-05 — parcela final não é projetada no mês seguinte", () => {
  const installment = {
    id: "x",
    description: "Mp *Alinedepaulam",
    installmentAmountCents: 14_811,
    totalInstallments: 4,
    firstYear: 2026,
    firstMonth: 7,
    personalPercentage: 1,
    active: true,
  };

  it("4/4 aparece como última em outubro/2026", () => {
    const state = getInstallmentStateForMonth(installment, 2026, 10);
    expect(state?.currentInstallment).toBe(4);
    expect(state?.status).toBe("ultima");
  });

  it("não aparece em novembro/2026 (encerrado)", () => {
    const state = getInstallmentStateForMonth(installment, 2026, 11);
    expect(state).toBeNull();
  });
});

describe("CA-06 — lançamento de um mês não altera outro", () => {
  it("gasto de novembro não entra na soma de outubro", () => {
    const transactions = [
      { monthId: "out-2026", categoryId: "transporte", amountCents: 5_000 },
      { monthId: "nov-2026", categoryId: "transporte", amountCents: 9_000 },
    ];
    expect(sumTransactionsForCategory(transactions, "out-2026", "transporte")).toBe(5_000);
    expect(sumTransactionsForCategory(transactions, "nov-2026", "transporte")).toBe(9_000);
  });
});

describe("CA-07 — alterar teto de um mês não afeta mês fechado", () => {
  it("atualizar teto de novembro mantém o teto de outubro intocado", () => {
    const limits = [
      { monthId: "out-2026", categoryId: "transporte", limitCents: 15_000 },
      { monthId: "nov-2026", categoryId: "transporte", limitCents: 15_000 },
    ];
    const updated = applyLimitUpdate(limits, "nov-2026", "transporte", 20_000);
    const outubro = updated.find((l) => l.monthId === "out-2026")!;
    const novembro = updated.find((l) => l.monthId === "nov-2026")!;
    expect(outubro.limitCents).toBe(15_000);
    expect(novembro.limitCents).toBe(20_000);
  });
});

describe("CA-08 — sistema cria meses além da planilha-base", () => {
  it("dezembro/2026 → janeiro/2027", () => {
    expect(nextMonth(2026, 12)).toEqual({ year: 2027, month: 1 });
  });

  it("janeiro/2027 recebe tetos padrão das categorias, sem dados fixos de 2026", () => {
    const categories = [
      { id: "transporte", defaultLimitCents: 15_000 },
      { id: "pet", defaultLimitCents: 5_000 },
    ];
    const limits = buildDefaultLimitsForNewMonth("jan-2027", categories);
    expect(limits).toEqual([
      { monthId: "jan-2027", categoryId: "transporte", limitCents: 15_000 },
      { monthId: "jan-2027", categoryId: "pet", limitCents: 5_000 },
    ]);
  });

  it("nenhum parcelamento de 2026 permanece ativo em janeiro/2027 sem novas compras", () => {
    const installment = {
      id: "cb",
      description: "Casas Bahia",
      installmentAmountCents: 36_379,
      totalInstallments: 10,
      firstYear: 2026,
      firstMonth: 3,
      personalPercentage: 0.5,
      active: true,
    };
    expect(getInstallmentStateForMonth(installment, 2027, 1)).toBeNull();
  });
});

describe("Despesas fixas por competência", () => {
  it("empréstimo de 4 meses encerra após a 4ª parcela", () => {
    const fx = {
      id: "emp",
      name: "Empréstimo",
      amountCents: 38_674,
      startYear: 2026,
      startMonth: 10,
      durationMonths: 4,
      endYear: null,
      endMonth: null,
      personalPercentage: 1,
      mandatory: true,
      active: true,
    };
    expect(getFixedExpenseStateForMonth(fx, 2026, 10)?.monthsElapsed).toBe(1);
    expect(getFixedExpenseStateForMonth(fx, 2027, 1)?.isLast).toBe(true);
    expect(getFixedExpenseStateForMonth(fx, 2027, 2)).toBeNull();
  });

  it("aluguel compartilhado 50% de R$700 → R$350 pessoal, recorrência indefinida", () => {
    const fx = {
      id: "alug",
      name: "Aluguel",
      amountCents: 70_000,
      startYear: 2026,
      startMonth: 10,
      durationMonths: null,
      endYear: null,
      endMonth: null,
      personalPercentage: 0.5,
      mandatory: true,
      active: true,
    };
    expect(getFixedExpenseStateForMonth(fx, 2026, 10)?.personalValueCents).toBe(35_000);
    expect(getFixedExpenseStateForMonth(fx, 2030, 5)?.personalValueCents).toBe(35_000);
  });
});
