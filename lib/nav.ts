import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  CreditCard,
  HandCoins,
  LayoutDashboard,
  LayoutGrid,
  ListChecks,
  PiggyBank,
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
  /** Cor do "ícone de app" ao lado do item, como no Ajustes do Sistema (macOS). */
  color: string;
}

export const mainNav: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, color: "#0a84ff" },
  { href: "/lancamentos", label: "Lançamentos", icon: Receipt, color: "#30d158" },
  { href: "/planejamento", label: "Planejamento", icon: ListChecks, color: "#ff9f0a" },
  { href: "/parcelamentos", label: "Parcelamentos", icon: Repeat, color: "#bf5af2" },
  { href: "/despesas-fixas", label: "Despesas Fixas", icon: Wallet, color: "#ff375f" },
  { href: "/caixa", label: "Caixa", icon: PiggyBank, color: "#30d158" },
  { href: "/acertos", label: "Acertos", icon: HandCoins, color: "#ff9f0a" },
  { href: "/metas", label: "Metas", icon: Target, color: "#5e5cd6" },
  { href: "/relatorios", label: "Relatórios", icon: BarChart3, color: "#32ade6" },
];

export const configNav: NavItem[] = [
  { href: "/categorias", label: "Categorias", icon: LayoutGrid, color: "#8e8e93" },
  { href: "/contas", label: "Contas", icon: CreditCard, color: "#0a84ff" },
  { href: "/perfil", label: "Perfil", icon: User, color: "#68686d" },
];

export const mobileNav: NavItem[] = [
  { href: "/", label: "Início", icon: LayoutDashboard, color: "#0a84ff" },
  { href: "/lancamentos", label: "Lanç.", icon: Receipt, color: "#30d158" },
  { href: "/planejamento", label: "Planej.", icon: ListChecks, color: "#ff9f0a" },
  { href: "/parcelamentos", label: "Parcelas", icon: Repeat, color: "#bf5af2" },
  { href: "/mais", label: "Mais", icon: LayoutGrid, color: "#8e8e93" },
];
