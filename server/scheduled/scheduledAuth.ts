import { HttpError } from "../../shared/_core/errors";

/** Mantiene una respuesta uniforme y no reveladora para callbacks internos. */
export function scheduledCallbackError(error: unknown) {
  if (error instanceof HttpError && error.statusCode >= 400 && error.statusCode < 500) {
    return { status: 403, body: { ok: false, error: "Cron authentication required" } } as const;
  }
  return { status: 500, body: { ok: false, error: "Internal scheduled task error" } } as const;
}
