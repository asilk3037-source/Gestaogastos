import { Plus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { Card, Button } from "@/components/ui";
import { CategoryIcon, CATEGORY_ICON_OPTIONS } from "@/components/CategoryIcon";
import { ConfirmSubmitButton } from "@/components/ConfirmSubmitButton";
import { centsToBRL } from "@/lib/format";
import { getCurrentUser, listCategories } from "@/lib/queries";
import { createCategory, deactivateCategory } from "@/lib/actions";

const PALETTE = ["#0a84ff", "#5e5cd6", "#bf5af2", "#32ade6", "#30d158", "#ff9f0a", "#ff375f", "#8e8e93"];

export default async function CategoriasPage() {
  const user = await getCurrentUser();
  const categories = await listCategories(user.id);

  return (
    <AppShell>
      <PageHeader title="Categorias" subtitle="Tetos padrão usados ao abrir uma nova competência." />

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <Card>
          <h2 className="mb-4 text-base font-semibold text-slate-100">+ Nova categoria</h2>
          <form action={createCategory} className="space-y-3">
            <div>
              <label className="field-label" htmlFor="name">Nome</label>
              <input className="field-input" id="name" name="name" placeholder="Ex: Educação" required />
            </div>
            <div>
              <label className="field-label" htmlFor="defaultLimit">Teto padrão (R$)</label>
              <input className="field-input" inputMode="decimal" id="defaultLimit" name="defaultLimit" placeholder="0,00" />
            </div>
            <div>
              <span className="field-label">Ícone</span>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_ICON_OPTIONS.map((icon) => (
                  <label key={icon} className="cursor-pointer">
                    <input type="radio" name="icon" value={icon} className="peer sr-only" defaultChecked={icon === "tag"} />
                    <span className="block rounded-lg p-1 peer-checked:ring-2 peer-checked:ring-brand">
                      <CategoryIcon icon={icon} />
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <span className="field-label">Cor</span>
              <div className="flex flex-wrap gap-2">
                {PALETTE.map((color) => (
                  <label key={color} className="cursor-pointer">
                    <input type="radio" name="color" value={color} className="peer sr-only" defaultChecked={color === "#0a84ff"} />
                    <span
                      className="block h-7 w-7 rounded-full ring-offset-2 ring-offset-base-900 peer-checked:ring-2"
                      style={{ backgroundColor: color, "--tw-ring-color": color } as React.CSSProperties}
                    />
                  </label>
                ))}
              </div>
            </div>
            <Button type="submit" className="w-full justify-center">
              <Plus size={16} /> Adicionar categoria
            </Button>
          </form>
        </Card>

        <Card className="!p-0 overflow-hidden">
          <div className="p-4 sm:p-5">
            <h2 className="text-base font-semibold text-slate-100">Categorias cadastradas</h2>
          </div>
          <ul className="divide-y divide-base-border/60">
            {categories.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 px-5 py-3">
                <span className="flex items-center gap-3">
                  <CategoryIcon icon={c.icon} color={c.color} />
                  <span className={c.active ? "text-slate-100" : "text-slate-500 line-through"}>{c.name}</span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="text-sm text-slate-400">{centsToBRL(c.defaultLimitCents)}</span>
                  {c.active && (
                    <form action={deactivateCategory}>
                      <input type="hidden" name="id" value={c.id} />
                      <ConfirmSubmitButton message={`Desativar a categoria "${c.name}"?`} />
                    </form>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </AppShell>
  );
}
