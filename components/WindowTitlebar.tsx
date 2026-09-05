"use client";

import { usePathname } from "next/navigation";
import { configNav, mainNav } from "@/lib/nav";

const ALL_ITEMS = [...mainNav, ...configNav];

function currentTitle(pathname: string): string {
  const item = ALL_ITEMS.find((i) => i.href === pathname);
  return item ? item.label : "Line Finance";
}

export function WindowTitlebar() {
  const pathname = usePathname();
  return (
    <span className="pointer-events-none absolute inset-x-0 text-center text-[13px] font-medium text-slate-400">
      {currentTitle(pathname)}
    </span>
  );
}
