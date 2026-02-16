const MONTH_NAMES_LONG = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

const MONTH_NAMES_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des"
];

/**
 * Format a number with Indonesian-style dot separators (e.g. 1.000.000).
 * Deterministic — no locale dependency, safe for SSR.
 */
export function formatNumberID(value: number): string {
  const str = Math.floor(Math.abs(value)).toString();
  let result = "";
  for (let i = str.length - 1, count = 0; i >= 0; i--, count++) {
    if (count > 0 && count % 3 === 0) {
      result = "." + result;
    }
    result = str[i] + result;
  }
  return result;
}

/**
 * Format a date string or Date as "Januari 2025" (long month + year).
 * Deterministic — no locale dependency, safe for SSR.
 */
export function formatMonthYear(dateOrStr: string | Date): string {
  const date = typeof dateOrStr === "string" ? new Date(dateOrStr) : dateOrStr;
  return `${MONTH_NAMES_LONG[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * Format a date string or Date as "1 Januari 2025" (day + long month + year).
 * Deterministic — no locale dependency, safe for SSR.
 */
export function formatDateID(dateOrStr: string | Date): string {
  const date = typeof dateOrStr === "string" ? new Date(dateOrStr) : dateOrStr;
  return `${date.getDate()} ${MONTH_NAMES_LONG[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * Format a date string or Date as "1 Jan 2025" (day + short month + year).
 * Deterministic — no locale dependency, safe for SSR.
 */
export function formatDateShortID(dateOrStr: string | Date): string {
  const date = typeof dateOrStr === "string" ? new Date(dateOrStr) : dateOrStr;
  return `${date.getDate()} ${MONTH_NAMES_SHORT[date.getMonth()]} ${date.getFullYear()}`;
}

/**
 * Convert a date string to RFC3339Nano format for GraphQL API.
 * Accepts YYYY-MM, YYYY-MM-DD, or full ISO strings.
 */
export function toRFC3339(dateStr: string): string {
  if (/^\d{4}-\d{2}$/.test(dateStr)) {
    return `${dateStr}-01T00:00:00.000Z`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return `${dateStr}T00:00:00.000Z`;
  }
  return new Date(dateStr).toISOString();
}
