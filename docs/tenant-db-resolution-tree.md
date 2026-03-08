# Mapa de Resolucao de Banco por Tenant

```text
MAPA (TREE) - CAMINHO ATE IDENTIFICAR O BANCO

1) Aplicacao A: Frontend (Next.js em C:\projetos\cardapio)
└─ Entrada da requisicao
   ├─ src/middleware.ts
   │  └─ getTenantContext(host) em src/lib/tenant.ts
   │     ├─ landing -> mantem "/"
   │     └─ tenant host -> reescreve "/" para "/cardapio"
   │
   ├─ Fluxo publico (cardapio)
   │  └─ src/lib/storefront-api.ts
   │     ├─ resolveStorefrontApiBaseUrl()
   │     ├─ resolveStorefrontTenantHeader() (hostname -> tenant)
   │     └─ envia header "X-Tenant" para a API
   │
   ├─ Fluxo admin (painel)
   │  └─ src/modules/core/services/api.ts
   │     ├─ le sessao (token + tenant.slug)
   │     ├─ envia "Authorization: Bearer ..."
   │     └─ envia "X-Tenant" (tenant da sessao)
   │
   └─ OBS: Frontend nao escolhe banco SQL; ele so envia tenant/token para o backend.

2) Aplicacao B: Backend (NestJS em C:\projetos\goldPRD\goldpdv-backend)
└─ Bootstrap/Middleware
   ├─ src/app.module.ts aplica TenantMiddleware global
   └─ src/tenant.middleware.ts usa resolveTenantFromRequest(..., optional)
      (preenche req.tenant quando possivel)

   Fluxo 2.1 - Rotas publicas (ex.: /cardapio/*)
   ├─ Controller chama resolvePublicSubdomainFromRequest(req)
   │  └─ src/public/tenant-resolver.ts
   │     ├─ tenta "X-Tenant"
   │     └─ fallback: host/x-forwarded-host/origin/referer
   ├─ TenantDbService.getTenantClientBySubdomain(subdomain)
   │  └─ src/tenant-db/tenant-db.service.ts
   │     ├─ consulta MAIN DB (t_acessos) por subdominio ativo='S'
   │     ├─ le campo "banco" (nome do banco tenant)
   │     └─ cria/reutiliza Prisma client desse banco
   └─ Query final roda no banco tenant identificado

   Fluxo 2.2 - Rotas protegidas (admin)
   ├─ Login
   │  └─ AuthService.login()
   │     ├─ getTenantMetadataByIdentifier(login) -> MAIN DB t_acessos
   │     ├─ pega "banco" => tenantSlug
   │     ├─ valida usuario em t_users no banco tenant
   │     └─ emite JWT com tenant/banco no payload
   ├─ Requisicoes seguintes
   │  └─ TenantJwtGuard valida JWT e fixa req.user.tenant
   ├─ Service usa getTenantClient(req.user.tenant)
   │  └─ novamente resolve em t_acessos (MAIN DB) -> "banco"
   └─ Query final roda no banco tenant identificado

3) De onde vem a conexao
└─ src/tenant-db/tenant-db.service.ts
   ├─ MAIN DB: DATABASE_ACESSOS / DATABASE_URL
   └─ TENANT DB:
      ├─ TENANT_DATABASE_URL_TEMPLATE (prioridade)
      ├─ ou DATABASE_ACESSOS/DATABASE_MODELO com "database=<banco>"
      └─ cache de clients por connection string
```

