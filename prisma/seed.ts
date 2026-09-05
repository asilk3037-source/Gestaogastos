/**
 * Seed inicial — dados reais de outubro a dezembro/2026, extraídos da
 * especificação funcional e da planilha "Sistema_Financeiro_Aline".
 *
 * Nenhuma renda mensal é semeada (spec §18: "a renda mensal permanece
 * propositalmente sem valor porque não está definida na planilha").
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORIES = [
  { name: "Transporte (Uber/99)", icon: "car", color: "#6366f1", limit: 15000 },
  { name: "Alimentação / delivery", icon: "utensils", color: "#f59e0b", limit: 15000 },
  { name: "Assinaturas", icon: "credit-card", color: "#3b82f6", limit: 10000 },
  { name: "Lazer", icon: "gamepad", color: "#f43f5e", limit: 10000 },
  { name: "Pet", icon: "paw", color: "#10b981", limit: 5000 },
  { name: "Outros / compras pessoais", icon: "shopping-bag", color: "#38bdf8", limit: 5000 },
];

// description, installmentAmountCents (valor cheio da parcela), totalInstallments,
// firstYear, firstMonth, personalPercentage, personName, cardKey
const INSTALLMENTS: {
  description: string;
  amountCents: number;
  total: number;
  firstYear: number;
  firstMonth: number;
  personalPercentage: number;
  personName?: string;
  card: "0283" | "3764";
}[] = [
  { description: "Mp *Alinedepaulam", amountCents: 14811, total: 4, firstYear: 2026, firstMonth: 7, personalPercentage: 1, card: "0283" },
  { description: "Mp *Alinedepaulam", amountCents: 12500, total: 4, firstYear: 2026, firstMonth: 8, personalPercentage: 1, card: "0283" },
  { description: "Mp *Alinedepaulam", amountCents: 23666, total: 3, firstYear: 2026, firstMonth: 8, personalPercentage: 1, card: "0283" },
  { description: "Caedu", amountCents: 11666, total: 3, firstYear: 2026, firstMonth: 9, personalPercentage: 1, card: "0283" },
  { description: "Mp *Alinedepaulam", amountCents: 9320, total: 2, firstYear: 2026, firstMonth: 9, personalPercentage: 1, card: "0283" },
  { description: "Mp *Veloxingressos", amountCents: 5833, total: 2, firstYear: 2026, firstMonth: 9, personalPercentage: 1, card: "0283" },
  { description: "Mp *Alinedepaulam", amountCents: 30151, total: 2, firstYear: 2026, firstMonth: 9, personalPercentage: 1, card: "0283" },
  { description: "Ifd*Renata Campos Linh", amountCents: 5836, total: 4, firstYear: 2026, firstMonth: 9, personalPercentage: 1, card: "0283" },
  { description: "Ifd*58.410.712 Clayton", amountCents: 4975, total: 4, firstYear: 2026, firstMonth: 9, personalPercentage: 1, card: "0283" },
  { description: "Casas Bahia", amountCents: 36379, total: 10, firstYear: 2026, firstMonth: 3, personalPercentage: 0.5, personName: "Isabel", card: "3764" },
];

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "alinesiilk@gmail.com" },
    update: {},
    create: {
      name: "Line",
      email: "alinesiilk@gmail.com",
      currency: "BRL",
    },
  });

  // Formas de pagamento
  const cartao0283 = await prisma.paymentMethod.upsert({
    where: { id: `${user.id}-0283` },
    update: {},
    create: {
      id: `${user.id}-0283`,
      userId: user.id,
      name: "Cartão final 0283",
      type: "credito",
      cardLast4: "0283",
      isPrimary: true,
    },
  });
  const cartao3764 = await prisma.paymentMethod.upsert({
    where: { id: `${user.id}-3764` },
    update: {},
    create: {
      id: `${user.id}-3764`,
      userId: user.id,
      name: "Cartão final 3764",
      type: "credito",
      cardLast4: "3764",
    },
  });
  await prisma.paymentMethod.upsert({
    where: { id: `${user.id}-pix` },
    update: {},
    create: { id: `${user.id}-pix`, userId: user.id, name: "Pix", type: "pix" },
  });
  await prisma.paymentMethod.upsert({
    where: { id: `${user.id}-debito` },
    update: {},
    create: { id: `${user.id}-debito`, userId: user.id, name: "Débito", type: "debito" },
  });
  await prisma.paymentMethod.upsert({
    where: { id: `${user.id}-dinheiro` },
    update: {},
    create: { id: `${user.id}-dinheiro`, userId: user.id, name: "Dinheiro", type: "dinheiro" },
  });

  // Categorias
  const categoryByName = new Map<string, string>();
  for (let i = 0; i < CATEGORIES.length; i++) {
    const c = CATEGORIES[i];
    const cat = await prisma.category.upsert({
      where: { userId_name: { userId: user.id, name: c.name } },
      update: {},
      create: {
        userId: user.id,
        name: c.name,
        icon: c.icon,
        color: c.color,
        defaultLimitCents: c.limit,
        sortOrder: i,
      },
    });
    categoryByName.set(c.name, cat.id);
  }

  // Parcelamentos (compras parceladas reais, viram entidades — o sistema
  // calcula X/Y e projeta os meses seguintes automaticamente)
  for (const inst of INSTALLMENTS) {
    const cardId = inst.card === "0283" ? cartao0283.id : cartao3764.id;
    const existing = await prisma.installment.findFirst({
      where: {
        userId: user.id,
        description: inst.description,
        installmentAmountCents: inst.amountCents,
        firstYear: inst.firstYear,
        firstMonth: inst.firstMonth,
      },
    });
    if (!existing) {
      await prisma.installment.create({
        data: {
          userId: user.id,
          description: inst.description,
          installmentAmountCents: inst.amountCents,
          totalInstallments: inst.total,
          firstYear: inst.firstYear,
          firstMonth: inst.firstMonth,
          personalPercentage: inst.personalPercentage,
          personName: inst.personName,
          paymentMethodId: cardId,
        },
      });
    }
  }

  // Despesas fixas: aluguel (compartilhado 50%, indefinido) e empréstimo
  // (integral, 4 competências a partir de outubro/2026)
  const aluguelExists = await prisma.fixedExpense.findFirst({
    where: { userId: user.id, name: "Aluguel" },
  });
  if (!aluguelExists) {
    await prisma.fixedExpense.create({
      data: {
        userId: user.id,
        name: "Aluguel",
        amountCents: 70000,
        startYear: 2026,
        startMonth: 10,
        durationMonths: null,
        personalPercentage: 0.5,
        mandatory: true,
      },
    });
  }
  const emprestimoExists = await prisma.fixedExpense.findFirst({
    where: { userId: user.id, name: "Empréstimo" },
  });
  if (!emprestimoExists) {
    await prisma.fixedExpense.create({
      data: {
        userId: user.id,
        name: "Empréstimo",
        amountCents: 38674,
        startYear: 2026,
        startMonth: 10,
        durationMonths: 4,
        personalPercentage: 1,
        mandatory: true,
      },
    });
  }

  // Competências iniciais: outubro, novembro e dezembro/2026. Renda não é
  // semeada — deve ser informada pela usuária (spec §18).
  const months = [
    { year: 2026, month: 10 },
    { year: 2026, month: 11 },
    { year: 2026, month: 12 },
  ];
  for (const m of months) {
    const month = await prisma.month.upsert({
      where: { userId_year_month: { userId: user.id, year: m.year, month: m.month } },
      update: {},
      create: {
        userId: user.id,
        year: m.year,
        month: m.month,
        reserveTargetCents: 0,
      },
    });
    for (const c of CATEGORIES) {
      const categoryId = categoryByName.get(c.name)!;
      await prisma.monthlyLimit.upsert({
        where: { monthId_categoryId: { monthId: month.id, categoryId } },
        update: {},
        create: { monthId: month.id, categoryId, limitCents: c.limit },
      });
    }
  }

  console.log("Seed concluído para usuário:", user.name);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
