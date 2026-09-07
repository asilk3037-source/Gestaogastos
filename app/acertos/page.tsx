import { HandCoins, Plus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { Card, SectionTitle, Button, StatCard } from "@/components/ui";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { centsToBRL, centsToSignedBRL } from "@/lib/format";
import { resolveMonthParams } from "@/lib/params";
import { getCurrentUser, getMonthDashboard } from "@/lib/queries";
import { createPersonBalance, deletePersonBalance, markPersonBalancePaid } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function AcertosPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const { year, month } = resolveMonthParams(searchParams);
  const user = await getCurrentUser();
  const data = await getMonthDashboard(user.id, year, month);

  const pendentes = data.personBalances.filter((p) => p.status === "pendente");
  const totalPendenteCents = pendentes.reduce((s, p) => s + p.netCents, 0);

  return (
    <AppShell>
      <PageHeader
        title="Acertos entre pessoas"
        subtitle="Reembolsos e despesas compartilhadas (ex: Isabel) — não entram como renda nem gasto do mês."
        year={year}
        month={month}
      />

      <StatCard
        icon={HandCoins}
        iconColor="#ff9f0a"
        label="Saldo líquido pendente no mês"
        value={centsToSignedBRL(totalPendenteCents)}
      />

      <div className="mt-6 grid grid-cols-1 gap-6 lg:mt-8 lg:grid-cols-[380px_1fr]">
        <Card>
          <SectionTitle>+ Novo acerto</SectionTitle>
          <p className="mb-4 -mt-2 text-xs text-slate-500">
            Informe o total que você deve à pessoa (payable) e o total que ela deve a você (receivable) — o
            sistema calcula o saldo líquido (positivo = você paga, negativo = você recebe).
          </p>
          <form action={createPersonBalance} className="space-y-4">
            <input type="hidden" name="monthId" value={data.month.id} />
            <input type="hidden" name="year" value={year} />
            <input type="hidden" name="month" value={month} />
            <div>
              <label className="field-label" htmlFor="pb-person">Pessoa</label>
              <input className="field-input" id="pb-person" name="person" placeholder="Ex: Isabel" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label" htmlFor="pb-payable">Você deve (R$)</label>
                <input className="field-input" inputMode="decimal" id="pb-payable" name="payable" placeholder="0,00" />
              </div>
              <div>
                <label className="field-label" htmlFor="pb-receivable">Ela deve a você (R$)</label>
                <input className="field-input" inputMode="decimal" id="pb-receivable" name="receivable" placeholder="0,00" />
              </div>
            </div>
            <div>
              <label className="field-label" htmlFor="pb-description">Descrição</label>
              <input className="field-input" id="pb-description" name="description" placeholder="Ex: Acerto de Setembro/2026" />
            </div>
            <Button type="submit" className="w-full justify-center">
              <Plus size={16} /> Registrar acerto
            </Button>
          </form>
        </Card>

        <Card className="!p-0 overflow-hidden">
          <div className="p-5 sm:p-6">
            <h2 className="text-base font-semibold text-slate-100">Acertos do mês</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead>
                <tr className="border-y border-base-border text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-2.5 font-medium">Pessoa</th>
                  <th className="px-5 py-2.5 font-medium">Descrição</th>
                  <th className="px-5 py-2.5 text-right font-medium">Você deve</th>
                  <th className="px-5 py-2.5 text-right font-medium">Deve a você</th>
                  <th className="px-5 py-2.5 text-right font-medium">Saldo</th>
                  <th className="px-5 py-2.5 font-medium">Status</th>
                  <th className="px-5 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {data.personBalances.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-slate-500">
                      Nenhum acerto registrado neste mês.
                    </td>
                  </tr>
                )}
                {data.personBalances.map((pb) => (
                  <tr key={pb.id} className="border-b border-base-border/60 last:border-0">
                    <td className="px-5 py-3.5 text-slate-100">{pb.person}</td>
                    <td className="px-5 py-3.5 text-slate-400">{pb.description ?? "—"}</td>
                    <td className="px-5 py-3.5 text-right text-slate-300">{centsToBRL(pb.payableCents)}</td>
                    <td className="px-5 py-3.5 text-right text-slate-300">{centsToBRL(pb.receivableCents)}</td>
                    <td
                      className={`px-5 py-3.5 text-right font-medium ${
                        pb.netCents > 0 ? "text-bad" : pb.netCents < 0 ? "text-good" : "text-slate-100"
                      }`}
                    >
                      {centsToSignedBRL(pb.netCents)}
                      <span className="ml-1 text-xs font-normal text-slate-500">
                        {pb.netCents > 0 ? "a pagar" : pb.netCents < 0 ? "a receber" : ""}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          pb.status === "pago" ? "bg-good/15 text-good" : "bg-warn/15 text-warn"
                        }`}
                      >
                        {pb.status === "pago" ? "Pago" : "Pendente"}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {pb.status === "pendente" && (
                          <form action={markPersonBalancePaid}>
                            <input type="hidden" name="id" value={pb.id} />
                            <input type="hidden" name="year" value={year} />
                            <input type="hidden" name="month" value={month} />
                            <button
                              type="submit"
                              className="rounded-xl px-2 py-1 text-xs font-medium text-brand-light hover:bg-brand-soft/40"
                            >
                              Marcar pago
                            </button>
                          </form>
                        )}
                        <form action={deletePersonBalance}>
                          <input type="hidden" name="id" value={pb.id} />
                          <input type="hidden" name="year" value={year} />
                          <input type="hidden" name="month" value={month} />
                          <ConfirmSubmitButton message={`Excluir o acerto com "${pb.person}"?`} />
                        </form>
                      </div>
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
