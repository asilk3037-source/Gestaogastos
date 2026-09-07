"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { brlToCents } from "@/lib/format";
import { computePersonSettlement } from "@/lib/finance";
import { getCurrentUser, getOrCreateMonth } from "@/lib/queries";

function monthPath(base: string, year: number, month: number) {
  return `${base}?y=${year}&m=${month}`;
}

/** Trilha de auditoria (spec seção 15) — importação, exclusão e
 * fechamento/reabertura de competência. Nunca lança: um problema no log
 * não pode derrubar a operação principal. */
async function logAudit(
  userId: string,
  action: string,
  entityType: string,
  entityId?: string | null,
  details?: string
) {
  try {
    await prisma.auditLog.create({
      data: { userId, action, entityType, entityId: entityId ?? null, details },
    });
  } catch {
    // auditoria é best-effort — não deve impedir a operação principal.
  }
}

// ---------------------------------------------------------------------------
// Planejamento mensal (renda, meta de reserva, tetos por categoria)
// ---------------------------------------------------------------------------

export async function updateMonthSettings(formData: FormData) {
  const monthId = String(formData.get("monthId"));
  const year = Number(formData.get("year"));
  const month = Number(formData.get("month"));
  const incomeRaw = String(formData.get("netIncome") ?? "").trim();
  const reserveRaw = String(formData.get("reserveTarget") ?? "0").trim();

  await prisma.month.update({
    where: { id: monthId },
    data: {
      netIncomeCents: incomeRaw === "" ? null : brlToCents(incomeRaw),
      reserveTargetCents: reserveRaw === "" ? 0 : brlToCents(reserveRaw),
    },
  });

  revalidatePath("/");
  revalidatePath("/planejamento");
  redirect(monthPath("/planejamento", year, month));
}

export async function updateCategoryLimit(formData: FormData) {
  const monthId = String(formData.get("monthId"));
  const categoryId = String(formData.get("categoryId"));
  const year = Number(formData.get("year"));
  const month = Number(formData.get("month"));
  const limitCents = brlToCents(String(formData.get("limitCents") ?? "0"));

  await prisma.monthlyLimit.upsert({
    where: { monthId_categoryId: { monthId, categoryId } },
    update: { limitCents },
    create: { monthId, categoryId, limitCents },
  });

  revalidatePath("/");
  revalidatePath("/planejamento");
  redirect(monthPath("/planejamento", year, month));
}

export async function closeMonth(formData: FormData) {
  const user = await getCurrentUser();
  const monthId = String(formData.get("monthId"));
  const year = Number(formData.get("year"));
  const month = Number(formData.get("month"));
  await prisma.month.update({ where: { id: monthId }, data: { status: "closed", closedAt: new Date() } });
  await logAudit(user.id, "close_month", "Month", monthId, `${year}-${month}`);
  revalidatePath("/planejamento");
  redirect(monthPath("/planejamento", year, month));
}

export async function reopenMonth(formData: FormData) {
  const user = await getCurrentUser();
  const monthId = String(formData.get("monthId"));
  const year = Number(formData.get("year"));
  const month = Number(formData.get("month"));
  await prisma.month.update({ where: { id: monthId }, data: { status: "open", closedAt: null } });
  await logAudit(user.id, "reopen_month", "Month", monthId, `${year}-${month}`);
  revalidatePath("/planejamento");
  redirect(monthPath("/planejamento", year, month));
}

// ---------------------------------------------------------------------------
// Lançamentos
// ---------------------------------------------------------------------------

export async function createTransaction(formData: FormData) {
  const user = await getCurrentUser();
  const dateStr = String(formData.get("date"));
  const date = new Date(dateStr + "T12:00:00");
  const description = String(formData.get("description") ?? "").trim();
  const categoryId = String(formData.get("categoryId"));
  const amountCents = brlToCents(String(formData.get("amount") ?? "0"));
  const paymentMethodId = String(formData.get("paymentMethodId") ?? "") || null;
  const necessaryRaw = formData.get("necessary");
  const necessary = necessaryRaw === "sim" ? true : necessaryRaw === "nao" ? false : null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!description || amountCents <= 0 || !categoryId) {
    throw new Error("Descrição, categoria e valor (maior que zero) são obrigatórios.");
  }

  const month = await getOrCreateMonth(user.id, date.getFullYear(), date.getMonth() + 1);

  await prisma.transaction.create({
    data: {
      monthId: month.id,
      date,
      description,
      categoryId,
      amountCents,
      paymentMethodId,
      necessary,
      notes,
    },
  });

  revalidatePath("/");
  revalidatePath("/lancamentos");
  redirect(monthPath("/lancamentos", month.year, month.month));
}

