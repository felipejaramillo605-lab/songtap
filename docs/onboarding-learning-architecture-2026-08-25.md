# Arquitectura ampliada de aprendizaje — SongTap

## Propósito

La guía de SongTap evoluciona de una introducción breve a una capa de aprendizaje operativo por rol. El recorrido inicial conserva su apertura única y su opción de no reaparecer automáticamente; la biblioteca permite volver a consultar procedimientos sin modificar el progreso del onboarding.

## Estructura por rol

| Rol | Enfoque de la biblioteca | Cobertura principal |
|---|---|---|
| Owner | Dirección, gobierno, seguridad y calidad | Reportes, locales, usuarios, auditoría, SLA y modo de pruebas |
| Manager | Preparación y control de un local | Configuración, menú, QR, equipo, compras, inventario, conteos y finanzas |
| Staff | Servicio de turno y ejecución | Pedidos, mesas, música, karaoke, actividades, PQRS y perfil |

Cada tutorial declara su módulo de destino, duración estimada, objetivos accionables y una advertencia operativa. La biblioteca permite buscar por términos, agrupa por área y ofrece dos acciones: **Añadir a ruta** para estudiarlo dentro del recorrido, o **Abrir módulo** para navegar directamente a la pantalla correspondiente.

## Biblioteca de ayuda

La ayuda conserva votación y favoritos por usuario y amplía sus artículos autorizados hacia menú, equipo, pedidos, inventario, compras, conteos físicos, aprobación dual, música, enlaces de karaoke, PQRS, QR, auditoría y perfil. Las claves de los artículos permanecen validadas en el servidor antes de guardar votos o favoritos.

## Garantías de experiencia

La guía se puede abrir manualmente, minimizar, ampliar, cerrar y reiniciar. Los flujos de modo de pruebas continúan siendo de solo lectura. Todos los botones conservan etiquetas accesibles y los módulos se usan con navegación interna, sin construir enlaces externos ni depender de datos de otro local.

## Validación

La ampliación incorpora pruebas para rutas completas, guía breve, búsqueda de tutoriales, incorporación de un tutorial de inventario, finalización, modo de pruebas, ayuda, favoritos, votos y validación de claves de artículos en backend. La suite final de esta entrega aprobó **208 pruebas** con TypeScript sin errores.
