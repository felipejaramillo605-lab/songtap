# Bloqueo temporal de inicio de sesión — 27 de agosto de 2026

## Política aplicada

SongTap limita el inicio de sesión local por contraseña a **diez fallos consecutivos por cuenta**. El décimo fallo bloquea temporalmente nuevos intentos durante **quince minutos**. El control se aplica únicamente al acceso por correo y contraseña; no altera el flujo federado ni revela una cuenta al recibir un correo inexistente.

| Evento | Resultado | Comunicación al usuario |
|---|---|---|
| Correo inexistente o contraseña incorrecta | Respuesta genérica y comparación de contraseña de duración equivalente | “No pudimos iniciar sesión con esos datos…” |
| Fallos 1–9 de una cuenta | Se incrementa el contador persistente | Mismo mensaje genérico |
| Fallo 10 | Contador en 10, fecha de desbloqueo y registro de auditoría | Aviso empático con tiempo aproximado y acceso a recuperación |
| Acceso correcto | Restablece contador y bloqueo | Inicio de sesión normal |
| Cambio o restablecimiento de contraseña | Restablece contador, bloqueo y sesiones previas | Flujo existente de actualización segura |

> “Para cuidar la seguridad de tu cuenta, pausamos temporalmente los intentos de acceso. Podrás intentarlo de nuevo en aproximadamente 15 minutos. Si necesitas ayuda, usa la recuperación de contraseña.”

El texto explica el objetivo de protección sin incluir el correo, nombre u otro dato de la cuenta. Los fallos previos responden de forma uniforme, incluyendo si el correo no existe, para reducir la enumeración de usuarios. OWASP recomienda combinar mensajes de autenticación genéricos con limitación de intentos y advierte que los bloqueos deben considerar el riesgo de denegación de servicio.[1] NIST también establece la limitación de intentos fallidos consecutivos como control de autenticación en línea.[2]

## Persistencia y trazabilidad

La migración `0043_remarkable_kylun.sql` añade `failedLoginAttempts` y `loginLockedUntil` a `users`. La operación de fallo reinicia el contador cuando el bloqueo anterior ya venció y registra `PASSWORD_LOGIN_TEMPORARILY_LOCKED` solo cuando se alcanza el umbral. No se registra la contraseña, el hash ni el texto ingresado.

La validación cubrió los nueve primeros fallos, el bloqueo en el décimo, la ausencia de cookie mientras dura el bloqueo, el desbloqueo al expirar y el reinicio tras un inicio válido o cambio de contraseña. La suite completa finalizó con **56 archivos de prueba y 228 pruebas aprobadas**, además de TypeScript y build de producción correctos.

## Referencias

[1]: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html "OWASP Authentication Cheat Sheet"
[2]: https://pages.nist.gov/800-63-4/sp800-63b.html "NIST SP 800-63B: Digital Identity Guidelines"
