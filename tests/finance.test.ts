/**
 * Testes dos critérios de aceite CA-01 a CA-08 (especificação, seção 15),
 * validados diretamente contra as funções puras de lib/finance.ts.
 */
import { describe, expect, it } from "vitest";
import {
  applyLimitUpdate,
  buildDefaultLimitsForNewMonth,
  computeCashAvailable,
  computeCategoryStatus,
  computeMonthSummary,
  computePersonSettlement,
  getFixedExpenseStateForMonth,
  getInstallmentStateForMonth,
  nextMonth,
  shouldApplyImport,
  sumAdjustments,
  sumSharedAmountsCents,
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

// ---------------------------------------------------------------------------
// Pacote de Atualização e Importação — Setembro/2026
// (Documento "Line Finance - Pacote de Atualização e Importação v1.0")
// ---------------------------------------------------------------------------

describe("UT-001 — cálculo percentual compartilhado", () => {
  it("363,79 × 50% = 181,895 → exibição R$ 181,90", () => {
    expect(sumSharedAmountsCents([{ amountCents: 36_379, percentage: 0.5 }])).toBe(18_190);
  });
});

describe("UT-002 — progressão de parcela (Casas Bahia)", () => {
  const casasBahia = {
    id: "cb",
    description: "Casas Bahia",
    installmentAmountCents: 36_379,
    totalInstallments: 10,
    firstYear: 2026,
    firstMonth: 3,
    personalPercentage: 0.5,
    active: true,
  };
  it.each([
    [2026, 9, 7],
    [2026, 10, 8],
    [2026, 11, 9],
    [2026, 12, 10],
  ])("%i/%i → parcela %i/10", (year, month, expected) => {
    expect(getInstallmentStateForMonth(casasBahia, year, month)?.currentInstallment).toBe(expected);
  });

  it("inexistente em janeiro/2027", () => {
    expect(getInstallmentStateForMonth(casasBahia, 2027, 1)).toBeNull();
  });
});

describe("UT-003 — empréstimo recebido não é renda", () => {
  it("loan_proceeds afeta caixa disponível, mas não passa por computeMonthSummary", () => {
    const caixa = computeCashAvailable({ openingBalanceCents: 0, cashEntriesTotalCents: 144_101 });
    expect(caixa).toBe(144_101);
    // computeMonthSummary nem recebe cash entries como parâmetro — não há
    // como uma entrada de caixa vazar para dentro da renda/sobra.
    const summary = computeMonthSummary({
      netIncomeCents: null,
      reserveTargetCents: 0,
      installmentsPersonalTotalCents: 0,
      fixedExpensesMandatoryPersonalTotalCents: 0,
      categoryLimitTotalCents: 0,
      categorySpentTotalCents: 0,
    });
    expect(summary.gastoTotalMes).toBe(0);
  });
});

describe("UT-004 — saldo inicial não é receita", () => {
  it("opening_balance de R$3.276,89 não altera a renda do mês", () => {
    const caixa = computeCashAvailable({ openingBalanceCents: 327_689, cashEntriesTotalCents: 0 });
    expect(caixa).toBe(327_689);
  });
});

describe("UT-005 e UT-011 — acerto Isabel / arredondamento só na exibição", () => {
  it("707,95 a pagar − 689,845 a receber (não arredondado) → líquido R$ 18,11", () => {
    const result = computePersonSettlement({
      payableItemsCents: [16_295, 2_500, 52_000], // Shopping + Uber + Cartão
      receivableItems: [
        { amountCents: 10_517, percentage: 0.5 }, // Supermercados BH
        { amountCents: 8_073, percentage: 0.5 }, // Cobasi BH Castelo
        { amountCents: 13_000, percentage: 0.5 }, // Sonar Gas
        { amountCents: 70_000, percentage: 0.5 }, // Aluguel de Setembro
        { amountCents: 36_379, percentage: 0.5 }, // Casas Bahia 7/10
      ],
    });
    expect(result.payableCents).toBe(70_795);
    expect(result.receivableCents).toBe(68_985); // 689,845 arredondado só para exibição
    expect(result.netCents).toBe(1_811); // 707,95 − 689,845 = 18,105 → 18,11 (não 707,95 − 689,85 = 18,10)
  });
});

describe("UT-006 e UT-007 — teto de categoria (Transporte, teto R$150)", () => {
  it("R$120 → 80%, status atenção", () => {
    const status = computeCategoryStatus(15_000, 12_000);
    expect(status.percentUsed).toBeCloseTo(80);
    expect(status.alertLevel).toBe("atencao");
  });

  it("R$160 → 106,67%, excedente de R$10, status excedido", () => {
    const status = computeCategoryStatus(15_000, 16_000);
    expect(status.percentUsed).toBeCloseTo(106.67, 1);
    expect(status.saldoCents).toBe(-1_000);
    expect(status.alertLevel).toBe("excedido");
  });
});

describe("UT-008 — fim do empréstimo (4 parcelas, Out/26–Jan/27)", () => {
  const emprestimo = {
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
  it("4/4 em janeiro/2027, zero a partir de fevereiro/2027", () => {
    expect(getFixedExpenseStateForMonth(emprestimo, 2027, 1)?.monthsElapsed).toBe(4);
    expect(getFixedExpenseStateForMonth(emprestimo, 2027, 1)?.isLast).toBe(true);
    expect(getFixedExpenseStateForMonth(emprestimo, 2027, 2)).toBeNull();
  });
});

describe("UT-012 — idempotência de importação", () => {
  it("mesmo importId já aplicado não deve ser reaplicado", () => {
    const applied = ["setembro-2026-implantacao-v1"];
    expect(shouldApplyImport(applied, "setembro-2026-implantacao-v1")).toBe(false);
    expect(shouldApplyImport(applied, "outubro-2026-outra-coisa")).toBe(true);
  });
});

describe("Ajustes pontuais de implantação (Setembro/2026)", () => {
  it("Empréstimo Amanda + Viagem somam R$250 e entram no total comprometido só do mês", () => {
    expect(sumAdjustments([{ amountCents: 15_000 }, { amountCents: 10_000 }])).toBe(25_000);

    const summary = computeMonthSummary({
      netIncomeCents: null,
      reserveTargetCents: 0,
      installmentsPersonalTotalCents: 136_948,
      fixedExpensesMandatoryPersonalTotalCents: 0,
      categoryLimitTotalCents: 0,
      categorySpentTotalCents: 0,
      adjustmentsTotalCents: 25_000,
    });
    expect(summary.totalComprometido).toBe(161_948);
  });
});

describe("CA-S05 — Outubro/2026 permanece correto após o pacote de Setembro", () => {
  it("aluguel pessoal R$350 + empréstimo 1/4 R$386,74 + parcelamentos R$1.369,48 = R$2.106,22", () => {
    const summary = computeMonthSummary({
      netIncomeCents: null,
      reserveTargetCents: 0,
      installmentsPersonalTotalCents: 136_948,
      fixedExpensesMandatoryPersonalTotalCents: 35_000 + 38_674,
      categoryLimitTotalCents: 0,
      categorySpentTotalCents: 0,
      // Setembro é implantação: nenhum ajuste/entrada de caixa daquele mês
      // se propaga para Outubro (adjustmentsTotalCents nem é informado aqui).
    });
    expect(summary.totalComprometido).toBe(210_622);
  });
});
