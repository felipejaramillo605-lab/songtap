export const HELP_ARTICLE_KEYS = [
  "access-denied",
  "missing-order-or-table",
  "invalid-qr",
  "cannot-save-change",
  "missing-report-or-notification",
  "menu-and-availability",
  "team-and-activities",
  "order-status-and-inventory",
  "inventory-stock-and-recipes",
  "inventory-purchase-and-expiry",
  "inventory-physical-count",
  "inventory-dual-approval",
  "music-queue-and-now-playing",
  "karaoke-links-and-history",
  "pqrs-and-sla",
  "venue-and-qr-setup",
  "reports-and-audit",
  "profile-security-and-theme",
] as const;

export type HelpArticleKey = (typeof HELP_ARTICLE_KEYS)[number];

export function isHelpArticleKey(value: string): value is HelpArticleKey {
  return HELP_ARTICLE_KEYS.includes(value as HelpArticleKey);
}
