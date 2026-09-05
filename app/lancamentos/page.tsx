import { Plus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { Card, SectionTitle, Button } from "@/components/ui";
import { CategoryIcon } from "@/components/CategoryIcon";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { centsToBRL } from "@/lib/format";
import { resolveMonthParams } from "@/lib/params";
import { getCurrentUser, getMonthDashboard } from "@/lib/queries";
import { createTransaction, deleteTransaction } from "@/lib/actions";

export default async function LancamentosPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const { year, month } = resolveMonthParams(searchParams);
  const user = await getCurrentUser();
  const data = await getMonthDashboard(user.id, year, month);
  const todayISO = new Date().toISOString().slice(0, 10);

  return (
    <AppShell>
      <PageHeader
        title="Lançamentos"
        subtitle="Registre cada gasto do mês e acompanhe o teto em tempo real."
        year={year}
        month={month}
      />

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <Card id="novo-lancamento">
          <SectionTitle>+ Novo gasto</SectionTitle>
          <form action={createTransaction} className="space-y-4">
            <div>
              <label className="field-label" htmlFor="date">Data</label>
              <input className="field-input" type="date" id="date" name="date" defaultValue={todayISO} required />
            </div>
            <div>
              <label className="field-label" htmlFor="description">Descrição</label>
              <input
                className="field-input"
                type="text"
                id="description"
                name="description"
                placeholder="Ex: iFood"
                required
              />
            </div>
            <div>
              <label className="field-label" htmlFor="categoryId">Categoria</label>
              <select className="field-select" id="categoryId" name="categoryId" required>
                {data.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="field-label" htmlFor="amount">Valor (R$)</label>
                <input
                  className="field-input"
                  type="text"
                  inputMode="decimal"
                  id="amount"
                  name="amount"
                  placeholder="0,00"
                  required
                />
              </div>
              <div>
                <label className="field-label" htmlFor="paymentMethodId">Pagamento</label>
                <select className="field-select" id="paymentMethodId" name="paymentMethodId">
                  <option value="">—</option>
                  {data.paymentMethods.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <span className="field-label">Necessário?</span>
              <div className="flex gap-4 text-sm text-slate-300">
                <label className="flex items-center gap-1.5">
                  <input type="radio" name="necessary" value="sim" /> Sim
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="radio" name="necessary" value="nao" /> Não
                </label>
                <label className="flex items-center gap-1.5">
                  <input type="radio" name="necessary" value="" defaultChecked /> —
                </label>
              </div>
            </div>
            <div>
              <label className="field-label" htmlFor="notes">Observação</label>
              <input className="field-input" type="text" id="notes" name="notes" placeholder="Opcional" />
            </div>
            <Button type="submit" className="w-full justify-center">
              <Plus size={16} /> Adicionar lançamento
            </Button>
          </form>
        </Card>

        <Card id="lancamentos" className="overflow-hidden !p-0">
          <div className="flex items-center justify-between p-5 sm:p-6">
            <h2 className="text-base font-semibold text-slate-100">Lançamentos do mês</h2>
            <span className="text-sm text-slate-400">{data.transactions.length} registro(s)</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-y border-base-border text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-2.5 font-medium">Data</th>
                  <th className="px-5 py-2.5 font-medium">Descrição</th>
                  <th className="px-5 py-2.5 font-medium">Categoria</th>
                  <th className="px-5 py-2.5 font-medium">Forma</th>
                  <th className="px-5 py-2.5 text-right font-medium">Valor</th>
                  <th className="px-5 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {data.transactions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-slate-500">
                      Nenhum lançamento registrado neste mês ainda.
                    </td>
                  </tr>
                )}
                {data.transactions.map((t) => (
                  <tr key={t.id} className="border-b border-base-border/60 last:border-0">
                    <td className="whitespace-nowrap px-5 py-3.5 text-slate-400">
                      {new Date(t.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                    </td>
                    <td className="px-5 py-3.5 text-slate-100">
                      {t.description}
                      {t.necessary === false && (
                        <span className="ml-2 rounded-full bg-base-700 px-1.5 py-0.5 text-[10px] text-slate-400">
                          supérfluo
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="flex items-center gap-2 text-slate-300">
                        <CategoryIcon icon={t.category.icon} color={t.category.color} size={13} />
                        {t.category.name}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-400">{t.paymentMethod?.name ?? "—"}</td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-right font-medium text-slate-100">
                      {centsToBRL(t.amountCents)}
                    </td>
                    <td className="px-2 py-3 text-right">
                      <form action={deleteTransaction}>
                        <input type="hidden" name="id" value={t.id} />
                        <input type="hidden" name="year" value={year} />
                        <input type="hidden" name="month" value={month} />
                        <ConfirmSubmitButton message={`Excluir o lançamento "${t.description}"?`} />
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
