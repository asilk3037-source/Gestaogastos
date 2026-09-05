import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui";
import { configNav, mainNav } from "@/lib/nav";

export default function MaisPage() {
  const items = [...mainNav.slice(3), ...configNav];

  return (
    <AppShell>
      <PageHeader title="Mais" subtitle="Todas as seções do sistema." />
      <Card className="!p-0 overflow-hidden lg:hidden">
        <ul className="divide-y divide-base-border/60">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link href={item.href} className="flex items-center justify-between px-5 py-3.5 text-sm text-slate-200">
                  <span className="flex items-center gap-3">
                    <Icon size={18} className="text-brand-light" />
                    {item.label}
                  </span>
                  <ChevronRight size={16} className="text-slate-500" />
                </Link>
              </li>
            );
          })}
        </ul>
      </Card>
      <p className="hidden text-sm text-slate-500 lg:block">
        Use o menu lateral para navegar entre as seções.
      </p>
    </AppShell>
  );
}
