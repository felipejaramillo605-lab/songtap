import type { User } from "../drizzle/schema";

type ClientSafeUser = Omit<User, "passwordHash" | "resetPasswordToken" | "resetPasswordExpires" | "sessionVersion">;

/**
 * Eliminar credenciales y material de sesión de cualquier respuesta que llegue al navegador.
 * El contexto del servidor conserva el registro completo para las comprobaciones de autorización.
 */
export function toClientSafeUser(user: User): ClientSafeUser {
  const { passwordHash, resetPasswordToken, resetPasswordExpires, sessionVersion, ...safeUser } = user;
  return safeUser;
}
