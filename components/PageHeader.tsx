import type { ReactNode } from "react";
import { MonthSwitcher } from "@/components/MonthSwitcher";

export function PageHeader({
  title,
  subtitle,
  year,
  month,
  actions,
}: {
  title: string;
  subtitle?: string;
  year?: number;
  month?: number;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold text-slate-100 sm:text-2xl">{title}</h1>
        {subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {year != null && month != null && <MonthSwitcher year={year} month={month} />}
        {actions}
      </div>
    </div>
  );
}
