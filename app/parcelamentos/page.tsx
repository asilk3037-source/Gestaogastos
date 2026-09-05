import { AlertTriangle, Plus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { Card, SectionTitle, Button } from "@/components/ui";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { centsToBRL } from "@/lib/format";
import { getInstallmentStateForMonth, monthLabel } from "@/lib/finance";
import { resolveMonthParams } from "@/lib/params";
import { getCurrentUser, listInstallments, listPaymentMethods } from "@/lib/queries";
import { createInstallment, deactivateInstallment } from "@/lib/actions";

const MONTH_OPTIONS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export default async function ParcelamentosPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const { year, month } = resolveMonthParams(searchParams);
  const user = await getCurrentUser();
  const [installments, paymentMethods] = await Promise.all([
    listInstallments(user.id),
    listPaymentMethods(user.id),
  ]);

  const rows = installments
    .filter((i) => i.active)
    .map((inst) => ({ inst, state: getInstallmentStateForMonth(inst, year, month) }));

  const ativos = rows.filter((r) => r.state);
  const foraDoPeriodo = rows.filter((r) => !r.state);
  const totalPessoal = ativos.reduce((s, r) => s + (r.state?.personalValueCents ?? 0), 0);

  return (
    <AppShell>
      <PageHeader
        title="Parcelamentos"
        subtitle={`Compras parceladas ativas em ${monthLabel(year, month)}.`}
        year={year}
        month={month}
      />

      <div className="mb-4 flex items-center gap-3 rounded-xl border border-warn/30 bg-warn/10 px-4 py-3 text-sm text-warn lg:mb-6">
        <AlertTriangle size={18} className="shrink-0" />
        Evite novas compras parceladas enquanto durar o período de reorganização financeira.
      </div>

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <Card>
          <SectionTitle>+ Nova compra parcelada</SectionTitle>
          <form action={createInstallment} className="space-y-3">
            <div>
              <label className="field-label" htmlFor="description">Descrição</label>
              <input className="field-input" id="description" name="description" placeholder="Ex: Loja X" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label" htmlFor="amount">Valor da parcela (R$)</label>
                <input className="field-input" inputMode="decimal" id="amount" name="amount" placeholder="0,00" required />
              </div>
              <div>
                <label className="field-label" htmlFor="totalInstallments">Nº de parcelas</label>
                <input
                  className="field-input"
                  type="number"
                  min={1}
                  id="totalInstallments"
                  name="totalInstallments"
                  defaultValue={1}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label" htmlFor="firstMonth">1ª competência</label>
                <select className="field-select" id="firstMonth" name="firstMonth" defaultValue={month}>
                  {MONTH_OPTIONS.map((m, idx) => (
                    <option key={m} value={idx + 1}>{m}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label" htmlFor="firstYear">Ano</label>
                <input className="field-input" type="number" id="firstYear" name="firstYear" defaultValue={year} required />
              </div>
            </div>
            <div>
              <label className="field-label" htmlFor="paymentMethodId">Forma de pagamento</label>
              <select className="field-select" id="paymentMethodId" name="paymentMethodId">
                <option value="">—</option>
                {paymentMethods.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label" htmlFor="personalPercentage">% pessoal</label>
                <input
                  className="field-input"
                  type="number"
                  step="1"
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
            <Button type="submit" className="w-full justify-center">
              <Plus size={16} /> Cadastrar parcelamento
            </Button>
          </form>
        </Card>

        <div className="space-y-4">
          <Card className="!p-0 overflow-hidden">
            <div className="flex items-center justify-between p-4 sm:p-5">
              <h2 className="text-base font-semibold text-slate-100">Ativos em {monthLabel(year, month)}</h2>
              <span className="text-sm font-medium text-slate-300">{centsToBRL(totalPessoal)}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-y border-base-border text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-2 font-medium">Descrição</th>
                    <th className="px-5 py-2 font-medium">Parcela</th>
                    <th className="px-5 py-2 font-medium">Situação</th>
                    <th className="px-5 py-2 text-right font-medium">Sua parte</th>
                    <th className="px-5 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {ativos.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-8 text-center text-slate-500">
                        Nenhum parcelamento ativo nesta competência.
                      </td>
                    </tr>
                  )}
                  {ativos.map(({ inst, state }) => (
                    <tr key={inst.id} className="border-b border-base-border/60 last:border-0">
                      <td className="px-5 py-3 text-slate-100">
                        {inst.description}
                        {inst.personName && <span className="ml-2 text-xs text-slate-500">({inst.personName})</span>}
                      </td>
                      <td className="px-5 py-3 text-slate-300">
                        {state!.currentInstallment}/{state!.totalInstallments}
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                            state!.status === "ultima" ? "bg-warn/15 text-warn" : "bg-brand-soft/40 text-brand-light"
                          }`}
                        >
                          {state!.status === "ultima" ? "Última" : "Ativo"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right font-medium text-slate-100">
                        {centsToBRL(state!.personalValueCents)}
                        {inst.personalPercentage < 1 && (
                          <span className="ml-1 text-xs font-normal text-slate-500">
                            ({Math.round(inst.personalPercentage * 100)}%)
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-3 text-right">
                        <form action={deactivateInstallment}>
                          <input type="hidden" name="id" value={inst.id} />
                          <ConfirmSubmitButton message={`Encerrar manualmente "${inst.description}"?`} />
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {foraDoPeriodo.length > 0 && (
            <Card>
              <SectionTitle>Fora do período (não entram no planejamento deste mês)</SectionTitle>
              <ul className="space-y-2 text-sm text-slate-400">
                {foraDoPeriodo.map(({ inst }) => (
                  <li key={inst.id} className="flex items-center justify-between">
                    <span>{inst.description}</span>
                    <span>
                      {monthLabel(inst.firstYear, inst.firstMonth)} · {inst.totalInstallments}x de{" "}
                      {centsToBRL(inst.installmentAmountCents)}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  );
}
