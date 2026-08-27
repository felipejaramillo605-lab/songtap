# Auditoría técnica, rendimiento y seguridad — 27 de agosto de 2026

## Alcance y método

La revisión cubre el código de SongTap, sus dependencias de producción, cabeceras HTTP, autenticación, autorización por rol, aislamiento multi-tenant, almacenamiento de archivos y pruebas controladas contra el entorno propio. No incluye ataques destructivos, ingeniería social ni sistemas ajenos.

## Línea base inicial

La compilación inicial generó un paquete principal de cliente de **2,945 kB** sin comprimir (**687 kB** gzip), por encima del umbral de advertencia de Vite. El análisis de dependencias inicial reportó 42 avisos: 7 bajos, 30 moderados y 5 altos. Los avisos altos se concentraron en `xlsx`, `path-to-regexp`, `lodash` y `lodash-es`.

## Fuente externa consultada

Se evaluó [ExcelJS][1] como alternativa mantenida para crear libros XLSX en navegador, debido a que el paquete `xlsx` directo cuenta con avisos de alta severidad sin una corrección disponible desde el registro consultado. La documentación de ExcelJS confirma soporte para crear, escribir y descargar archivos XLSX, incluido uso en navegador.[2]

## Hallazgos y remediaciones

La auditoría combinó revisión de código, análisis del árbol de dependencias, pruebas de regresión y comprobaciones HTTP no destructivas sobre el entorno de SongTap. Por tanto, debe interpretarse como una **evaluación técnica controlada**, no como una certificación de seguridad independiente ni como un pentest de infraestructura externa.

| Área | Resultado inicial | Remediación aplicada | Estado verificado |
|---|---|---|---|
| Dependencias | 5 avisos altos, incluidos `xlsx` y el enrutamiento de Express | Se retiró `xlsx` y `streamdown`; se actualizó Express a 5.2.1 y Lodash a 4.18.1 | **Sin avisos altos** |
| Exportaciones | El paquete XLSX vulnerable estaba en rutas Owner y las celdas de texto podían interpretarse como fórmula | Se incorporó ExcelJS cargado bajo demanda y protección ante prefijos de fórmula en CSV/XLSX | **Corregido** |
| Rendimiento | Paquete inicial de 2,945 kB / 687 kB gzip | Carga diferida de rutas por rol, de gráficos y de exportaciones | Principal: 886 kB / 241 kB gzip |
| Callbacks programados | POST sin sesión devolvía 500 y podía revelar detalle operativo | Se normalizaron fallos de autenticación a 403 sin mensaje interno | **Corregido** |
| Cabeceras y entradas | Faltaban defensas de tipo MIME y aislamiento entre contextos | Se añadieron `nosniff`, COOP, CORP y respuestas JSON controladas para cuerpo inválido o sobredimensionado | **Corregido** |

La carga diferida reduce el paquete inicial en aproximadamente **2,059 kB (69.9%)** y **446 kB gzip (64.9%)**. Las bibliotecas de mayor peso restante se descargan solo al abrir módulos que las requieren: gráficos, PDF, inventario y Excel. La migración de exportación mantiene los libros con hojas, filtros y anchos de columna, sin incorporar el parser legado en el inicio de la aplicación.

## Pruebas controladas ejecutadas

| Control | Resultado |
|---|---|
| Consulta Owner sin sesión | `403` |
| Archivo privado bajo `/manus-storage/private/` | `403` |
| Callbacks de reportes y caducidades sin sesión | `403` |
| JSON malformado | `400` genérico |
| Cuerpo de 9 MB frente a límite de 8 MB | `413` genérico |
| Cabeceras de producción | CSP, `X-Content-Type-Options`, COOP, CORP y `X-Frame-Options` presentes |
| Suite y compilación | 55 archivos de prueba / 225 pruebas aprobadas; TypeScript y build correctos |

También se revisaron controles ya presentes: cookies `httpOnly` y `SameSite=Lax`, invalidación de sesiones mediante `sessionVersion`, no exposición de hashes/tokens en respuestas de usuario, procedimientos tRPC protegidos por rol y bloqueo del proxy público para CV privados. La arquitectura de permisos debe seguir comprobando `venueId` en cada procedimiento de datos; las pruebas de regresión existentes cubren flujos relevantes de aislamiento, pero no sustituyen una revisión externa con credenciales de prueba de cada rol.

## Riesgo residual y recomendaciones

El análisis final del registro reporta **un aviso moderado**, transitivo de `exceljs` hacia `uuid` 8.3.2, relacionado con el uso de buffers por la librería. SongTap no expone ese parámetro ni usa UUID controlados por clientes en su exportación, por lo que el riesgo de explotación en este flujo es bajo; aun así, debe vigilarse una actualización de ExcelJS que eleve esa dependencia a la versión corregida. El proyecto mantiene además un aviso de compatibilidad de `vite-plugin-jsx-loc` con Vite 7 y dependencias de desarrollo deprecadas, que conviene tratar en una actualización de tooling separada.

> Las validaciones controladas confirmaron controles de aplicación. No evaluaron configuración de DNS, WAF, S3/IAM de la cuenta de producción, seguridad de CI/CD ni pruebas humanas de ingeniería social. Estos dominios requieren acceso y alcance explícito adicionales.

Las siguientes prioridades recomendadas son implementar limitación distribuida de intentos para inicio/restablecimiento de contraseña, habilitar monitoreo automatizado de dependencias y planear la actualización de `recharts` 2 a 3 después de probar la compatibilidad de los gráficos.

## Referencias

[1]: https://github.com/exceljs/exceljs "ExcelJS en GitHub"
[2]: https://github.com/exceljs/exceljs/blob/master/README.md "Documentación de ExcelJS"
