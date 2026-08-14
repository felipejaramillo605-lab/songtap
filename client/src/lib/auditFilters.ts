export type AuditFilterRecord = {
  venueId: number | null;
  module: string | null;
  userId: number | null;
};

export type AuditFilters = {
  company: string;
  module: string;
  user: string;
};

export function filterAuditLogs<T extends AuditFilterRecord>(logs: T[], filters: AuditFilters): T[] {
  return logs.filter((log) => {
    const companyKey = log.venueId ? String(log.venueId) : "global";
    const moduleName = log.module || "Sistema";
    const executorKey = String(log.userId ?? "unknown");

    return (
      (filters.company === "all" || companyKey === filters.company) &&
      (filters.module === "all" || moduleName === filters.module) &&
      (filters.user === "all" || executorKey === filters.user)
    );
  });
}
