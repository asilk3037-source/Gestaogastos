import { Plus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { Card, SectionTitle, Button } from "@/components/ui";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { centsToBRL } from "@/lib/format";
import { getFixedExpenseStateForMonth, monthLabel } from "@/lib/finance";
import { resolveMonthParams } from "@/lib/params";
import { getCurrentUser, listFixedExpenses } from "@/lib/queries";
import { createFixedExpense, deactivateFixedExpense } from "@/lib/actions";

const MONTH_OPTIONS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export default async function DespesasFixasPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const { year, month } = resolveMonthParams(searchParams);
  const user = await getCurrentUser();
  const expenses = await listFixedExpenses(user.id);
  const active = expenses.filter((e) => e.active);

  return (
    <AppShell>
      <PageHeader
        title="Despesas fixas"
        subtitle="Aluguel, empréstimos e outras contas recorrentes."
        year={year}
        month={month}
      />

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <Card>
          <SectionTitle>+ Nova despesa fixa</SectionTitle>
          <form action={createFixedExpense} className="space-y-3">
            <div>
              <label className="field-label" htmlFor="name">Nome</label>
              <input className="field-input" id="name" name="name" placeholder="Ex: Aluguel" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label" htmlFor="amount">Valor total (R$)</label>
                <input className="field-input" inputMode="decimal" id="amount" name="amount" placeholder="0,00" required />
              </div>
              <div>
                <label className="field-label" htmlFor="durationMonths">Duração (meses)</label>
                <input
                  className="field-input"
                  type="number"
                  min={1}
                  id="durationMonths"
                  name="durationMonths"
                  placeholder="Indefinida"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label" htmlFor="startMonth">Competência inicial</label>
                <select className="field-select" id="startMonth" name="startMonth" defaultValue={month}>
                  {MONTH_OPTIONS.map((m, idx) => (
                    <option key={m} value={idx + 1}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label" htmlFor="startYear">Ano</label>
                <input className="field-input" type="number" id="startYear" name="startYear" defaultValue={year} required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label" htmlFor="personalPercentage">% pessoal</label>
                <input
                  className="field-input"
                  type="number"
                  min={0}
                  max={100}
                  id="personalPercentage"
                  name="personalPercentage"
                  defaultValue={100}
                />
              </div>
              <div>
                <label className="field-label" htmlFor="personName">Pessoa (se compartilhado)</label>
                <input className="field-input" id="personName" name="personName" placeholder="Opcional" />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input type="checkbox" name="mandatory" defaultChecked /> Compromisso obrigatório
            </label>
            <Button type="submit" className="w-full justify-center">
              <Plus size={16} /> Cadastrar despesa fixa
            </Button>
          </form>
        </Card>

        <Card className="!p-0 overflow-hidden">
          <div className="p-4 sm:p-5">
            <h2 className="text-base font-semibold text-white">Despesas cadastradas</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-y border-base-border text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-2 font-medium">Nome</th>
                  <th className="px-5 py-2 font-medium">Recorrência</th>
                  <th className="px-5 py-2 font-medium">Situação em {monthLabel(year, month)}</th>
                  <th className="px-5 py-2 text-right font-medium">Sua parte</th>
                  <th className="px-5 py-2" />
                </tr>
              </thead>
              <tbody>
                {active.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                      Nenhuma despesa fixa cadastrada.
                    </td>
                  </tr>
                )}
                {active.map((fx) => {
                  const state = getFixedExpenseStateForMonth(fx, year, month);
                  return (
                    <tr key={fx.id} className="border-b border-base-border/60 last:border-0">
                      <td className="px-5 py-3 text-slate-100">
                        {fx.name}
                        {fx.personName && <span className="ml-2 text-xs text-slate-500">({fx.personName})</span>}
                        {!fx.mandatory && (
                          <span className="ml-2 rounded-full bg-base-700 px-1.5 py-0.5 text-[10px] text-slate-400">
                            opcional
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-slate-400">
                        {fx.durationMonths ? `${fx.durationMonths} meses` : "Indefinida"} · desde{" "}
                        {monthLabel(fx.startYear, fx.startMonth)}
                      </td>
                      <td className="px-5 py-3">
                        {state ? (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                              state.isLast ? "bg-warn/15 text-warn" : "bg-brand-soft/40 text-brand-light"
                            }`}
                          >
                            {state.totalMonths ? `${state.monthsElapsed}/${state.totalMonths}` : "Ativa"}
                            {state.isLast ? " · última" : ""}
                          </span>
                        ) : (
                          <span className="rounded-full bg-base-700 px-2 py-0.5 text-[11px] text-slate-400">
                            Fora do período
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right font-medium text-white">
                        {state ? centsToBRL(state.personalValueCents) : "—"}
                      </td>
                      <td className="px-2 py-3 text-right">
                        <form action={deactivateFixedExpense}>
                          <input type="hidden" name="id" value={fx.id} />
                          <ConfirmSubmitButton message={`Excluir a despesa fixa "${fx.name}"?`} />
                        </form>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
