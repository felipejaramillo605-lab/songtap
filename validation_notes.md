# Notas de validación de seguridad

## 14 de agosto de 2026

La navegación anónima a `/manager/activities` no expone contenido operativo ni genera errores de consola. La guarda de autenticación redirige correctamente al inicio de sesión. La verificación visual del formulario autenticado por rol queda como comprobación manual opcional con una sesión real de Manager o Staff.

La validación automatizada usa usuarios temporales aislados y verifica la creación de actividades, las tres variantes de evidencia (comentario, imagen y ambas), los cambios de estado y el bloqueo de operaciones cruzadas por ID sobre mesas, menú, pedidos, música, usuarios y actividades. Adicionalmente, dos pruebas de interfaz autenticada simulada ejercen los botones de asignación para Manager y de actualización con estado, comentario e imagen para Staff. La suite completa finaliza con 51 pruebas exitosas.
