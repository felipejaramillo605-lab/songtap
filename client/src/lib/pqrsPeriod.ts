export function getPreviousPqrsPeriod(dateFrom: Date, dateTo: Date) {
  const durationMs = dateTo.getTime() - dateFrom.getTime() + 1;
  const previousDateTo = new Date(dateFrom.getTime() - 1);
  const previousDateFrom = new Date(previousDateTo.getTime() - durationMs + 1);
  return { dateFrom: previousDateFrom, dateTo: previousDateTo };
}
