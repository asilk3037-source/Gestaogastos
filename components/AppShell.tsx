import { Suspense } from "react";
import { Sidebar } from "@/components/Sidebar";
import { BottomNav } from "@/components/BottomNav";
import { WindowTitlebar } from "@/components/WindowTitlebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen lg:flex lg:items-start lg:justify-center lg:p-6">
      <div className="mx-auto flex min-h-screen w-full max-w-[1440px] flex-col overflow-hidden bg-base-900 lg:min-h-[calc(100vh-3rem)] lg:rounded-window lg:border lg:border-black/10 lg:shadow-window">
        {/* Titlebar — só no desktop, como a barra de título de um app Mac. */}
        <div className="relative hidden h-11 shrink-0 items-center border-b border-base-border bg-gradient-to-b from-[#f7f7f8] to-[#e9e9ec] px-4 lg:flex">
          <div className="flex items-center gap-2">
            <span className="traffic-dot bg-traffic-red" />
            <span className="traffic-dot bg-traffic-yellow" />
            <span className="traffic-dot bg-traffic-green" />
          </div>
          <Suspense fallback={null}>
            <WindowTitlebar />
          </Suspense>
        </div>

        <div className="flex min-h-0 flex-1">
          <Suspense fallback={<div className="hidden w-64 shrink-0 lg:block" />}>
            <Sidebar />
          </Suspense>
          <div className="flex min-w-0 flex-1 flex-col">
            <main className="flex-1 px-5 pb-28 pt-6 sm:px-7 lg:pb-12 lg:pl-6 lg:pr-10 lg:pt-9">{children}</main>
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
