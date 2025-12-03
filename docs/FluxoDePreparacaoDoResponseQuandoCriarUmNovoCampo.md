Segue o fluxo para preparar payloads (entrada/saída) ao incluir um novo campo em uma tabela usando Prisma no projeto:

Schema Prisma (prisma/schema_tenant.prisma): adicione o campo no model correspondente. 
Ex.: em production_orders { novo_campo Tipo? @db... }.

Regenerar client: após editar o schema, rode npx prisma generate para atualizar tipos do client (necessário para IntelliSense/compilação).

DTOs de entrada (src/production/dto/...):
    Criação: create-*.dto.ts — adicione o transform/validação para aceitar o novo campo (camelCase vs snake_case).
    Atualização: update-*.dto.ts — se herda de create, já pega; senão, adicione o campo opcional.
    Filtros/listagens: find-*.dto.ts — só se o campo for usado em filtros.

Service (payload para writes) (src/production/production.service.ts ou service equivalente):
    No create e update, mapeie dto.novo_campo para data.novo_campo, fazendo conversões necessárias (Number, Date, string trim, etc.).

    Service (payload para reads):
    Se usa select/include centralizado (aqui buildOrderSelect + orderScalarSelect), inclua o novo campo em orderScalarSelect para que findMany/findUnique/create com select retornem o campo.

Se algum endpoint usa include direto, acrescente o campo no select ou use select: { ... } conforme necessário.

Controladores: normalmente só repassam o DTO; não precisam mudar salvo renomeações.

Docs (docs/production-process.md): atualize exemplos de payload/resposta para refletir o novo campo.

Resumo prático para production_orders:
    adicionar campo no model;
    npx prisma generate;
    acrescentar no CreateProductionOrderDto/UpdateProductionOrderDto;
    mapear no createOrder/updateOrder;
    adicionar em orderScalarSelect para sair nos findMany/findUnique/create (via select).