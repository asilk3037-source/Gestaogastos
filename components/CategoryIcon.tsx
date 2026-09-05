import {
  Car,
  Utensils,
  CreditCard,
  Gamepad2,
  PawPrint,
  ShoppingBag,
  Tag,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  car: Car,
  utensils: Utensils,
  "credit-card": CreditCard,
  gamepad: Gamepad2,
  paw: PawPrint,
  "shopping-bag": ShoppingBag,
  tag: Tag,
};

export function CategoryIcon({
  icon,
  color,
  size = 18,
  className = "",
}: {
  icon: string;
  color?: string;
  size?: number;
  className?: string;
}) {
  const Icon = ICONS[icon] ?? Tag;
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-lg ${className}`}
      style={{
        width: size + 16,
        height: size + 16,
        color: color ?? "#8b5cf6",
        backgroundColor: `${color ?? "#8b5cf6"}22`,
      }}
    >
      <Icon size={size} />
    </span>
  );
}

export const CATEGORY_ICON_OPTIONS = Object.keys(ICONS);
