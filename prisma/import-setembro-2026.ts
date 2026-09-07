/**
 * Import idempotente do "Pacote de Atualização e Importação - Setembro/2026"
 * (documento fornecido pela usuária). Aplica UMA vez o modelo de
 * implantação/conciliação de setembro:
 *   - saldo inicial disponível (não é receita — CA-S02);
 *   - empréstimo recebido como entrada de caixa, não como renda (CA-S01/CA-S02);
 *   - dois ajustes pontuais do mês (Empréstimo Amanda, Viagem) — não recorrentes;
 *   - acerto com Isabel no modelo líquido (R$18,11 a pagar), calculado com
 *     precisão total antes de arredondar (ver computePersonSettlement).
 *
 * Reexecutar este script não duplica nada: a idempotência é garantida pelo
 * `importId` único em ImportRecord (CA-S07 / UT-012) — se já foi aplicado,
 * o script só confirma e sai.
 *
 * Uso: npm run db:import-set2026
 */
import { createHash } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { computePersonSettlement, shouldApplyImport } from "../lib/finance";

const prisma = new PrismaClient();

const IMPORT_ID = "setembro-2026-implantacao-v1";

const PAYLOAD = {
  schemaVersion: "1.0",
  competence: "2026-09",
  mode: "implementation_reconciliation",
  openingBalance: { amountCents: 327_689, description: "Posição de caixa disponível para pagar Setembro (pacote de implantação)" },
  loanProceeds: { amountCents: 144_101, description: "Empréstimo recebido para fechamento de Setembro" },
  oneOffAdjustments: [
    { description: "Empréstimo Amanda", amountCents: 15_000 },
    { description: "Viagem", amountCents: 10_000 },
  ],
  isabelSettlement: {
    payableItemsCents: [16_295, 2_500, 52_000], // Shopping + Uber + Cartão
    receivableItems: [
      { amountCents: 10_517, percentage: 0.5 }, // Supermercados BH — parcela 2/2
      { amountCents: 8_073, percentage: 0.5 }, // Cobasi BH Castelo — parcela 3/3
      { amountCents: 13_000, percentage: 0.5 }, // Sonar Gas — combustível
      { amountCents: 70_000, percentage: 0.5 }, // Aluguel de Setembro
      { amountCents: 36_379, percentage: 0.5 }, // Casas Bahia — parcela 7/10
    ],
  },
};

const HASH = createHash("sha256").update(JSON.stringify(PAYLOAD)).digest("hex");

async function main() {
  const user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  if (!user) {
    throw new Error("Nenhum usuário encontrado. Rode `npm run db:seed` primeiro.");
  }

  const applied = await prisma.importRecord.findMany({ where: { userId: user.id }, select: { importId: true } });
  if (!shouldApplyImport(applied.map((a) => a.importId), IMPORT_ID)) {
    const record = await prisma.importRecord.findUnique({ where: { importId: IMPORT_ID } });
    console.log(`Import "${IMPORT_ID}" já aplicado em ${record?.createdAt.toISOString()} — nada a fazer.`);
    return;
  }

  const month = await prisma.month.upsert({
    where: { userId_year_month: { userId: user.id, year: 2026, month: 9 } },
    update: {},
    create: { userId: user.id, year: 2026, month: 9, reserveTargetCents: 0 },
  });

  await prisma.openingBalance.upsert({
    where: { monthId: month.id },
    update: { amountCents: PAYLOAD.openingBalance.amountCents, description: PAYLOAD.openingBalance.description },
    create: {
      userId: user.id,
      monthId: month.id,
      amountCents: PAYLOAD.openingBalance.amountCents,
      description: PAYLOAD.openingBalance.description,
    },
  });

  await prisma.cashEntry.create({
    data: {
      userId: user.id,
      monthId: month.id,
      type: "loan_proceeds",
      amountCents: PAYLOAD.loanProceeds.amountCents,
      countsAsIncome: false,
      description: PAYLOAD.loanProceeds.description,
    },
  });

  await prisma.adjustment.createMany({
    data: PAYLOAD.oneOffAdjustments.map((a) => ({
      userId: user.id,
      monthId: month.id,
      description: a.description,
      amountCents: a.amountCents,
    })),
  });

  const settlement = computePersonSettlement(PAYLOAD.isabelSettlement);
  await prisma.personBalance.create({
    data: {
      userId: user.id,
      monthId: month.id,
      person: "Isabel",
      payableCents: settlement.payableCents,
      receivableCents: settlement.receivableCents,
      netCents: settlement.netCents,
      description:
        "Acerto de Setembro/2026 (modelo líquido) — bruto a pagar R$707,95, a receber R$689,845 (não arredondado).",
      status: "pendente",
    },
  });

  await prisma.importRecord.create({
    data: {
      userId: user.id,
      importId: IMPORT_ID,
      hash: HASH,
      status: "aplicado",
      summary:
        "Pacote de implantação/conciliação de Setembro/2026: saldo inicial R$3.276,89, empréstimo recebido " +
        "R$1.441,01 (não é renda), ajustes Empréstimo Amanda R$150 e Viagem R$100, acerto líquido com Isabel " +
        `R$${(settlement.netCents / 100).toFixed(2).replace(".", ",")} a pagar.`,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "import",
      entityType: "ImportRecord",
      entityId: IMPORT_ID,
      details: `Pacote de atualização Setembro/2026 aplicado (hash ${HASH.slice(0, 12)}...).`,
    },
  });

  console.log("Import de Setembro/2026 aplicado com sucesso.");
  console.log(`  Saldo inicial: R$ ${(PAYLOAD.openingBalance.amountCents / 100).toFixed(2)}`);
  console.log(`  Empréstimo recebido (não é renda): R$ ${(PAYLOAD.loanProceeds.amountCents / 100).toFixed(2)}`);
  console.log(`  Acerto Isabel — líquido: R$ ${(settlement.netCents / 100).toFixed(2)} a pagar`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
