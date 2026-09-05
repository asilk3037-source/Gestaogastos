import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { Card, SectionTitle } from "@/components/ui";
import { centsToBRL, centsToSignedBRL } from "@/lib/format";
import { monthIndex, monthLabel, nextMonth } from "@/lib/finance";
import { resolveMonthParams } from "@/lib/params";
import { getCurrentUser, getMonthSummaryLight, listMonths } from "@/lib/queries";

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const { year, month } = resolveMonthParams(searchParams);
  const user = await getCurrentUser();
  const months = await listMonths(user.id);

  // Janela de comparação: do mês mais antigo já aberto até 2 meses após o
  // mês selecionado (sempre inclui o mês corrente, mesmo sem registros).
  const oldest = months.length
    ? months.reduce((a, b) => (monthIndex(a.year, a.month) < monthIndex(b.year, b.month) ? a : b))
    : { year, month };
  let cursor = { year: oldest.year, month: oldest.month };
  const windowEnd = nextMonth(year, month);
  const points: { year: number; month: number }[] = [];
  while (monthIndex(cursor.year, cursor.month) <= monthIndex(windowEnd.year, windowEnd.month) && points.length < 14) {
    points.push(cursor);
    cursor = nextMonth(cursor.year, cursor.month);
  }

  const rows = await Promise.all(
    points.map(async (p) => ({ p, summary: await getMonthSummaryLight(user.id, p.year, p.month) }))
  );

  return (
    <AppShell>
      <PageHeader title="Relatórios" subtitle="Planejado x realizado, mês a mês." year={year} month={month} />

      <Card className="!p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-base-border text-left text-xs uppercase tracking-wide text-slate-500">
                <th className="px-5 py-3 font-medium">Mês</th>
                <th className="px-5 py-3 text-right font-medium">Comprometido</th>
                <th className="px-5 py-3 text-right font-medium">Teto de gastos</th>
                <th className="px-5 py-3 text-right font-medium">Planejado</th>
                <th className="px-5 py-3 text-right font-medium">Gasto real</th>
                <th className="px-5 py-3 text-right font-medium">Sobra prevista</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ p, summary }) => {
                const isSelected = p.year === year && p.month === month;
                return (
                  <tr
                    key={`${p.year}-${p.month}`}
                    className={`border-b border-base-border/60 last:border-0 ${isSelected ? "bg-brand/5" : ""}`}
                  >
                    <td className="px-5 py-3 font-medium text-slate-100">{monthLabel(p.year, p.month)}</td>
                    <td className="px-5 py-3 text-right text-slate-300">{centsToBRL(summary.totalComprometido)}</td>
                    <td className="px-5 py-3 text-right text-slate-300">{centsToBRL(summary.tetoTotal)}</td>
                    <td className="px-5 py-3 text-right font-medium text-white">{centsToBRL(summary.planejadoTotal)}</td>
                    <td className="px-5 py-3 text-right text-slate-300">{centsToBRL(summary.gastoTotalMes)}</td>
                    <td className="px-5 py-3 text-right">
                      {summary.sobraPrevista != null ? (
                        <span className={summary.sobraPrevista >= 0 ? "text-good" : "text-bad"}>
                          {centsToSignedBRL(summary.sobraPrevista)}
                        </span>
                      ) : (
                        <span className="text-slate-500">— renda não informada</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
      <p className="mt-3 text-xs text-slate-500">
        Meses futuros sem lançamentos aparecem com o planejamento padrão das categorias — nada é criado até você abri-los.
      </p>
    </AppShell>
  );
}
