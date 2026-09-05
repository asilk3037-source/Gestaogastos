import { PiggyBank, Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { Card, ProgressBar, SectionTitle } from "@/components/ui";
import { centsToBRL, centsToSignedBRL } from "@/lib/format";
import { resolveMonthParams } from "@/lib/params";
import { getCurrentUser, getMonthDashboard } from "@/lib/queries";

const ROADMAP = [
  "Metas de economia por objetivo (viagem, reserva de emergência etc.)",
  "Notificações de vencimentos",
  "Comparação com a média dos últimos 3 e 6 meses",
  "Detecção automática de assinaturas recorrentes",
  "Modo “posso comprar?”: simula o impacto de uma compra no teto e na sobra",
];

export default async function MetasPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const { year, month } = resolveMonthParams(searchParams);
  const user = await getCurrentUser();
  const data = await getMonthDashboard(user.id, year, month);

  const reserveTarget = data.month.reserveTargetCents;
  const realized = data.summary.sobraReal;
  const progressPercent = reserveTarget > 0 && realized != null ? Math.min(100, (realized / reserveTarget) * 100) : 0;

  return (
    <AppShell>
      <PageHeader title="Metas" subtitle="Meta de reserva do mês e próximos passos do sistema." year={year} month={month} />

      <Card className="mb-4 lg:mb-6">
        <SectionTitle>Meta de reserva</SectionTitle>
        {reserveTarget === 0 ? (
          <p className="text-sm text-slate-400">
            Nenhuma meta de reserva definida para este mês.{" "}
            <a href={`/planejamento?y=${year}&m=${month}`} className="text-brand-light">Configurar no planejamento</a>.
          </p>
        ) : (
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand/15 text-brand-light">
              <PiggyBank size={26} />
            </span>
            <div className="flex-1">
              <div className="mb-1.5 flex items-center justify-between text-sm">
                <span className="text-slate-300">Meta: {centsToBRL(reserveTarget)}</span>
                <span className="text-slate-400">
                  {realized != null ? `Sobra atual: ${centsToSignedBRL(realized)}` : "Informe a renda para calcular"}
                </span>
              </div>
              <ProgressBar percent={progressPercent} color="#34d399" />
            </div>
          </div>
        )}
      </Card>

      <Card>
        <SectionTitle
          action={
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <Sparkles size={13} /> Roadmap
            </span>
          }
        >
          Próximas melhorias planejadas
        </SectionTitle>
        <ul className="space-y-2 text-sm text-slate-400">
          {ROADMAP.map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
              {item}
            </li>
          ))}
        </ul>
      </Card>
    </AppShell>
  );
}
