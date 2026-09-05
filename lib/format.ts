export function centsToBRL(cents: number | null | undefined): string {
  if (cents == null) return "—";
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function centsToSignedBRL(cents: number): string {
  const formatted = centsToBRL(Math.abs(cents));
  return cents < 0 ? `-${formatted}` : formatted;
}

export function brlToCents(value: string | number): number {
  if (typeof value === "number") return Math.round(value * 100);
  const normalized = value.replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "");
  const parsed = parseFloat(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

export function percentLabel(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${Math.round(value)}%`;
}
