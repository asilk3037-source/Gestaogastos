"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { mobileNav } from "@/lib/nav";

/** Barra inferior mobile em forma de Dock do macOS: flutuante, translúcida,
 * com "ícones de app" coloridos e o item ativo levemente maior. */
export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-3 z-40 flex justify-center px-3 lg:hidden">
      <div className="flex items-end gap-2.5 rounded-[26px] border border-white/60 bg-white/80 px-4 py-2.5 shadow-dock backdrop-blur-xl">
        {mobileNav.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-1 rounded-2xl px-1.5 pt-0.5 text-[10px] font-medium text-slate-400 transition-transform active:scale-95"
            >
              <span
                className="flex items-center justify-center rounded-2xl text-white shadow-sm transition-all"
                style={{
                  backgroundColor: item.color,
                  width: active ? 40 : 34,
                  height: active ? 40 : 34,
                  marginBottom: active ? 4 : 0,
                }}
              >
                <Icon size={active ? 19 : 16} strokeWidth={2.25} />
              </span>
              <span className={active ? "text-slate-100" : ""}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
