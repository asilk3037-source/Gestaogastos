import { Download, User as UserIcon } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { Card, Button, SectionTitle } from "@/components/ui";
import { getCurrentUser } from "@/lib/queries";
import { updateProfile } from "@/lib/actions";

export default async function PerfilPage() {
  const user = await getCurrentUser();

  return (
    <AppShell>
      <PageHeader title="Perfil" subtitle="Dados da conta e backup dos seus dados." />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle>Dados pessoais</SectionTitle>
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand/15 text-brand-light">
              <UserIcon size={22} />
            </span>
            <div>
              <p className="font-medium text-slate-100">{user.name}</p>
              <p className="text-sm text-slate-500">{user.email ?? "sem e-mail cadastrado"}</p>
            </div>
          </div>
          <form action={updateProfile} className="space-y-3">
            <div>
              <label className="field-label" htmlFor="name">Nome</label>
              <input className="field-input" id="name" name="name" defaultValue={user.name} required />
            </div>
            <Button type="submit">Salvar</Button>
          </form>
        </Card>

        <Card>
          <SectionTitle>Backup e exportação</SectionTitle>
          <p className="mb-4 text-sm text-slate-400">
            Baixe todos os seus dados (meses, categorias, lançamentos, parcelamentos e despesas fixas) em
            formato JSON legível, a qualquer momento.
          </p>
          <a href="/api/export" download>
            <Button variant="ghost">
              <Download size={16} /> Exportar dados (JSON)
            </Button>
          </a>
          <p className="mt-4 text-xs text-slate-500">
            Moeda: {user.currency} · Conta criada em {new Date(user.createdAt).toLocaleDateString("pt-BR")}
          </p>
        </Card>
      </div>
    </AppShell>
  );
}
