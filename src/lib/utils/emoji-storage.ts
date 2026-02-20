type EmojiCategory = "installment" | "debt" | "savings";

function storageKey(category: EmojiCategory): string {
  return `${category}-emojis`;
}

function getAll(category: EmojiCategory): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(storageKey(category));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getEmoji(category: EmojiCategory, id: string): string {
  return getAll(category)[id] || "";
}

export function setEmoji(category: EmojiCategory, id: string, emoji: string): void {
  const all = getAll(category);
  all[id] = emoji;
  localStorage.setItem(storageKey(category), JSON.stringify(all));
}

export const getInstallmentEmoji = (id: string) => getEmoji("installment", id);
export const setInstallmentEmoji = (id: string, emoji: string) => setEmoji("installment", id, emoji);
export const getDebtEmoji = (id: string) => getEmoji("debt", id);
export const setDebtEmoji = (id: string, emoji: string) => setEmoji("debt", id, emoji);
export const getSavingsEmoji = (id: string) => getEmoji("savings", id);
export const setSavingsEmoji = (id: string, emoji: string) => setEmoji("savings", id, emoji);
