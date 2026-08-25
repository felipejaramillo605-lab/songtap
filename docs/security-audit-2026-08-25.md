# Auditoría de seguridad controlada — SongTap

**Fecha:** 25 de agosto de 2026  
**Alcance:** aplicación SongTap, su API tRPC, sesiones, controles por rol y local, portal QR, cargas de archivos, cabeceras HTTP y dependencias de producción. Las pruebas se limitaron a registros temporales propios y consultas no destructivas; no se ejecutaron escaneos contra terceros, fuerza bruta ni acciones sobre datos operativos.

## Metodología y controles verificados

La revisión combinó análisis estático de routers, contexto de autenticación, cookies, almacenamiento y consultas ORM, con pruebas Vitest aisladas y solicitudes HTTP locales. Se comprobaron ataques de referencia directa por ID entre locales, escalamiento Staff–Manager, acceso QR cruzado, validación de entradas, exposición de metadatos internos de karaoke y controles del modo de pruebas Owner. Las pruebas existentes de aislamiento pasaron sin modificar datos persistentes fuera de sus fixtures temporales.

| Área | Prueba realizada | Resultado |
|---|---|---|
| RBAC y aislamiento multitenant | 22 regresiones de seguridad para Manager, Staff, Owner, IDs y sesiones QR | Validado; los accesos cruzados se rechazan. |
| Entrada no destructiva | Token QR con cadena de inyección de longitud válida | Rechazado como mesa inexistente, sin alterar consultas ni datos. |
| Cabeceras | Inspección HTTP del servidor en ejecución | CSP, `Referrer-Policy`, `Permissions-Policy`, `X-Frame-Options` y supresión de `X-Powered-By` presentes. |
| Sesiones y claves | Token de recuperación, cambio de clave y token de sesión previo | Validado: token hasheado y sesión previa revocada. |
| Suite de regresión | `pnpm test` y `tsc --noEmit` | **49 archivos / 190 pruebas aprobadas** y TypeScript sin errores. |

## Hallazgos corregidos

| Prioridad inicial | Hallazgo | Corrección aplicada | Estado |
|---|---|---|---|
| Crítica | `fast-xml-parser` vulnerable transitivamente desde el SDK AWS. | Actualización compatible de los paquetes AWS S3. | Corregido; la auditoría final no reporta vulnerabilidades críticas. |
| Alta | Respuestas de autenticación y listado de equipo podían incluir hash de contraseña, token de recuperación y versión de sesión. | Sanitización explícita de usuarios antes de cualquier respuesta de navegador. | Corregido y cubierto por regresión. |
| Alta | Recuperación basada en `Math.random`, token almacenado en claro y escrito en logs. | CSPRNG, hash SHA-256 persistido y eliminación de cualquier registro o devolución del token. | Corregido y cubierto por regresión. |
| Alta | Un cambio de contraseña no invalidaba sesiones anteriores. | Incremento atómico de `sessionVersion` en todos los flujos de cambio de clave. | Corregido y cubierto por regresión. |
| Media | Cookie de sesión con `SameSite=None`, cabeceras defensivas ausentes y cuerpos de hasta 50 MB. | `SameSite=Lax`, cabeceras defensivas y límite general de 8 MB; las cargas continúan limitadas a 5 MB. | Corregido. |
| Media | Era posible iniciar una sesión QR si la mesa seguía activa aunque el local estuviera inactivo. | Verificación del estado activo del local al iniciar sesión. | Corregido y cubierto por regresión. |
| Media | La carga de archivos confiaba en MIME/nombre aportados por el cliente. | Firmas binarias permitidas, nombres de clave generados por servidor, límite de entrada y extensiones derivadas del MIME validado. | Corregido y cubierto por regresión. |
| Media | Un CV podía conservar una URL de almacenamiento directamente accesible si se compartía. | CVs nuevos en espacio privado, proxy público bloqueado, referencia oculta en listados y URL S3 firmada tras comprobar titular, Manager del mismo local u Owner. | Corregido y cubierto por regresión. |

## Riesgos residuales y siguiente tratamiento

Los controles corregidos reducen los hallazgos verificables dentro del alcance, pero no eliminan la necesidad de operación segura continua. La auditoría de dependencias de producción terminó con **0 críticas, 5 altas, 30 moderadas y 7 bajas**. Las altas restantes no tienen una corrección compatible o publicada inmediata: `xlsx` carece de versión corregida y SongTap solo lo usa para exportar, no para analizar archivos de usuarios; `path-to-regexp` continúa anclado por Express 4; y los avisos de `lodash`/`lodash-es` exigen una versión futura no publicada y no existe uso de `_.template` en código SongTap. Deben vigilarse con cada actualización de dependencias y tratarse mediante migración planificada de Express y de la biblioteca de exportación.

| Riesgo residual | Impacto potencial | Tratamiento recomendado |
|---|---|---|
| Entrega de recuperación de contraseña | El token ya no se expone, pero el correo transaccional aún no está configurado. | Integrar proveedor transaccional, enviar enlace de un solo uso y habilitar el flujo público solo al completar pruebas. |
| Limitación de intentos de login/QR | Riesgo de automatización o consumo de recursos ante solicitudes repetidas. | Aplicar rate limiting en el borde o WAF con límites por IP y alertas; no usar contadores en memoria en Autoscale. |
| Sesiones de larga duración | Mayor ventana de exposición si se compromete un dispositivo. | Reducir duración para cuentas administrativas y ofrecer revocación global de sesiones fuera de las cuentas beta. |
| CVs heredados | CVs cargados antes de esta mejora conservan rutas públicas antiguas hasta que su titular los cargue de nuevo. | Solicitar la recarga desde Perfil; la interfaz ya advierte que el archivo debe migrarse para quedar protegido. |
| Dependencias restantes | Avisos altos sin corrección directa disponible. | Revisar semanalmente `pnpm audit --prod`, actualizar al publicarse fixes y probar la migración Express/XLSX en una rama. |

> **Conclusión:** las pruebas controladas confirmaron los controles de autorización por rol, aislamiento por local y sesiones QR incluidos en el alcance. Los hallazgos corregibles de mayor impacto fueron remediados y quedaron protegidos por regresiones automatizadas. Los riesgos residuales requieren decisiones de infraestructura o de proveedor y no deben considerarse cerrados sin el tratamiento indicado.
