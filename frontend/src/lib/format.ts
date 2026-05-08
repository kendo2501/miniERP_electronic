const VND = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 });

export function vnd(amount: number | string | null | undefined): string {
  const n = Number(amount ?? 0);
  return VND.format(n);
}
