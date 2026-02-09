# Upload de Imagens para Cloudflare R2

## Fluxo

1. Frontend solicita URL assinada em `POST /upload/presigned`.
2. Backend gera URL de upload (PUT) e retorna `uploadUrl`, `fileUrl` e `fileKey`.
3. Frontend envia o arquivo diretamente para o `uploadUrl`.
4. Frontend salva no cadastro do produto o `fileUrl` retornado.

## Selecao de bucket/dominio

O backend escolhe `bucket + dominio` juntos para evitar inconsistencia entre escrita e leitura:

- Origem padrao (ex.: `*.goldpdv.com.br`):
  - `R2_BUCKET_NAME`
  - `R2_PUBLIC_DOMAIN`
- Origem e-PDV (ex.: `*.e-pdv.com` / `*.e-pdv.local`):
  - `R2_BUCKET_NAME_EPDV`
  - `R2_PUBLIC_DOMAIN_EPDV`

Se as variaveis `EPDV` nao estiverem completas, para origem `e-pdv` o backend usa fallback interno:

- bucket: `e-pdv-assets`
- dominio: `https://cdn.e-pdv.com`

## Variaveis de ambiente

Obrigatorias:

- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `R2_PUBLIC_DOMAIN`

Opcionais para white-label e-PDV:

- `R2_BUCKET_NAME_EPDV`
- `R2_PUBLIC_DOMAIN_EPDV`

## Exemplo (e-PDV)

```env
R2_BUCKET_NAME_EPDV=e-pdv-assets
R2_PUBLIC_DOMAIN_EPDV=https://cdn.e-pdv.com
```

## CORS no bucket R2

Para upload direto do navegador (PUT com presigned URL), o bucket precisa aceitar CORS.

Exemplo de politica CORS para o bucket que recebe upload (`goldpdv-assets` e/ou `e-pdv-assets`):

```json
[
  {
    "AllowedOrigins": [
      "https://*.e-pdv.com",
      "https://e-pdv.com",
      "https://*.goldpdv.com.br",
      "https://goldpdv.com.br",
      "http://*.e-pdv.local:3021",
      "http://e-pdv.local:3021"
    ],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3600
  }
]
```
