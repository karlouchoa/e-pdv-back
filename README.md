# e-PDV Backend

Backend do projeto e-PDV desenvolvido com NestJS, Prisma e SQL Server.

## 🚀 Tecnologias

- **NestJS** - Framework Node.js progressivo para construção de aplicações server-side eficientes e escaláveis
- **Prisma** - ORM moderno para Node.js e TypeScript
- **SQL Server** - Sistema de gerenciamento de banco de dados relacional da Microsoft
- **TypeScript** - Superset JavaScript que adiciona tipagem estática

## 📋 Pré-requisitos

- Node.js >= 16
- npm ou yarn
- SQL Server (local ou remoto)

## 🔧 Instalação

1. Clone o repositório:
```bash
git clone https://github.com/karlouchoa/e-pdv-back.git
cd e-pdv-back
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações do SQL Server:
```env
DATABASE_URL="sqlserver://localhost:1433;database=e_pdv;user=sa;password=YourPassword123;encrypt=true;trustServerCertificate=true"
PORT=3000
NODE_ENV=development
```

4. Gere o Prisma Client:
```bash
npx prisma generate
```

5. Execute as migrations (quando disponíveis):
```bash
npx prisma migrate dev
```

## 🏃‍♂️ Executando a aplicação

### Modo desenvolvimento
```bash
npm run start:dev
```

### Modo produção
```bash
npm run build
npm run start:prod
```

A aplicação estará disponível em `http://localhost:3000`

## 🧪 Testes

### Testes unitários
```bash
npm test
```

### Testes e2e
```bash
npm run test:e2e
```

### Cobertura de testes
```bash
npm run test:cov
```

## 📚 Endpoints

### Health Check
- `GET /` - Retorna mensagem de boas-vindas
- `GET /health` - Verifica status da aplicação
- `GET /health/database` - Verifica conexão com o banco de dados

## 🗄️ Prisma

### Gerar Prisma Client
```bash
npx prisma generate
```

### Criar migration
```bash
npx prisma migrate dev --name nome_da_migration
```

### Abrir Prisma Studio
```bash
npx prisma studio
```

## 📝 Estrutura do Projeto

```
e-pdv-back/
├── prisma/
│   └── schema.prisma       # Schema do Prisma com modelos do banco
├── src/
│   ├── health/            # Módulo de health check
│   ├── prisma/            # Módulo e serviço do Prisma
│   ├── app.controller.ts  # Controlador principal
│   ├── app.module.ts      # Módulo principal
│   ├── app.service.ts     # Serviço principal
│   └── main.ts            # Ponto de entrada da aplicação
├── test/                  # Testes e2e
├── .env.example           # Exemplo de variáveis de ambiente
├── nest-cli.json          # Configuração do NestJS CLI
├── package.json           # Dependências e scripts
├── tsconfig.json          # Configuração do TypeScript
└── README.md             # Este arquivo
```

## 🔐 Configuração do SQL Server

Certifique-se de que o SQL Server está rodando e acessível. A string de conexão deve seguir o formato:

```
sqlserver://[host]:[port];database=[database];user=[username];password=[password];encrypt=true;trustServerCertificate=true
```

### Exemplo com Docker:
```bash
docker run -e "ACCEPT_EULA=Y" -e "SA_PASSWORD=YourPassword123" \
   -p 1433:1433 --name sql-server \
   -d mcr.microsoft.com/mssql/server:2019-latest
```

## 📄 Licença

Este projeto é privado e não possui licença pública.
