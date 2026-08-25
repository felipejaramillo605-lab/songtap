import type { User } from "../drizzle/schema";

type ClientSafeUser = Omit<User, "passwordHash" | "resetPasswordToken" | "resetPasswordExpires" | "sessionVersion">;
type TeamSafeUser = Omit<ClientSafeUser, "cvUrl"> & { hasCv: boolean };

/**
 * Eliminar credenciales y material de sesión de cualquier respuesta que llegue al navegador.
 * El contexto del servidor conserva el registro completo para las comprobaciones de autorización.
 */
export function toClientSafeUser(user: User): ClientSafeUser {
  const { passwordHash, resetPasswordToken, resetPasswordExpires, sessionVersion, ...safeUser } = user;
  return safeUser;
}

/** Evita divulgar la referencia de almacenamiento de un CV en listados de equipo. */
export function toTeamSafeUser(user: User): TeamSafeUser {
  const safeUser = toClientSafeUser(user);
  const { cvUrl, ...teamUser } = safeUser;
  return { ...teamUser, hasCv: Boolean(cvUrl) };
}