export async function deleteTransaction(formData: FormData) {
  const user = await getCurrentUser();
  const id = String(formData.get("id"));
  const year = Number(formData.get("year"));
  const month = Number(formData.get("month"));
  await prisma.transaction.delete({ where: { id } });
  await logAudit(user.id, "delete", "Transaction", id);
  revalidatePath("/");
  revalidatePath("/lancamentos");
  redirect(monthPath("/lancamentos", year, month));
}

// ---------------------------------------------------------------------------
// Parcelamentos
// ---------------------------------------------------------------------------

export async function createInstallment(formData: FormData) {
  const user = await getCurrentUser();
  const description = String(formData.get("description") ?? "").trim();
  const installmentAmountCents = brlToCents(String(formData.get("amount") ?? "0"));
  const totalInstallments = Number(formData.get("totalInstallments"));
  const firstYear = Number(formData.get("firstYear"));
  const firstMonth = Number(formData.get("firstMonth"));
  const personalPercentage = Number(formData.get("personalPercentage") ?? 100) / 100;
  const personName = String(formData.get("personName") ?? "").trim() || null;
  const paymentMethodId = String(formData.get("paymentMethodId") ?? "") || null;

  if (!description || installmentAmountCents <= 0 || totalInstallments < 1) {
    throw new Error("Descrição, valor da parcela e número de parcelas são obrigatórios.");
  }

  await prisma.installment.create({
    data: {
      userId: user.id,
      description,
      installmentAmountCents,
      totalInstallments,
      firstYear,
      firstMonth,
      personalPercentage,
      personName,
      paymentMethodId,
    },
  });

  revalidatePath("/parcelamentos");
  revalidatePath("/");
  redirect("/parcelamentos");
}

export async function deactivateInstallment(formData: FormData) {
  const id = String(formData.get("id"));
  await prisma.installment.update({ where: { id }, data: { active: false } });
  revalidatePath("/parcelamentos");
  revalidatePath("/");
  redirect("/parcelamentos");
}

// ---------------------------------------------------------------------------
// Despesas fixas
// ---------------------------------------------------------------------------

export async function createFixedExpense(formData: FormData) {
  const user = await getCurrentUser();
  const name = String(formData.get("name") ?? "").trim();
  const amountCents = brlToCents(String(formData.get("amount") ?? "0"));
  const startYear = Number(formData.get("startYear"));
  const startMonth = Number(formData.get("startMonth"));
  const durationRaw = String(formData.get("durationMonths") ?? "").trim();
  const durationMonths = durationRaw === "" ? null : Number(durationRaw);
  const personalPercentage = Number(formData.get("personalPercentage") ?? 100) / 100;
  const personName = String(formData.get("personName") ?? "").trim() || null;
  const mandatory = formData.get("mandatory") === "on";

  if (!name || amountCents <= 0) {
    throw new Error("Nome e valor são obrigatórios.");
  }

  await prisma.fixedExpense.create({
    data: {
      userId: user.id,
      name,
      amountCents,
      startYear,
      startMonth,
      durationMonths,
      personalPercentage,
      personName,
      mandatory,
    },
  });

  revalidatePath("/despesas-fixas");
  revalidatePath("/");
  redirect("/despesas-fixas");
}

export async function deactivateFixedExpense(formData: FormData) {
  const id = String(formData.get("id"));
  await prisma.fixedExpense.update({ where: { id }, data: { active: false } });
  revalidatePath("/despesas-fixas");
  revalidatePath("/");
  redirect("/despesas-fixas");
}

// ---------------------------------------------------------------------------
// Categorias
// ---------------------------------------------------------------------------

