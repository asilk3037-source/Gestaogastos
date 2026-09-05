import { CreditCard, Plus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { Card, Button } from "@/components/ui";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { getCurrentUser, listPaymentMethods } from "@/lib/queries";
import { createPaymentMethod, deactivatePaymentMethod } from "@/lib/actions";

const TYPES = [
  { value: "credito", label: "Cartão de crédito" },
  { value: "debito", label: "Cartão de débito" },
  { value: "pix", label: "Pix" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "outro", label: "Outro" },
];

export default async function ContasPage() {
  const user = await getCurrentUser();
  const methods = await listPaymentMethods(user.id);

  return (
    <AppShell>
      <PageHeader title="Contas e formas de pagamento" subtitle="O cartão inicial ativo no planejamento é o 0283 — outros meios não entram automaticamente." />

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <Card>
          <h2 className="mb-4 text-base font-semibold text-white">+ Nova forma de pagamento</h2>
          <form action={createPaymentMethod} className="space-y-3">
            <div>
              <label className="field-label" htmlFor="name">Nome</label>
              <input className="field-input" id="name" name="name" placeholder="Ex: Cartão final 1234" required />
            </div>
            <div>
              <label className="field-label" htmlFor="type">Tipo</label>
              <select className="field-select" id="type" name="type">
                {TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="cardLast4">Últimos 4 dígitos (se cartão)</label>
              <input className="field-input" id="cardLast4" name="cardLast4" maxLength={4} placeholder="0283" />
            </div>
            <Button type="submit" className="w-full justify-center">
              <Plus size={16} /> Adicionar
            </Button>
          </form>
        </Card>

        <Card className="!p-0 overflow-hidden">
          <div className="p-4 sm:p-5">
            <h2 className="text-base font-semibold text-white">Contas cadastradas</h2>
          </div>
          <ul className="divide-y divide-base-border/60">
            {methods.map((m) => (
              <li key={m.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <span className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/15 text-brand-light">
                    <CreditCard size={16} />
                  </span>
                  <span>
                    <span className={`block ${m.active ? "text-slate-100" : "text-slate-500 line-through"}`}>
                      {m.name} {m.isPrimary && <span className="ml-1 text-xs text-brand-light">(principal)</span>}
                    </span>
                    <span className="text-xs text-slate-500">{TYPES.find((t) => t.value === m.type)?.label ?? m.type}</span>
                  </span>
                </span>
                {m.active && !m.isPrimary && (
                  <form action={deactivatePaymentMethod}>
                    <input type="hidden" name="id" value={m.id} />
                    <ConfirmSubmitButton message={`Desativar "${m.name}"?`} />
                  </form>
                )}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </AppShell>
  );
}
