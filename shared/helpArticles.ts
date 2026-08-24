export const HELP_ARTICLE_KEYS = [
  "access-denied",
  "missing-order-or-table",
  "invalid-qr",
  "cannot-save-change",
  "missing-report-or-notification",
] as const;

export type HelpArticleKey = (typeof HELP_ARTICLE_KEYS)[number];

export function isHelpArticleKey(value: string): value is HelpArticleKey {
  return HELP_ARTICLE_KEYS.includes(value as HelpArticleKey);
}
