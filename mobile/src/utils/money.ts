export function parseMoney(value: string | number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

export function formatMoney(value: string | number, currency = "RWF"): string {
  const n = parseMoney(value);
  const formatted = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: n % 1 === 0 ? 0 : 2,
  }).format(n);
  return `${formatted} ${currency}`;
}

export function formatMoneyShort(value: string | number, currency = "RWF"): string {
  const n = parseMoney(value);
  const abs = Math.abs(n);
  let formatted: string;
  if (abs >= 1_000_000) {
    formatted = `${(n / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  } else if (abs >= 1_000) {
    formatted = `${(n / 1_000).toFixed(abs >= 100_000 ? 0 : 1)}k`;
  } else {
    formatted = `${n}`;
  }
  return `${formatted} ${currency}`;
}

export function moneyToNumber(value: string): number {
  const cleaned = value.replace(/[^\d.-]/g, "");
  return Number(cleaned) || 0;
}

export function addMoney(a: string | number, b: string | number): string {
  return (parseMoney(a) + parseMoney(b)).toFixed(2);
}

export function subMoney(a: string | number, b: string | number): string {
  return (parseMoney(a) - parseMoney(b)).toFixed(2);
}