export type NotificationFilterItem = {
  title: string;
  content: string;
  createdAt: Date | string;
};

export type NotificationHistoryFilters = {
  query?: string;
  startDate?: string;
  endDate?: string;
};

export function filterNotificationHistory<T extends NotificationFilterItem>(
  notifications: T[],
  filters: NotificationHistoryFilters
): T[] {
  const query = filters.query?.trim().toLocaleLowerCase("es-CO") ?? "";
  const start = filters.startDate ? new Date(`${filters.startDate}T00:00:00`) : null;
  const end = filters.endDate ? new Date(`${filters.endDate}T23:59:59.999`) : null;

  return notifications.filter((notification) => {
    const createdAt = new Date(notification.createdAt);
    const searchableText = `${notification.title} ${notification.content}`.toLocaleLowerCase("es-CO");
    return (
      (!query || searchableText.includes(query)) &&
      (!start || createdAt >= start) &&
      (!end || createdAt <= end)
    );
  });
}
