"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { configNav, mainNav, type NavItem } from "@/lib/nav";

function NavIcon({ item }: { item: NavItem }) {
  const Icon = item.icon;
  return (
    <span
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] text-white"
      style={{ backgroundColor: item.color }}
    >
      <Icon size={14} strokeWidth={2.25} />
    </span>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const qs = searchParams.toString();

  const withQuery = (href: string) => (qs ? `${href}${href.includes("?") ? "&" : "?"}${qs}` : href);

  return (
    <aside className="hidden w-64 shrink-0 flex-col rounded-[26px] border border-base-border bg-base-850 px-4 py-5 shadow-card m-3 lg:flex">
      <div className="mb-4 flex items-center gap-2.5 px-2 pb-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-b from-brand-light to-brand text-[13px] font-semibold text-white">
          L
        </div>
        <p className="text-[13px] font-semibold text-slate-100">Line Finance</p>
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
        {mainNav.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={withQuery(item.href)}
              className={`flex items-center gap-3 rounded-xl px-2.5 py-2 text-[13px] transition-colors ${
                active ? "bg-brand text-white font-medium" : "text-slate-200 hover:bg-base-800"
              }`}
            >
              <NavIcon item={item} />
              {item.label}
            </Link>
          );
        })}

        <p className="mb-1.5 mt-6 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Configurações
        </p>
        {configNav.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-2.5 py-2 text-[13px] transition-colors ${
                active ? "bg-brand text-white font-medium" : "text-slate-200 hover:bg-base-800"
              }`}
            >
              <NavIcon item={item} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <p className="px-2.5 pt-5 text-[11px] italic text-slate-500">“Disciplina hoje, liberdade amanhã.”</p>
    </aside>
  );
}
