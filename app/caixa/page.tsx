import { Plus, Wallet } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { Card, SectionTitle, Button, StatCard } from "@/components/ui";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { centsToBRL } from "@/lib/format";
import { resolveMonthParams } from "@/lib/params";
import { getCurrentUser, getMonthDashboard } from "@/lib/queries";
import {
  createAdjustment,
  createCashEntry,
  deleteAdjustment,
  deleteCashEntry,
  upsertOpeningBalance,
} from "@/lib/actions";

export const dynamic = "force-dynamic";

const CASH_ENTRY_LABELS: Record<string, string> = {
  salary: "Salário",
  reimbursement: "Reembolso",
  loan_proceeds: "Empréstimo recebido",
  transfer: "Transferência",
  other: "Outro",
};

export default async function CaixaPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const { year, month } = resolveMonthParams(searchParams);
  const user = await getCurrentUser();
  const data = await getMonthDashboard(user.id, year, month);

  return (
    <AppShell>
      <PageHeader
        title="Caixa"
        subtitle="Saldo inicial, entradas de caixa e ajustes pontuais — nada aqui conta como renda automaticamente."
        year={year}
        month={month}
      />

      <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2">
        <StatCard
          icon={Wallet}
          iconColor="#30d158"
          label="Caixa disponível no mês"
          value={centsToBRL(data.cashAvailableCents)}
        />
        <Card className="flex flex-col justify-center gap-1 text-sm text-slate-400">
          <p>
            Saldo inicial + entradas de caixa deste mês. <strong className="text-slate-200">Não</strong> entra na
            renda líquida nem no total de gastos — é só uma posição de caixa informativa (spec CA-S02).
          </p>
        </Card>
      </div>

      <Card className="mt-6 lg:mt-8">
        <SectionTitle>Saldo inicial da competência</SectionTitle>
        <form action={upsertOpeningBalance} className="grid gap-4 sm:grid-cols-[1fr_2fr_auto] sm:items-end">
          <input type="hidden" name="monthId" value={data.month.id} />
          <input type="hidden" name="year" value={year} />
          <input type="hidden" name="month" value={month} />
          <div>
            <label className="field-label" htmlFor="ob-amount">Valor (R$)</label>
            <input
              className="field-input"
              inputMode="decimal"
              id="ob-amount"
              name="amount"
              placeholder="0,00"
              defaultValue={data.openingBalance ? (data.openingBalance.amountCents / 100).toFixed(2).replace(".", ",") : ""}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="ob-description">Observação</label>
            <input
              className="field-input"
              id="ob-description"
              name="description"
              placeholder="Ex: Posição de caixa disponível para pagar o mês"
              defaultValue={data.openingBalance?.description ?? ""}
            />
          </div>
          <Button type="submit">Salvar</Button>
        </form>
      </Card>

      <div className="mt-6 grid gap-6 lg:mt-8 lg:grid-cols-[360px_1fr]">
        <Card>
          <SectionTitle>+ Nova entrada de caixa</SectionTitle>
          <form action={createCashEntry} className="space-y-4">
            <input type="hidden" name="monthId" value={data.month.id} />
            <input type="hidden" name="year" value={year} />
            <input type="hidden" name="month" value={month} />
            <div>
              <label className="field-label" htmlFor="ce-type">Tipo</label>
              <select className="field-select" id="ce-type" name="type" defaultValue="loan_proceeds">
                {Object.entries(CASH_ENTRY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="ce-amount">Valor (R$)</label>
              <input className="field-input" inputMode="decimal" id="ce-amount" name="amount" placeholder="0,00" required />
            </div>
            <div>
              <label className="field-label" htmlFor="ce-description">Descrição</label>
              <input className="field-input" id="ce-description" name="description" placeholder="Opcional" />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" name="countsAsIncome" /> Contar como renda do mês
            </label>
            <Button type="submit" className="w-full justify-center">
              <Plus size={16} /> Adicionar entrada
            </Button>
          </form>
        </Card>

        <Card className="!p-0 overflow-hidden">
          <div className="p-5 sm:p-6">
            <h2 className="text-base font-semibold text-slate-100">Entradas de caixa do mês</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-y border-base-border text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-2.5 font-medium">Tipo</th>
                  <th className="px-5 py-2.5 font-medium">Descrição</th>
                  <th className="px-5 py-2.5 font-medium">Renda?</th>
                  <th className="px-5 py-2.5 text-right font-medium">Valor</th>
                  <th className="px-5 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {data.cashEntries.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                      Nenhuma entrada de caixa neste mês.
                    </td>
                  </tr>
                )}
                {data.cashEntries.map((ce) => (
                  <tr key={ce.id} className="border-b border-base-border/60 last:border-0">
                    <td className="px-5 py-3.5 text-slate-100">{CASH_ENTRY_LABELS[ce.type] ?? ce.type}</td>
                    <td className="px-5 py-3.5 text-slate-400">{ce.description ?? "—"}</td>
                    <td className="px-5 py-3.5 text-slate-400">{ce.countsAsIncome ? "Sim" : "Não"}</td>
                    <td className="px-5 py-3.5 text-right font-medium text-slate-100">{centsToBRL(ce.amountCents)}</td>
                    <td className="px-2 py-3 text-right">
                      <form action={deleteCashEntry}>
                        <input type="hidden" name="id" value={ce.id} />
                        <input type="hidden" name="year" value={year} />
                        <input type="hidden" name="month" value={month} />
                        <ConfirmSubmitButton message={`Excluir a entrada "${ce.description ?? CASH_ENTRY_LABELS[ce.type]}"?`} />
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:mt-8 lg:grid-cols-[360px_1fr]">
        <Card>
          <SectionTitle>+ Ajuste pontual do mês</SectionTitle>
          <p className="mb-4 -mt-2 text-xs text-slate-500">
            Despesa só desta competência (ex: "Empréstimo Amanda", "Viagem") — nunca vira recorrência.
          </p>
          <form action={createAdjustment} className="space-y-4">
            <input type="hidden" name="monthId" value={data.month.id} />
            <input type="hidden" name="year" value={year} />
            <input type="hidden" name="month" value={month} />
            <div>
              <label className="field-label" htmlFor="adj-description">Descrição</label>
              <input className="field-input" id="adj-description" name="description" placeholder="Ex: Viagem" required />
            </div>
            <div>
              <label className="field-label" htmlFor="adj-amount">Valor (R$)</label>
              <input className="field-input" inputMode="decimal" id="adj-amount" name="amount" placeholder="0,00" required />
            </div>
            <Button type="submit" className="w-full justify-center">
              <Plus size={16} /> Adicionar ajuste
            </Button>
          </form>
        </Card>

        <Card className="!p-0 overflow-hidden">
          <div className="p-5 sm:p-6">
            <h2 className="text-base font-semibold text-slate-100">Ajustes pontuais do mês</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="border-y border-base-border text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-2.5 font-medium">Descrição</th>
                  <th className="px-5 py-2.5 text-right font-medium">Valor</th>
                  <th className="px-5 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {data.adjustments.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-5 py-8 text-center text-slate-500">
                      Nenhum ajuste pontual neste mês.
                    </td>
                  </tr>
                )}
                {data.adjustments.map((a) => (
                  <tr key={a.id} className="border-b border-base-border/60 last:border-0">
                    <td className="px-5 py-3.5 text-slate-100">{a.description}</td>
                    <td className="px-5 py-3.5 text-right font-medium text-slate-100">{centsToBRL(a.amountCents)}</td>
                    <td className="px-2 py-3 text-right">
                      <form action={deleteAdjustment}>
                        <input type="hidden" name="id" value={a.id} />
                        <input type="hidden" name="year" value={year} />
                        <input type="hidden" name="month" value={month} />
                        <ConfirmSubmitButton message={`Excluir o ajuste "${a.description}"?`} />
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
