import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import type { AlertLevel } from "@/lib/finance";

export function Card({
  children,
  className = "",
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { children: ReactNode; className?: string }) {
  return (
    <div className={`card ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function StatCard({
  icon: Icon,
  iconColor,
  label,
  value,
  trend,
}: {
  icon: LucideIcon;
  iconColor: string;
  label: string;
  value: string;
  trend?: { label: string; positive: boolean };
}) {
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span
          className="flex h-10 w-10 items-center justify-center rounded-2xl"
          style={{ backgroundColor: `${iconColor}22`, color: iconColor }}
        >
          <Icon size={18} />
        </span>
        <span className="text-sm text-slate-400">{label}</span>
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-2xl font-semibold text-slate-100 sm:text-[26px]">{value}</span>
        {trend && (
          <span className={`text-xs font-medium ${trend.positive ? "text-good" : "text-bad"}`}>
            {trend.label}
          </span>
        )}
      </div>
    </Card>
  );
}

const ALERT_COLORS: Record<AlertLevel, string> = {
  normal: "#0a84ff",
  atencao: "#ff9f0a",
  atingido: "#ff6d00",
  excedido: "#ff3b30",
};

export function alertColor(level: AlertLevel): string {
  return ALERT_COLORS[level];
}

export function ProgressBar({
  percent,
  color,
}: {
  percent: number;
  color?: string;
}) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className="progress-track">
      <div
        className="progress-fill"
        style={{ width: `${clamped}%`, backgroundColor: color ?? "#0a84ff" }}
      />
    </div>
  );
}

export function AlertBadge({ level, children }: { level: AlertLevel; children: ReactNode }) {
  const styles: Record<AlertLevel, string> = {
    normal: "bg-brand-soft/40 text-brand-light",
    atencao: "bg-warn/15 text-warn",
    atingido: "bg-orange-500/15 text-orange-600",
    excedido: "bg-bad/15 text-bad",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${styles[level]}`}>
      {children}
    </span>
  );
}

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }) {
  const base = "inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors";
  const variants = {
    primary: "bg-brand text-white hover:bg-brand-dark",
    ghost: "border border-base-border text-slate-200 hover:bg-base-800",
    danger: "text-bad hover:bg-bad/10",
  };
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 rounded-2xl border border-dashed border-base-border py-10 text-center">
      <p className="font-medium text-slate-300">{title}</p>
      {description && <p className="max-w-xs text-sm text-slate-500">{description}</p>}
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-base font-semibold text-slate-100">{children}</h2>
      {action}
    </div>
  );
}
