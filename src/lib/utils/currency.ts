import { formatNumberID } from "./format";

export function formatIDR(amount: number): string {
  const formatted = formatNumberID(Math.abs(amount));
  return amount < 0 ? `-Rp${formatted}` : `Rp${formatted}`;
}

export function formatCompact(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `Rp ${(amount / 1_000_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000_000) {
    return `Rp ${(amount / 1_000_000).toFixed(1)}jt`;
  }
  if (amount >= 1_000) {
    return `Rp ${(amount / 1_000).toFixed(0)}rb`;
  }
  return formatIDR(amount);
}