export async function createCategory(formData: FormData) {
  const user = await getCurrentUser();
  const name = String(formData.get("name") ?? "").trim();
  const icon = String(formData.get("icon") ?? "tag");
  const color = String(formData.get("color") ?? "#0a84ff");
  const defaultLimitCents = brlToCents(String(formData.get("defaultLimit") ?? "0"));

  if (!name) throw new Error("Nome da categoria é obrigatório.");

  const count = await prisma.category.count({ where: { userId: user.id } });
  await prisma.category.create({
    data: { userId: user.id, name, icon, color, defaultLimitCents, sortOrder: count },
  });

  revalidatePath("/categorias");
  redirect("/categorias");
}

export async function deactivateCategory(formData: FormData) {
  const id = String(formData.get("id"));
  await prisma.category.update({ where: { id }, data: { active: false } });
  revalidatePath("/categorias");
  redirect("/categorias");
}

// ---------------------------------------------------------------------------
// Formas de pagamento / contas
// ---------------------------------------------------------------------------

export async function createPaymentMethod(formData: FormData) {
  const user = await getCurrentUser();
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "outro");
  const cardLast4 = String(formData.get("cardLast4") ?? "").trim() || null;

  if (!name) throw new Error("Nome da conta/cartão é obrigatório.");

  await prisma.paymentMethod.create({
    data: { userId: user.id, name, type, cardLast4 },
  });

  revalidatePath("/contas");
  redirect("/contas");
}

export async function deactivatePaymentMethod(formData: FormData) {
  const id = String(formData.get("id"));
  await prisma.paymentMethod.update({ where: { id }, data: { active: false } });
  revalidatePath("/contas");
  redirect("/contas");
}

// ---------------------------------------------------------------------------
// Perfil
// ---------------------------------------------------------------------------

export async function updateProfile(formData: FormData) {
  const user = await getCurrentUser();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Nome é obrigatório.");
  await prisma.user.update({ where: { id: user.id }, data: { name } });
  revalidatePath("/perfil");
  revalidatePath("/");
  redirect("/perfil");
}

// ---------------------------------------------------------------------------
// Caixa: saldo inicial, entradas de caixa e ajustes pontuais
// (Pacote de atualização Setembro/2026)
// ---------------------------------------------------------------------------

export async function upsertOpeningBalance(formData: FormData) {
  const user = await getCurrentUser();
  const monthId = String(formData.get("monthId"));
  const year = Number(formData.get("year"));
  const month = Number(formData.get("month"));
  const amountCents = brlToCents(String(formData.get("amount") ?? "0"));
  const description = String(formData.get("description") ?? "").trim() || null;

  await prisma.openingBalance.upsert({
    where: { monthId },
    update: { amountCents, description },
    create: { userId: user.id, monthId, amountCents, description },
  });

  revalidatePath("/");
  revalidatePath("/caixa");
  redirect(monthPath("/caixa", year, month));
}

export async function deleteOpeningBalance(formData: FormData) {
  const id = String(formData.get("id"));
  const year = Number(formData.get("year"));
  const month = Number(formData.get("month"));
  await prisma.openingBalance.delete({ where: { id } });
  revalidatePath("/");
  revalidatePath("/caixa");
  redirect(monthPath("/caixa", year, month));
}

const CASH_ENTRY_TYPES = ["salary", "reimbursement", "loan_proceeds", "transfer", "other"] as const;

export async function createCashEntry(formData: FormData) {
  const user = await getCurrentUser();
  const monthId = String(formData.get("monthId"));
  const year = Number(formData.get("year"));
  const month = Number(formData.get("month"));
  const type = String(formData.get("type") ?? "other");
  const amountCents = brlToCents(String(formData.get("amount") ?? "0"));
  const description = String(formData.get("description") ?? "").trim() || null;
  // Por padrão nenhuma entrada de caixa conta como renda — quem decide o
  // contrário é a usuária, marcando a caixa explicitamente (ex.: salário).
  const countsAsIncome = formData.get("countsAsIncome") === "on";

  if (amountCents <= 0 || !CASH_ENTRY_TYPES.includes(type as (typeof CASH_ENTRY_TYPES)[number])) {
    throw new Error("Tipo e valor (maior que zero) são obrigatórios.");
  }

  await prisma.cashEntry.create({
    data: { userId: user.id, monthId, type, amountCents, countsAsIncome, description },
  });

  revalidatePath("/");
  revalidatePath("/caixa");
  redirect(monthPath("/caixa", year, month));
}

