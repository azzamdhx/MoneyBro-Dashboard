/**
 * Menghitung relative luminance dari hex color.
 * Menggunakan formula WCAG 2.0.
 */
function getLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const toLinear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/**
 * Menentukan apakah teks harus berwarna terang di atas background color tertentu.
 * Return true jika background gelap (butuh teks putih).
 */
export function shouldUseLightText(bgColor: string | null | undefined): boolean {
  if (!bgColor) return false;
  return getLuminance(bgColor) < 0.4;
}

/**
 * Mengembalikan className untuk teks yang kontras dengan background.
 * - Background gelap → teks putih (white + white/70)
 * - Background terang / tanpa background → teks default (tidak ada override)
 */
export function getContrastStyles(bgColor: string | null | undefined): {
  text: string;
  muted: string;
  bold: string;
} {
  if (shouldUseLightText(bgColor)) {
    return {
      text: "text-white",
      muted: "text-white/70",
      bold: "text-white",
    };
  }
  return {
    text: "",
    muted: "text-muted-foreground",
    bold: "",
  };
}
