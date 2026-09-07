import Link from "next/link";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, HandCoins, PiggyBank, Target, Wallet } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { Card, ProgressBar, SectionTitle, StatCard, alertColor } from "@/components/ui";
import { CategoryIcon } from "@/components/CategoryIcon";
import { CategoryDonut } from "@/components/charts/CategoryDonut";
import { EvolutionChart } from "@/components/charts/EvolutionChart";
import { centsToBRL, centsToSignedBRL, percentLabel } from "@/lib/format";
import { monthLabel, previousMonth } from "@/lib/finance";
import { resolveMonthParams } from "@/lib/params";
import { getCurrentUser, getMonthDashboard, getMonthSummaryLight } from "@/lib/queries";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const { year, month } = resolveMonthParams(searchParams);
  const user = await getCurrentUser();
  const data = await getMonthDashboard(user.id, year, month);

  // Últimos 6 meses (somente leitura, não cria registros).
  const points: { year: number; month: number }[] = [];
  let cursor = { year, month };
  for (let i = 0; i < 6; i++) {
    points.unshift(cursor);
    cursor = previousMonth(cursor.year, cursor.month);
  }
  const evolutionRaw = await Promise.all(
    points.map(async (p) => ({
      p,
      summary: p.year === year && p.month === month ? data.summary : await getMonthSummaryLight(user.id, p.year, p.month),
    }))
  );
  const evolutionData = evolutionRaw.map(({ p, summary }) => ({
    label: monthLabel(p.year, p.month).split(" de ")[0].slice(0, 3),
    planejadoCents: summary.planejadoTotal,
    gastoCents: summary.gastoTotalMes,
  }));

  const donutData = data.categories.map((c) => ({ name: c.name, value: c.spentCents, color: c.color }));
  const installmentsTotal = data.installmentStates.reduce((s, i) => s + i.personalValueCents, 0);
  donutData.push({ name: "Parcelamentos", value: installmentsTotal, color: "#bf5af2" });

  const gastoTotalMes = data.summary.gastoTotalMes;
  const tetoUsedPercent = data.summary.tetoTotal > 0 ? (data.summary.gastoRealTotal / data.summary.tetoTotal) * 100 : 0;

  const compromissos = [
    ...data.fixedExpenseStates
      .filter((f) => f.mandatory)
      .map((f) => ({ label: f.name, valueCents: f.personalValueCents, tag: "Obrigatório" as const })),
    data.installmentStates.length > 0
      ? {
          label: "Parcelamentos do cartão",
          valueCents: installmentsTotal,
          tag: "Obrigatório" as const,
        }
      : null,
    ...data.adjustments.map((a) => ({ label: a.description, valueCents: a.amountCents, tag: "Ajuste do mês" as const })),
  ].filter(
    (x): x is { label: string; valueCents: number; tag: "Obrigatório" | "Ajuste do mês" } => x !== null
  );

  const acertosPendentes = data.personBalances.filter((p) => p.status === "pendente");
  const acertosPendentesTotal = acertosPendentes.reduce((s, p) => s + p.netCents, 0);

  return (
    <AppShell>
      <PageHeader
        title={`Olá, ${user.name}!`}
        subtitle="Controle hoje o futuro que você quer."
        year={year}
        month={month}
      />

      {data.month.netIncomeCents == null && (
        <Link
          href={`/planejamento?y=${year}&m=${month}`}
          className="mb-6 flex items-center gap-3 rounded-2xl border border-warn/30 bg-warn/10 px-5 py-3.5 text-sm text-warn"
        >
          <AlertTriangle size={18} className="shrink-0" />
          Informe a renda líquida de {monthLabel(year, month)} para ver a sobra prevista e o saldo do mês.
        </Link>
      )}

      {acertosPendentes.length > 0 && (
        <Link
          href={`/acertos?y=${year}&m=${month}`}
          className="mb-6 flex items-center gap-3 rounded-2xl border border-info/30 bg-info/10 px-5 py-3.5 text-sm text-info"
        >
          <HandCoins size={18} className="shrink-0" />
          {acertosPendentesTotal >= 0
            ? `Você tem ${centsToBRL(acertosPendentesTotal)} a pagar em acertos pendentes.`
            : `Você tem ${centsToBRL(Math.abs(acertosPendentesTotal))} a receber em acertos pendentes.`}
        </Link>
      )}

      <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
        <Link href={`/planejamento?y=${year}&m=${month}`}>
          <StatCard
            icon={ArrowUpRight}
            iconColor="#30d158"
            label="Receita do mês"
            value={centsToBRL(data.month.netIncomeCents)}
          />
        </Link>
        <Link href={`/relatorios?y=${year}&m=${month}`}>
          <StatCard
            icon={ArrowDownRight}
            iconColor="#ff3b30"
            label="Total de gastos"
            value={centsToBRL(gastoTotalMes)}
          />
        </Link>
        <Link href={`/metas?y=${year}&m=${month}`}>
          <StatCard
            icon={Wallet}
            iconColor="#0a84ff"
            label="Saldo do mês"
            value={data.summary.sobraReal != null ? centsToSignedBRL(data.summary.sobraReal) : "—"}
            trend={
              data.summary.sobraReal != null
                ? { label: data.summary.sobraReal >= 0 ? "Positivo" : "Negativo", positive: data.summary.sobraReal >= 0 }
                : undefined
            }
          />
        </Link>
        <Link href={`/planejamento?y=${year}&m=${month}`}>
          <StatCard
            icon={Target}
            iconColor="#32ade6"
            label="Teto de gastos novos"
            value={`${percentLabel(tetoUsedPercent)}`}
          />
        </Link>
      </div>

      <div className="mt-6 grid gap-6 lg:mt-8 lg:grid-cols-2">
        <Card>
          <SectionTitle>Gastos por categoria</SectionTitle>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <CategoryDonut data={donutData} totalCents={gastoTotalMes} />
            <ul className="flex-1 space-y-2">
              {donutData
                .filter((d) => d.value > 0)
                .sort((a, b) => b.value - a.value)
                .map((d) => (
                  <li key={d.name} className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex items-center gap-2 text-slate-300">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                      {d.name}
                    </span>
                    <span className="font-medium text-slate-100">{centsToBRL(d.value)}</span>
                  </li>
                ))}
              {donutData.every((d) => d.value === 0) && (
                <li className="text-sm text-slate-500">Nenhum gasto registrado neste mês ainda.</li>
              )}
            </ul>
          </div>
        </Card>

        <Card>
          <SectionTitle>Evolução de gastos</SectionTitle>
          <EvolutionChart data={evolutionData} />
          <div className="mt-2 flex items-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-brand" /> Gasto real
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-info" /> Planejado
            </span>
          </div>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:gap-5 lg:mt-8">
        <Link href={`/caixa?y=${year}&m=${month}`}>
          <StatCard
            icon={Wallet}
            iconColor="#30d158"
            label="Caixa disponível (não é renda)"
            value={centsToBRL(data.cashAvailableCents)}
          />
        </Link>
        <Link href={`/acertos?y=${year}&m=${month}`}>
          <StatCard
            icon={HandCoins}
            iconColor="#ff9f0a"
            label="Acertos pendentes"
            value={acertosPendentes.length > 0 ? centsToSignedBRL(acertosPendentesTotal) : "—"}
          />
        </Link>
      </div>

      <div className="mt-6 grid gap-6 lg:mt-8 lg:grid-cols-2">
        <Card>
          <SectionTitle
            action={
              <Link href={`/planejamento?y=${year}&m=${month}`} className="text-xs font-medium text-brand-light">
                Ver planejamento
              </Link>
            }
          >
            Compromissos do mês
          </SectionTitle>
          {compromissos.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum compromisso obrigatório cadastrado.</p>
          ) : (
            <ul className="space-y-4">
              {compromissos.map((c, idx) => (
                <li key={idx} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-300">{c.label}</span>
                  <span className="flex items-center gap-2">
                    <span className="font-medium text-slate-100">{centsToBRL(c.valueCents)}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        c.tag === "Obrigatório" ? "bg-bad/15 text-bad" : "bg-warn/15 text-warn"
                      }`}
                    >
                      {c.tag}
                    </span>
                  </span>
                </li>
              ))}
              <li className="flex items-center justify-between border-t border-base-border pt-3 text-sm font-semibold">
                <span className="text-slate-200">Total comprometido</span>
                <span className="text-slate-100">{centsToBRL(data.summary.totalComprometido)}</span>
              </li>
            </ul>
          )}
        </Card>

        <Card>
          <SectionTitle
            action={
              <span className="text-xs text-slate-400">
                {centsToBRL(data.summary.tetoTotal - data.summary.gastoRealTotal)} disponíveis
              </span>
            }
          >
            Teto de gastos novos
          </SectionTitle>
          <ProgressBar percent={tetoUsedPercent} color="#0a84ff" />
          <ul className="mt-4 space-y-4">
            {data.categories.map((c) => (
              <li key={c.id} className="flex items-center gap-3">
                <CategoryIcon icon={c.icon} color={c.color} size={15} />
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                    <span className="truncate text-slate-300">{c.name}</span>
                    <span className="text-slate-400">
                      {centsToBRL(c.spentCents)} / {centsToBRL(c.limitCents)}
                    </span>
                  </div>
                  <ProgressBar percent={c.percentUsed} color={alertColor(c.alertLevel)} />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {data.summary.sobraPrevista != null && (
        <Card className="mt-6 flex items-center gap-3 lg:mt-8">
          <PiggyBank size={20} className="shrink-0 text-brand-light" />
          <p className="text-sm text-slate-300">
            Sobra prevista de {monthLabel(year, month)}:{" "}
            <span className={`font-semibold ${data.summary.sobraPrevista >= 0 ? "text-good" : "text-bad"}`}>
              {centsToSignedBRL(data.summary.sobraPrevista)}
            </span>{" "}
            ({percentLabel(data.summary.percentualRendaComprometida)} da renda já comprometida com obrigações).
          </p>
        </Card>
      )}
    </AppShell>
  );
}
