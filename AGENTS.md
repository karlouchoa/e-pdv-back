# AGENTS

Repo-specific guidance for coding agents working in this backend.

## Project snapshot
- Stack: NestJS (TypeScript) backend.
- ORM: Prisma with TWO distinct schemas:
  - `prisma/schema_main.prisma`: Global data (tenants, users, auth).
  - `prisma/schema_tenant.prisma`: Business data (products, sales, inventory).
- Prisma clients are generated in `prisma/generated/client_main` and
  `prisma/generated/client_tenant`.
- Database: SQL Server (mssql).
- Storage: Cloudflare R2 (S3 compatible) via `@aws-sdk/client-s3`.

## Primary paths
- Source: `src/`
- Prisma Schemas: `prisma/`
- Prisma Clients: `prisma/generated/`
- Upload Logic: `src/upload/`
- Tests: `test/`
- Docs: `docs/`

## Common commands (npm)
- Install: `npm install`
- Dev: `npm run start:dev`
- Build: `npm run build`
- Lint: `npm run lint`
- Tests: `npm run test`, `npm run test:e2e`
- Prisma Generate: `npm run prisma:generate` (runs for both schemas).

## Architecture & Code conventions
- Structure: Follow standard NestJS module/service/controller architecture.
- Validation: Use DTOs with `class-validator` and `class-transformer` for ALL
  input/output.
- Dependency Injection: Always register new services in their respective
  modules.
- Config: `ConfigModule` is global. Do not re-import it in feature modules; use
  `ConfigService`.
- Prisma usage: Do not instantiate `PrismaClient` from `@prisma/client`
  directly. Use `TenantDbService`, `TenantPrismaClient`, and
  `MainPrismaClient`.
- Do not edit generated output under `dist/` or dependencies in
  `node_modules/`.

## Storage Strategy (Images/Assets)
- Pattern: DO NOT save files to local disk. Use presigned URLs.
- Flow:
  1. Frontend requests upload URL -> Backend (`UploadService`) generates
     presigned URL (PUT).
  2. Frontend uploads directly to Cloudflare R2.
  3. Frontend sends the final URL to Backend to save in DB.
- Lib: Use `@aws-sdk/s3-request-presigner`.

## Database & Multi-tenancy
- Schema updates: Update the correct file in `prisma/`. Do not mix global and
  tenant logic.
- Migrations: Be careful with SQL Server specific syntax.
- Context: Use `TenantDbService.getTenantClient(tenantSlug)` for tenant data;
  use `MainPrismaClient` for global tables.
- After schema updates: run `npm run prisma:generate`.

## Authentication
- Routes are protected only when `JwtAuthGuard` is applied.
- Use `@Public()` to bypass `JwtAuthGuard` when needed.
- Tenant context is read from `req.user.tenant` (JWT payload).

## Environment
- `.env` controls local dev.
- Required keys: `DATABASE_ACESSOS`, `DATABASE_MODELO`, `DB_HOST`, `DB_PORT`,
  `DB_USER`, `DB_PASS`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `R2_ACCOUNT_ID`,
  `R2_BUCKET_NAME`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`,
  `R2_PUBLIC_DOMAIN`.
- Never commit secrets; document new required vars in `README.md` or `docs/`.

## Cross-repo coordination
- Frontend A (Cardapio): `C:\projetos\cardapio`
- Frontend B (PDV): `C:\projetos\goldPRD\goldpdv-front`
- Contract change: If you modify a DTO response, assume it breaks the frontend.
  Verify types.
