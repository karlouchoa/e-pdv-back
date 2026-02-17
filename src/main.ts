import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { json, urlencoded } from 'express';

declare global {
  interface BigInt {
    toJSON(): string;
  }
}

(BigInt.prototype as any).toJSON = function toJSON() {
  return this.toString();
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(json({ limit: '2mb' }));
  app.use(urlencoded({ extended: true, limit: '2mb' }));

  // Lista de domínios fixos (domínios principais sem subdomínios)
  const allowedFixedOrigins = [
    'https://goldpdv.com.br',
    'https://www.goldpdv.com.br',
    'https://e-pdv.com',
    'https://www.e-pdv.com',
    // Se houverem outros domínios de tenants fixos
  ];

  const subdomainRegex =
    /^https:\/\/([a-z0-9-]+\.)?(goldpdv\.com\.br|e-pdv\.com)$/i;
  const isDev = process.env.NODE_ENV !== 'production';

  // =========================================================
  // 🔹 CORS — Desenvolvimento
  // =========================================================
  if (isDev) {
    app.enableCors({
      origin: true,
      credentials: true,
    });
  }

  // =========================================================
  // 🔹 CORS — Produção com Tenants dinâmicos (*.goldpdv.com.br)
  // =========================================================
  else {
    app.enableCors({
      origin: (origin: string | undefined, callback: any) => {
        if (!origin) {
          return callback(null, true);
        }

        // 2. Permite domínios fixos na lista
        if (allowedFixedOrigins.includes(origin)) {
          return callback(null, origin);
        }

        // 3. Permite subdomínios via Regex
        if (subdomainRegex.test(origin)) {
          return callback(null, origin);
        }

        // 4. Bloqueia todas as outras origens
        return callback(
          new Error(`Origin ${origin} not allowed by CORS.`),
          false,
        );
      },

      credentials: true,
      allowedHeaders: [
        'Origin',
        'Content-Type',
        'Accept',
        'Authorization',
        'x-warehouse',
        'x-tenant',
        'X-Tenant',
        'X-Requested-With',
      ],
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    });
  }

  // =========================================================
  // 🔹 Pipes globais de validação dos DTOs
  // =========================================================
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  // =========================================================
  // 🔹 Inicialização da API
  // =========================================================
  const port = process.env.PORT || 3023;
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 API GoldPDV rodando na porta ${port}`);
  console.log(`🌐 Ambiente: ${isDev ? 'DESENVOLVIMENTO' : 'PRODUÇÃO'}`);
}

bootstrap().catch((error) => {
  console.error('Erro ao iniciar a API.', error);
  process.exit(1);
});
