import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/queries";

/** Exportação/backup em JSON legível (spec §14 — requisito não funcional). */
export async function GET() {
  const user = await getCurrentUser();
  const [months, categories, paymentMethods, installments, fixedExpenses, transactions] = await Promise.all([
    prisma.month.findMany({ where: { userId: user.id }, include: { monthlyLimits: true } }),
    prisma.category.findMany({ where: { userId: user.id } }),
    prisma.paymentMethod.findMany({ where: { userId: user.id } }),
    prisma.installment.findMany({ where: { userId: user.id } }),
    prisma.fixedExpense.findMany({ where: { userId: user.id } }),
    prisma.transaction.findMany({ where: { month: { userId: user.id } } }),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    user: { id: user.id, name: user.name, email: user.email, currency: user.currency },
    months,
    categories,
    paymentMethods,
    installments,
    fixedExpenses,
    transactions,
  };

  return NextResponse.json(payload, {
    headers: {
      "Content-Disposition": `attachment; filename="gestao-financeira-backup-${Date.now()}.json"`,
    },
  });
}
