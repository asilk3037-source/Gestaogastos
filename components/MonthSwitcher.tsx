"use client";

import { useRouter, usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { monthLabel, nextMonth, previousMonth } from "@/lib/finance";

export function MonthSwitcher({ year, month }: { year: number; month: number }) {
  const router = useRouter();
  const pathname = usePathname();

  const go = (y: number, m: number) => {
    router.push(`${pathname}?y=${y}&m=${m}`);
  };

  const prev = previousMonth(year, month);
  const next = nextMonth(year, month);

  return (
    <div className="flex items-center gap-1 rounded-full border border-base-border bg-base-900 px-2 py-1.5 text-sm">
      <button
        aria-label="Mês anterior"
        onClick={() => go(prev.year, prev.month)}
        className="rounded-full p-1.5 text-slate-400 hover:bg-base-800 hover:text-slate-100"
      >
        <ChevronLeft size={16} />
      </button>
      <span className="flex items-center gap-1.5 px-1 font-medium text-slate-100 whitespace-nowrap">
        <Calendar size={14} className="text-brand-light" />
        {monthLabel(year, month)}
      </span>
      <button
        aria-label="Próximo mês"
        onClick={() => go(next.year, next.month)}
        className="rounded-full p-1.5 text-slate-400 hover:bg-base-800 hover:text-slate-100"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
