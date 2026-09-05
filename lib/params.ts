export function resolveMonthParams(searchParams: { [key: string]: string | string[] | undefined }) {
  const now = new Date();
  const y = Number(Array.isArray(searchParams.y) ? searchParams.y[0] : searchParams.y);
  const m = Number(Array.isArray(searchParams.m) ? searchParams.m[0] : searchParams.m);
  const year = Number.isFinite(y) && y > 2000 ? y : now.getFullYear();
  const month = Number.isFinite(m) && m >= 1 && m <= 12 ? m : now.getMonth() + 1;
  return { year, month };
}
