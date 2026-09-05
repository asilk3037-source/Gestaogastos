import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  CreditCard,
  LayoutDashboard,
  LayoutGrid,
  ListChecks,
  Receipt,
  Repeat,
  Target,
  User,
  Wallet,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const mainNav: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/lancamentos", label: "Lançamentos", icon: Receipt },
  { href: "/planejamento", label: "Planejamento", icon: ListChecks },
  { href: "/parcelamentos", label: "Parcelamentos", icon: Repeat },
  { href: "/despesas-fixas", label: "Despesas Fixas", icon: Wallet },
  { href: "/metas", label: "Metas", icon: Target },
  { href: "/relatorios", label: "Relatórios", icon: BarChart3 },
];

export const configNav: NavItem[] = [
  { href: "/categorias", label: "Categorias", icon: LayoutGrid },
  { href: "/contas", label: "Contas", icon: CreditCard },
  { href: "/perfil", label: "Perfil", icon: User },
];

export const mobileNav: NavItem[] = [
  { href: "/", label: "Início", icon: LayoutDashboard },
  { href: "/lancamentos", label: "Lanç.", icon: Receipt },
  { href: "/planejamento", label: "Planej.", icon: ListChecks },
  { href: "/parcelamentos", label: "Parcelas", icon: Repeat },
  { href: "/mais", label: "Mais", icon: LayoutGrid },
];
