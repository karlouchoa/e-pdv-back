# Processo de Produção

Este documento descreve o fluxo principal do módulo de produção, os endpoints expostos e os payloads esperados em cada operação.

## Visão Geral

O módulo de produção está dividido em dois blocos:

1. **Fichas Técnicas (BOM – Bill of Materials)**: permitem cadastrar e versionar a composição de um produto acabado, incluindo o custo previsto por componente.
2. **Ordens de Produção**: registram execuções específicas (planejamento, status, insumos consumidos e produtos acabados gerados).

Todos os endpoints estão protegidos pelo guard JWT. O tenant é determinado automaticamente a partir do token e não precisa ser enviado no corpo.

---

## 1. Fichas Técnicas (BOM)

**Base path:** `/production/bom`

### 1.1 Listar BOMs
- **Endpoint**: `GET /production/bom`
- **Body**: nenhum.
- **Resposta**: `BomRecord[]`

```json
{
  "id": "UUID",
  "productCode": "string",
  "version": "string",
  "lotSize": 100.0,
  "validityDays": 30,
  "marginTarget": 0.15,
  "items": [
    {
      "componentCode": "MP001",
      "description": "Matéria-prima",
      "quantity": 2.5,
      "unitCost": 4.2
    }
  ],
  "totalCost": 10.5,
  "unitCost": 0.105,
  "marginAchieved": 0.18
}
```

### 1.2 Criar BOM
- **Endpoint**: `POST /production/bom`
- **Body (CreateBomDto)**:

```json
{
  "productCode": "PRD-001",
  "version": "v1",
  "lotSize": 100,
  "validityDays": 30,
  "marginTarget": 0.15,
  "marginAchieved": 0.1,
  "notes": "Texto opcional",
  "items": [
    {
      "componentCode": "MAT-01",
      "description": "Descrição opcional",
      "quantity": 2.5,
      "unitCost": 4.2
    }
  ]
}
```

### 1.3 Obter BOM por ID
- **Endpoint**: `GET /production/bom/:id`
- **Body**: nenhum. `id` deve ser UUID.

### 1.4 Atualizar BOM
- **Endpoint**: `PATCH /production/bom/:id`
- **Body (UpdateBomDto)**: todos os campos são opcionais; quando `items` é enviado, substitui integralmente a lista atual.

```json
{
  "productCode": "PRD-001",
  "version": "v2",
  "lotSize": 120,
  "validityDays": 45,
  "marginTarget": 0.18,
  "marginAchieved": 0.16,
  "notes": "Nova observação",
  "items": [
    {
      "componentCode": "MAT-02",
      "description": "Atualizada",
      "quantity": 3.1,
      "unitCost": 5.0
    }
  ]
}
```

### 1.5 Remover BOM
- **Endpoint**: `DELETE /production/bom/:id`
- **Body**: nenhum.

### 1.6 Exportar BOM em PDF
- **Endpoint**: `GET /production/bom/:id/pdf`
- **Resposta**: arquivo `application/pdf` contendo cabeçalho com produto/versão, número do lote e data de geração, tabela com matérias-primas (quantidade e custos unitários/totais) e rodapé com o custo total de produção.
- **Observações**: o PDF é gerado sob demanda utilizando os dados salvos para o BOM informado.



---

## 2. Ordens de Produção

**Base path:** `/production/orders`

### 2.1 Criar Ordem
- **Endpoint**: `POST /production/orders`
- **Body (CreateProductionOrderDto)**:

```json
{
  "external_code": "OP-2024-0001",
  "product_code": "PRD-001",
  "quantity_planned": 100,
  "unit": "UN",
  "start_date": "2024-05-01",
  "due_date": "2024-05-05",
  "notes": "Texto opcional"
}
```

### 2.2 Listar Ordens
- **Endpoint**: `GET /production/orders`
- **Query params (FindProductionOrdersQueryDto)**:
  - `external_code?: string`
  - `product_code?: string`

### 2.3 Obter Ordem por ID
- **Endpoint**: `GET /production/orders/:id`
- **Body**: nenhum. `id` UUID.

### 2.4 Atualizar Ordem
- **Endpoint**: `PATCH /production/orders/:id`
- **Body (UpdateProductionOrderDto)**: campos opcionais, mesmo shape da criação.

---

## 3. Status da Ordem

**Base path:** `/production/orders/:id/status`

### 3.1 Registrar Status
- **Endpoint**: `POST /production/orders/:id/status`
- **Body (RegisterOrderStatusDto)**:

```json
{
  "status": "PRODUCAO",
  "event_time": "2024-05-02T10:00:00Z",
  "responsible": "Fulano",
  "remarks": "Opcional"
}
```

### 3.2 Listar Status
- **Endpoint**: `GET /production/orders/:id/status`
- **Body**: nenhum.

---

## 4. Produtos Acabados da Ordem

**Base path:** `/production/orders/:id/finished-goods`

### 4.1 Registrar lote produzido
- **Endpoint**: `POST /production/orders/:id/finished-goods`
- **Body (RecordFinishedGoodDto)**:

```json
{
  "product_code": "PRD-001",
  "lot_number": "LT-2024-05",
  "quantity_good": 100,
  "quantity_scrap": 2,
  "unit_cost": 12.5,
  "posted_at": "2024-05-05T18:00:00Z"
}
```

### 4.2 Listar produtos acabados
- **Endpoint**: `GET /production/orders/:id/finished-goods`
- **Body**: nenhum.

---

## 5. Matérias-primas Consumidas

**Base path:** `/production/orders/:id/raw-materials`

### 5.1 Registrar consumo
- **Endpoint**: `POST /production/orders/:id/raw-materials`
- **Body (RecordRawMaterialDto)**:

```json
{
  "component_code": "MAT-01",
  "description": "Matéria-prima A",
  "quantity_used": 50,
  "unit": "KG",
  "unit_cost": 4.2,
  "warehouse": "ALM-01",
  "batch_number": "L-7788",
  "consumed_at": "2024-05-02T09:30:00Z"
}
```

### 5.2 Listar consumos
- **Endpoint**: `GET /production/orders/:id/raw-materials`
- **Body**: nenhum.

---

## Considerações Finais

- Todos os campos numéricos aceitam apenas valores finitos (sem `NaN` ou `Infinity`); validações são aplicadas via `class-validator`.
- As datas devem ser strings ISO (`YYYY-MM-DD` ou `YYYY-MM-DDTHH:mm:ssZ`).
- Sempre que um array de itens é enviado (ex.: atualização do BOM), ele substitui completamente os registros anteriores.
