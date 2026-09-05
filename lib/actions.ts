"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { brlToCents } from "@/lib/format";
import { getCurrentUser, getOrCreateMonth } from "@/lib/queries";

function monthPath(base: string, year: number, month: number) {
  return `${base}?y=${year}&m=${month}`;
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
  const monthId = String(formData.get("monthId"));
  const year = Number(formData.get("year"));
  const month = Number(formData.get("month"));
  await prisma.month.update({ where: { id: monthId }, data: { status: "closed", closedAt: new Date() } });
  revalidatePath("/planejamento");
  redirect(monthPath("/planejamento", year, month));
}

export async function reopenMonth(formData: FormData) {
  const monthId = String(formData.get("monthId"));
  const year = Number(formData.get("year"));
  const month = Number(formData.get("month"));
  await prisma.month.update({ where: { id: monthId }, data: { status: "open", closedAt: null } });
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
  const id = String(formData.get("id"));
  const year = Number(formData.get("year"));
  const month = Number(formData.get("month"));
  await prisma.transaction.delete({ where: { id } });
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
