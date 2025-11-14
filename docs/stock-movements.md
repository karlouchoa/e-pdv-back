# API de Movimentação de Estoque (T_MOVEST)

Esta documentação descreve as APIs propostas para leitura e lançamento de movimentos na tabela `t_movest`, cobrindo os cenários de Kardex, consolidação por período, filtros por tipo (entrada/saída) e inserção de novos movimentos. Não há endpoints para deleção ou atualização direta dos registros.

Todos os endpoints são protegidos por JWT e utilizam o tenant identificado no token para restringir consultas/inserções.

---

## Estrutura de Dados Base

Campos relevantes da tabela `t_movest` (ver `prisma/schema_tenant.prisma`):

| Campo       | Tipo      | Descrição                                             |
|-------------|-----------|-------------------------------------------------------|
| `nrlan`     | Int (PK)  | Número sequencial do lançamento                       |
| `cdemp`     | Int       | Empresa (derivada do tenant)                          |
| `cditem`    | Int       | Código do item                                        |
| `data`      | DateTime  | Data do movimento                                     |
| `qtde`      | Decimal   | Quantidade movimentada                                |
| `st`        | Char(1)   | Direção (`E` = entrada, `S` = saída)                  |
| `sldantemp` | Decimal   | Saldo anterior na empresa que movimentou              |
| `saldoant`  | Decimal   | Saldo anterior geral                                  |
| `valor`     | Decimal   | Valor total do movimento                              |
| `preco`     | Decimal   | Preço unitário                                        |
| `obs`       | String    | Observações                                           |
| `empitem`   | Int       | Unidade/empresa do item                               |
| `datadoc`   | DateTime  | Data do documento                                     |
| `numdoc`    | Int       | Número do documento                                   |

---

## Endpoints

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/inventory/movements/:itemId` | `GET` | Kardex de um item (toda movimentação, ordenada por data) |
| `/inventory/movements/summary` | `GET` | Consolidação por período (entradas, saídas, saldo final) |
| `/inventory/movements` | `GET` | Listagem genérica com filtro por tipo (`E` ou `S`) e período |
| `/inventory/movements` | `POST` | Inserção de um novo movimento em `t_movest` |

### 1. Kardex de Item

```
GET /inventory/movements/:itemId
```

**Query params opcionais**
- `from` (ISO date) – limita a data inicial.
- `to` (ISO date) – limita a data final.

**Resposta**

```json
[
  {
    "nrlan": 12345,
    "date": "2024-05-01T10:00:00Z",
    "docNumber": 9987,
    "type": "E",
    "quantity": 50,
    "unitPrice": 12.5,
    "totalValue": 625,
    "previousBalance": 100,
    "currentBalance": 150,
    "notes": "Compra fornecedor XPTO"
  }
]
```

`currentBalance` é calculado em memória, partindo do saldo inicial mais recente anterior ao período quando disponível (`saldoant + qtde` para entradas, `saldoant - qtde` para saídas).

### 2. Resumo por Período

```
GET /inventory/movements/summary?from=2024-05-01&to=2024-05-31&itemId=42
```

**Query params**
- `from` (obrigatório) – início do período.
- `to` (obrigatório) – fim do período.
- `itemId` (opcional) – filtra um item específico; se omitido, agrega todos os itens do tenant.

**Resposta**

```json
{
  "itemId": 42,
  "from": "2024-05-01",
  "to": "2024-05-31",
  "entries": {
    "quantity": 250,
    "value": 3125
  },
  "exits": {
    "quantity": 180,
    "value": 2250
  },
  "netQuantity": 70,
  "currentBalance": 420
}
```

### 3. Listar Apenas Entradas ou Saídas

```
GET /inventory/movements?type=E&from=2024-05-01&to=2024-05-31&itemId=42
```

**Query params**
- `type` – `E` (entradas) ou `S` (saídas). Obrigatório.
- `from`, `to`, `itemId` – mesmos comportamentos descritos anteriormente.

**Resposta**

```json
[
  {
    "nrlan": 78901,
    "itemId": 42,
    "date": "2024-05-15T09:12:00Z",
    "quantity": 25,
    "unitPrice": 13.2,
    "totalValue": 330,
    "document": {
      "number": 1102,
      "date": "2024-05-15",
      "type": "NF"
    },
    "counterparty": {
      "code": 123,
      "type": "FORNECEDOR"
    },
    "notes": "Reposição semanal"
  }
]
```

### 4. Inserir Movimento

```
POST /inventory/movements
```

**Body**

```json
{
  "itemId": 42,
  "type": "S",
  "quantity": 10.5,
  "unitPrice": 12.5,
  "document": {
    "number": 5544,
    "date": "2024-05-20",
    "type": "NF"
  },
  "notes": "Separação para venda #123",
  "warehouse": 1,
  "customerOrSupplier": 321
}
```

**Regras**
- `type = 'E'` incrementa saldo; `type = 'S'` decrementa.
- `quantity` sempre positiva; a direção determina o sinal aplicado internamente.
- `unitPrice` pode ser omitido quando não aplicável; o backend calcula `valor = quantity * unitPrice` se informado.
- `warehouse` mapeia para `empitem`, `customerOrSupplier` para `clifor`, `document.number` -> `numdoc`, `document.date` -> `datadoc`.
- O backend define `saldoant` buscando o último saldo do item, acumula o novo saldo e grava em `sldantemp`.

**Resposta**

```json
{
  "id": 98765,
  "itemId": 42,
  "type": "S",
  "quantity": 10.5,
  "unitPrice": 12.5,
  "totalValue": 131.25,
  "previousBalance": 430,
  "currentBalance": 419.5,
  "date": "2024-05-20T14:32:10Z"
}
```

---

## Considerações de Implementação

- O tenant é convertido em `cdemp` automaticamente usando `TenantDbService`.
- Todos os filtros de data são aplicados sobre `data` e `datadoc`, conforme o cenário.
- Para evitar regressões de saldo, o backend deve sempre buscar o último movimento confirmado antes de inserir um novo lançamento.
- Não há endpoints para exclusão ou alteração de lançamentos passados; correções devem ser feitas via movimentos reversos (ex.: registrar uma entrada para estornar uma saída).
