# SongTap

Sistema ERP para bares y karaokes (descripción del repositorio).

> **Estado:** en desarrollo.

## Módulos presentes en el código

Los routers de `server/routers/` cubren: sedes (venues), mesas y códigos QR, menú, pedidos, inventario, música (peticiones), PQRS, notificaciones, finanzas, reportes para propietarios, onboarding y aprendizaje, usuarios y control de acceso.

Esto describe lo que existe en el código; no implica que cada módulo esté completo.

## Stack

- Cliente: React 19, Vite 7, Tailwind CSS 4, componentes Radix UI, wouter, Recharts
- API: Express 5 con tRPC 11 y superjson
- Base de datos: MySQL (`mysql2`) con Drizzle ORM y migraciones (`drizzle/`)
- Autenticación local con bcrypt y sesiones por cookie (`jose`)
- Almacenamiento compatible con S3 (`@aws-sdk/client-s3`)
- Pruebas: Vitest; gestor de paquetes: pnpm

## Cómo ejecutarlo

Requiere Node.js, pnpm y una base MySQL.

```bash
pnpm install
pnpm db:push      # genera y aplica migraciones (requiere la variable de conexión a la base de datos)
pnpm dev
```

Otros scripts: `pnpm build`, `pnpm start`, `pnpm check` (TypeScript), `pnpm test`.

Las variables de entorno concretas se leen en `server/_core/`; no las incluyas en el repositorio (`.env*` está en `.gitignore`).

## Notas

- `seed-test-data.sql` crea datos de demostración con valores de prueba; no lo ejecutes contra producción.
- `package.json` declara licencia MIT, pero el repositorio no incluye archivo `LICENSE`.