export async function deleteCashEntry(formData: FormData) {
  const user = await getCurrentUser();
  const id = String(formData.get("id"));
  const year = Number(formData.get("year"));
  const month = Number(formData.get("month"));
  await prisma.cashEntry.delete({ where: { id } });
  await logAudit(user.id, "delete", "CashEntry", id);
  revalidatePath("/");
  revalidatePath("/caixa");
  redirect(monthPath("/caixa", year, month));
}

export async function createAdjustment(formData: FormData) {
  const user = await getCurrentUser();
  const monthId = String(formData.get("monthId"));
  const year = Number(formData.get("year"));
  const month = Number(formData.get("month"));
  const description = String(formData.get("description") ?? "").trim();
  const amountCents = brlToCents(String(formData.get("amount") ?? "0"));

  if (!description || amountCents <= 0) {
    throw new Error("Descrição e valor (maior que zero) são obrigatórios.");
  }

  await prisma.adjustment.create({
    data: { userId: user.id, monthId, description, amountCents },
  });

  revalidatePath("/");
  revalidatePath("/caixa");
  redirect(monthPath("/caixa", year, month));
}

export async function deleteAdjustment(formData: FormData) {
  const user = await getCurrentUser();
  const id = String(formData.get("id"));
  const year = Number(formData.get("year"));
  const month = Number(formData.get("month"));
  await prisma.adjustment.delete({ where: { id } });
  await logAudit(user.id, "delete", "Adjustment", id);
  revalidatePath("/");
  revalidatePath("/caixa");
  redirect(monthPath("/caixa", year, month));
}

// ---------------------------------------------------------------------------
// Acertos entre pessoas (ex.: reembolsos de despesas compartilhadas)
// ---------------------------------------------------------------------------

export async function createPersonBalance(formData: FormData) {
  const user = await getCurrentUser();
  const monthId = String(formData.get("monthId"));
  const year = Number(formData.get("year"));
  const month = Number(formData.get("month"));
  const person = String(formData.get("person") ?? "").trim();
  const payableCents = brlToCents(String(formData.get("payable") ?? "0"));
  const receivableCents = brlToCents(String(formData.get("receivable") ?? "0"));
  const description = String(formData.get("description") ?? "").trim() || null;

  if (!person) throw new Error("Nome da pessoa é obrigatório.");

  // payable/receivable aqui já chegam prontos em reais (ex.: 707,95 e
  // 689,85) — quando a origem tiver componentes percentuais fracionados
  // (meio-centavo), use computePersonSettlement (lib/finance.ts) antes de
  // preencher o formulário, como faz o import de Setembro/2026.
  const { netCents } = computePersonSettlement({
    payableItemsCents: [payableCents],
    receivableItems: [{ amountCents: receivableCents, percentage: 1 }],
  });

  await prisma.personBalance.create({
    data: { userId: user.id, monthId, person, payableCents, receivableCents, netCents, description },
  });

  revalidatePath("/");
  revalidatePath("/acertos");
  redirect(monthPath("/acertos", year, month));
}

export async function markPersonBalancePaid(formData: FormData) {
  const id = String(formData.get("id"));
  const year = Number(formData.get("year"));
  const month = Number(formData.get("month"));
  await prisma.personBalance.update({ where: { id }, data: { status: "pago", settledAt: new Date() } });
  revalidatePath("/acertos");
  redirect(monthPath("/acertos", year, month));
}

export async function deletePersonBalance(formData: FormData) {
  const user = await getCurrentUser();
  const id = String(formData.get("id"));
  const year = Number(formData.get("year"));
  const month = Number(formData.get("month"));
  await prisma.personBalance.delete({ where: { id } });
  await logAudit(user.id, "delete", "PersonBalance", id);
  revalidatePath("/acertos");
  redirect(monthPath("/acertos", year, month));
}
