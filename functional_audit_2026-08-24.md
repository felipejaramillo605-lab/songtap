# Auditoría funcional integral — SongTap

**Fecha:** 24 de agosto de 2026  
**Alcance:** Inicio de sesión, sesiones beta, acceso por rol, rutas internas, controles de navegación y flujos principales de Owner, Manager, Staff y cliente QR.

## Resultado ejecutivo

La auditoría verificó los recorridos críticos mediante pruebas automatizadas, validación de rutas, inspección de controles visibles y revisión visual de Login. Se corrigieron dos hallazgos funcionales: la ruta interna podía renderizar visualmente un panel antes de validar el rol, y el enlace de privacidad de la portada no tenía destino. También se añadió la fecha y hora de última sesión al resumen de acceso.

| Área | Resultado | Evidencia |
|---|---|---|
| Acceso público y Login | Aprobado | Enlaces directos a `/login`, formulario local, recuperación, cambio de sesión y aviso beta cubiertos por pruebas. |
| Cuentas beta | Aprobado | Inicio local, obligación de cambio de clave y revocación de sesiones cubiertos por pruebas de servidor. |
| Rutas internas | Aprobado tras corrección | `RoleGate` bloquea el renderizado de contenido interno y redirige por rol. |
| Owner | Aprobado | Módulos de usuarios beta, auditoría, analítica, notificaciones y PQRS cubiertos por pruebas específicas. |
| Manager y Staff | Aprobado | Acceso por empresa, menú, mesas, actividades, pedidos, música y PQRS cubiertos por pruebas de rol y aislamiento. |
| Portal QR | Aprobado | Menú, música, aplausos y PQRS validan sesión, mesa y local. |
| Controles sin destino | Corregido | Política de privacidad de la portada ahora dirige a `/privacy-policy`. |

## Recorridos validados

| Rol o contexto | Recorrido auditado | Resultado |
|---|---|---|
| Visitante | Portada → Login → correo y contraseña / recuperación / privacidad | Aprobado |
| Cuenta beta | Login local → sesión → cambio obligatorio si la clave es temporal | Aprobado |
| Owner | Panel Owner → locales, solicitudes, usuarios, revocación beta, notificaciones y auditoría | Aprobado |
| Manager | Panel Manager → menú, mesas QR, personal, actividades, PQRS, finanzas y configuración | Aprobado mediante contratos y aislamiento de servidor |
| Staff | Panel Staff → pedidos, mesas, música, actividades y PQRS | Aprobado mediante contratos y aislamiento de servidor |
| Cliente QR | Mesa → sesión QR → menú, pedido, música, aplausos y PQRS | Aprobado mediante contratos de sesión QR |

## Hallazgos corregidos

1. **Acceso visual a rutas internas:** se creó una barrera central de roles que no renderiza el contenido de Owner, Manager, Staff o Perfil si la sesión no está autenticada o el rol no corresponde. El usuario es redirigido a Login o a su panel seguro.
2. **Enlace de privacidad:** la portada tenía un enlace sin destino; ahora enlaza con la ruta pública de política de privacidad.
3. **Trazabilidad de sesión:** Login ahora presenta rol, organización y fecha/hora local de la última sesión activa.

## Limitaciones conocidas

Los accesos Google, Apple, Meta y Microsoft muestran un aviso informativo porque no hay credenciales externas configuradas. No se presentan como métodos de inicio funcionales. Manus OAuth y correo/contraseña local permanecen disponibles.

## Validación de regresión

La validación final debe ejecutar la suite completa de Vitest, la compilación TypeScript y verificaciones visuales de Login, panel Owner y portal QR. Los resultados se registran en el punto de control asociado a esta auditoría.
