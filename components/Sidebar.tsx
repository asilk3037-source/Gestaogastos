"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Wallet } from "lucide-react";
import { configNav, mainNav } from "@/lib/nav";

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const qs = searchParams.toString();

  const withQuery = (href: string) => (qs ? `${href}${href.includes("?") ? "&" : "?"}${qs}` : href);

  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-base-border bg-base-900/60 px-4 py-6">
      <div className="flex items-center gap-2 px-2 pb-8">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/20 text-brand-light">
          <Wallet size={20} />
        </div>
        <div className="leading-tight">
          <p className="text-[11px] uppercase tracking-wider text-slate-400">Line</p>
          <p className="font-semibold text-slate-50">Finance</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        {mainNav.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={withQuery(item.href)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                active
                  ? "bg-brand/15 text-brand-light font-medium"
                  : "text-slate-300 hover:bg-base-800 hover:text-white"
              }`}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}

        <p className="mt-6 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Configurações
        </p>
        {configNav.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
                active
                  ? "bg-brand/15 text-brand-light font-medium"
                  : "text-slate-300 hover:bg-base-800 hover:text-white"
              }`}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <p className="px-3 pt-4 text-xs italic text-slate-500">
        “Disciplina hoje, liberdade amanhã.”
      </p>
    </aside>
  );
}
