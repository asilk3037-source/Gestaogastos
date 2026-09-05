import { Lock, Unlock } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { Card, SectionTitle, Button, ProgressBar, alertColor } from "@/components/ui";
import { CategoryIcon } from "@/components/CategoryIcon";
import { centsToBRL, centsToSignedBRL } from "@/lib/format";
import { resolveMonthParams } from "@/lib/params";
import { getCurrentUser, getMonthDashboard } from "@/lib/queries";
import { closeMonth, reopenMonth, updateCategoryLimit, updateMonthSettings } from "@/lib/actions";

export default async function PlanejamentoPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const { year, month } = resolveMonthParams(searchParams);
  const user = await getCurrentUser();
  const data = await getMonthDashboard(user.id, year, month);
  const isClosed = data.month.status === "closed";

  return (
    <AppShell>
      <PageHeader
        title="Planejamento mensal"
        subtitle={isClosed ? "Este mês está fechado — os valores permanecem no histórico." : "Configure renda, meta de reserva e tetos da competência."}
        year={year}
        month={month}
        actions={
          <form action={isClosed ? reopenMonth : closeMonth}>
            <input type="hidden" name="monthId" value={data.month.id} />
            <input type="hidden" name="year" value={year} />
            <input type="hidden" name="month" value={month} />
            <Button type="submit" variant="ghost">
              {isClosed ? <Unlock size={15} /> : <Lock size={15} />}
              {isClosed ? "Reabrir mês" : "Fechar mês"}
            </Button>
          </form>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2" id="planejamento">
        <Card>
          <SectionTitle>Configuração da competência</SectionTitle>
          <form action={updateMonthSettings} className="space-y-4">
            <input type="hidden" name="monthId" value={data.month.id} />
            <input type="hidden" name="year" value={year} />
            <input type="hidden" name="month" value={month} />
            <div>
              <label className="field-label" htmlFor="netIncome">Renda líquida do mês (R$)</label>
              <input
                className="field-input"
                type="text"
                inputMode="decimal"
                id="netIncome"
                name="netIncome"
                placeholder="Ex: 3000,00"
                defaultValue={data.month.netIncomeCents != null ? (data.month.netIncomeCents / 100).toFixed(2).replace(".", ",") : ""}
              />
              <p className="mt-1 text-xs text-slate-500">
                Sem essa informação, a sobra prevista e o saldo do mês não são calculados.
              </p>
            </div>
            <div>
              <label className="field-label" htmlFor="reserveTarget">Meta de reserva (R$)</label>
              <input
                className="field-input"
                type="text"
                inputMode="decimal"
                id="reserveTarget"
                name="reserveTarget"
                defaultValue={(data.month.reserveTargetCents / 100).toFixed(2).replace(".", ",")}
              />
            </div>
            <Button type="submit" className="w-full justify-center">Salvar</Button>
          </form>
        </Card>

        <Card>
          <SectionTitle>Resumo do mês</SectionTitle>
          <ul className="space-y-2.5 text-sm">
            <SummaryRow label="Compromissos obrigatórios" value={centsToBRL(data.summary.totalComprometido)} />
            <SummaryRow label="Teto de gastos novos" value={centsToBRL(data.summary.tetoTotal)} />
            <SummaryRow label="Meta de reserva" value={centsToBRL(data.month.reserveTargetCents)} />
            <SummaryRow label="Planejado total" value={centsToBRL(data.summary.planejadoTotal)} strong />
            <SummaryRow label="Renda informada" value={centsToBRL(data.month.netIncomeCents)} />
            <SummaryRow
              label="Sobra prevista"
              value={data.summary.sobraPrevista != null ? centsToSignedBRL(data.summary.sobraPrevista) : "—"}
              strong
              tone={data.summary.sobraPrevista == null ? undefined : data.summary.sobraPrevista >= 0 ? "good" : "bad"}
            />
          </ul>
        </Card>
      </div>

      <Card className="mt-6 lg:mt-8">
        <SectionTitle>Compromissos previstos (obrigatórios)</SectionTitle>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 font-medium">Item</th>
                <th className="py-2 font-medium">Observação</th>
                <th className="py-2 text-right font-medium">Valor</th>
              </tr>
            </thead>
            <tbody>
              {data.fixedExpenseStates
                .filter((f) => f.mandatory)
                .map((f) => (
                  <tr key={f.id} className="border-t border-base-border/60">
                    <td className="py-2.5 text-slate-100">{f.name}</td>
                    <td className="py-2.5 text-slate-500">
                      {f.totalMonths ? `${f.monthsElapsed}/${f.totalMonths}${f.isLast ? " · última" : ""}` : "recorrente"}
                      {f.personName ? ` · ${f.personName} compartilha` : ""}
                    </td>
                    <td className="py-2.5 text-right font-medium text-slate-100">{centsToBRL(f.personalValueCents)}</td>
                  </tr>
                ))}
              {data.installmentStates.length > 0 && (
                <tr className="border-t border-base-border/60">
                  <td className="py-2.5 text-slate-100">Parcelamentos do cartão</td>
                  <td className="py-2.5 text-slate-500">{data.installmentStates.length} parcela(s) ativa(s)</td>
                  <td className="py-2.5 text-right font-medium text-slate-100">
                    {centsToBRL(data.installmentStates.reduce((s, i) => s + i.personalValueCents, 0))}
                  </td>
                </tr>
              )}
              <tr className="border-t border-base-border font-semibold">
                <td className="py-2.5 text-slate-200" colSpan={2}>Total comprometido</td>
                <td className="py-2.5 text-right text-slate-100">{centsToBRL(data.summary.totalComprometido)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="mt-6 lg:mt-8">
        <SectionTitle>Tetos por categoria</SectionTitle>
        <div className="space-y-4">
          {data.categories.map((c) => (
            <div key={c.id} className="flex flex-col gap-3 border-b border-base-border/60 pb-4 last:border-0 last:pb-0 sm:flex-row sm:items-center">
              <div className="flex flex-1 items-center gap-3">
                <CategoryIcon icon={c.icon} color={c.color} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-100">{c.name}</p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                    <span>{centsToBRL(c.spentCents)} usados</span>
                    <span>·</span>
                    <span>{centsToBRL(c.saldoCents)} disponível</span>
                  </div>
                  <div className="mt-2 w-full max-w-xs">
                    <ProgressBar percent={c.percentUsed} color={alertColor(c.alertLevel)} />
                  </div>
                </div>
              </div>
              <form action={updateCategoryLimit} className="flex items-center gap-2">
                <input type="hidden" name="monthId" value={data.month.id} />
                <input type="hidden" name="categoryId" value={c.id} />
                <input type="hidden" name="year" value={year} />
                <input type="hidden" name="month" value={month} />
                <input
                  className="field-input w-28"
                  type="text"
                  inputMode="decimal"
                  name="limitCents"
                  defaultValue={(c.limitCents / 100).toFixed(2).replace(".", ",")}
                />
                <Button type="submit" variant="ghost" className="px-3 py-2 text-xs">
                  Salvar
                </Button>
              </form>
            </div>
          ))}
        </div>
      </Card>
    </AppShell>
  );
}

function SummaryRow({
  label,
  value,
  strong,
  tone,
}: {
  label: string;
  value: string;
  strong?: boolean;
  tone?: "good" | "bad";
}) {
  return (
    <li className={`flex items-center justify-between ${strong ? "border-t border-base-border pt-2.5 font-semibold" : ""}`}>
      <span className="text-slate-400">{label}</span>
      <span className={tone === "good" ? "text-good" : tone === "bad" ? "text-bad" : "text-slate-100"}>{value}</span>
    </li>
  );
}
