export type KaraokeMetricsExport = {
  totals: { totalLinks: number; workingLinks: number; unverifiedLinks: number; needsReviewLinks: number; workingRate: number };
  venues: Array<{ venueId: number; venueName: string; totalLinks: number; workingLinks: number; unverifiedLinks: number; needsReviewLinks: number; workingRate: number }>;
};

function escapeCsv(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function createKaraokeMetricsCsv(metrics: KaraokeMetricsExport) {
  const header = ["Local", "Enlaces guardados", "Funcionales", "Sin verificar", "Requieren revisión", "Proporción funcional (%)"];
  const rows = metrics.venues.map((venue) => [venue.venueName, venue.totalLinks, venue.workingLinks, venue.unverifiedLinks, venue.needsReviewLinks, venue.workingRate]);
  rows.push(["Total", metrics.totals.totalLinks, metrics.totals.workingLinks, metrics.totals.unverifiedLinks, metrics.totals.needsReviewLinks, metrics.totals.workingRate]);
  return [header, ...rows].map((row) => row.map(escapeCsv).join(",")).join("\n");
}

export function buildKaraokeMetricsFilename(date = new Date()) {
  return `songtap-salud-karaoke-${date.toISOString().slice(0, 10)}.csv`;
}
