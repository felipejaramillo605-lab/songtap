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

## Administración Owner y búsqueda asistida

El Owner cuenta con la ruta **Panel Owner → Guías** para crear, editar, publicar, ocultar y eliminar tutoriales o artículos de ayuda administrados. Cada contenido define clave única, tipo, categoría, audiencia, resumen, instrucciones, ruta interna opcional, duración y orden. Las mutaciones se restringen al rol Owner, se bloquean durante modo de pruebas y se registran en Auditoría con el módulo **Guías**.

Los contenidos activos se entregan solo a los roles definidos. Los tutoriales se incorporan a la biblioteca operativa; los artículos se muestran en la pestaña de ayuda. La búsqueda de la biblioteca combina coincidencias locales con sugerencias persistidas y presenta autocompletado accesible para temas específicos. La migración `0040_smooth_penance.sql` agrega la tabla `guide_contents` sin modificar el historial de onboarding ni las interacciones existentes.

La validación final de la administración y búsqueda aprobó **214 pruebas** con TypeScript sin errores.

## Editor visual y priorización de contenido faltante

El panel **Owner → Guías** incluye ahora un editor enriquecido basado en un subconjunto seguro de Markdown: títulos, listas, énfasis, enlaces internos e imágenes. No se interpreta HTML arbitrario. Las imágenes se aceptan solo en JPEG, PNG o WEBP, con firma verificada, tamaño máximo de 4 MB y almacenamiento gestionado bajo el prefijo `guides/`. Cada carga queda registrada en Auditoría y aparece en la galería del panel para su reutilización visual.

La biblioteca y los artículos publicados interpretan el mismo formato seguro y muestran imágenes solamente desde el almacenamiento administrado de SongTap. Las consultas de guías que no obtienen tutoriales ni sugerencias se registran de forma agregada por término normalizado y rol; no se almacena una identidad de quien buscó. Owner puede revisar la frecuencia, el último registro y crear directamente un artículo de ayuda prellenado desde cada necesidad detectada.

La migración `0041_workable_venus.sql` agrega `guide_content_media` y `guide_search_misses`. La validación final de esta entrega aprobó **217 pruebas** con TypeScript sin errores.

## Plantillas y señales de impacto de la ayuda

Al crear una guía, Owner puede aplicar plantillas visuales de **tutorial operativo**, **solución rápida**, **procedimiento de control** o **novedad de producto**. Cada plantilla propone tipo, audiencia, categoría, duración y una estructura editable en el formato enriquecido seguro. Las plantillas no publican ni reemplazan contenido existente; funcionan como punto de partida para que Owner adapte el procedimiento a la operación real.

Cuando una persona busca ayuda y abre un artículo administrado desde esos resultados, SongTap registra una señal agregada por término normalizado, rol y artículo. El evento no conserva usuario, local ni navegación individual. Owner visualiza aperturas desde resultados, consultas distintas, artículos con impacto y un ranking proporcional por artículo. Esta señal representa una apertura asociada a búsqueda, no una garantía de resolución; sirve para priorizar revisión y mejora editorial.

La migración `0042_breezy_grim_reaper.sql` agrega `guide_search_resolutions`. La validación final aprobó **222 pruebas** con TypeScript sin errores.
