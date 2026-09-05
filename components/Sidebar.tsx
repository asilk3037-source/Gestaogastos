"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { configNav, mainNav, type NavItem } from "@/lib/nav";

function NavIcon({ item }: { item: NavItem }) {
  const Icon = item.icon;
  return (
    <span
      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px] text-white"
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
    <aside className="hidden w-60 shrink-0 flex-col border-r border-base-border bg-base-850 px-3 py-4 lg:flex">
      <div className="mb-2 flex items-center gap-2 px-2 pb-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-b from-brand-light to-brand text-[13px] font-semibold text-white">
          L
        </div>
        <p className="text-[13px] font-semibold text-slate-100">Line Finance</p>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
        {mainNav.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={withQuery(item.href)}
              className={`flex items-center gap-2.5 rounded-[7px] px-2 py-[7px] text-[13px] transition-colors ${
                active ? "bg-brand text-white font-medium" : "text-slate-200 hover:bg-base-800"
              }`}
            >
              <NavIcon item={item} />
              {item.label}
            </Link>
          );
        })}

        <p className="mb-1 mt-5 px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          Configurações
        </p>
        {configNav.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 rounded-[7px] px-2 py-[7px] text-[13px] transition-colors ${
                active ? "bg-brand text-white font-medium" : "text-slate-200 hover:bg-base-800"
              }`}
            >
              <NavIcon item={item} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <p className="px-2 pt-4 text-[11px] italic text-slate-500">“Disciplina hoje, liberdade amanhã.”</p>
    </aside>
  );
}
