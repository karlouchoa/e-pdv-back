import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Lista de domínios fixos (domínios principais sem subdomínios)
  const allowedFixedOrigins = [
    'https://goldpdv.com.br',
    'https://www.goldpdv.com.br',
    // Se houverem outros domínios de tenants fixos
  ];

  const subdomainRegex = /^https:\/\/([a-z0-9-]+\.)?goldpdv\.com\.br$/i;
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
      origin: (origin: string | undefined, callback: (err: Error | null, allowed?: boolean) => void) => {
        
        if (!origin) {
          return callback(null, true);
        }

        // 2. Permite domínios fixos na lista
        if (allowedFixedOrigins.includes(origin)) {
          return callback(null, true);
        }

        // 3. Permite subdomínios via Regex
        if (subdomainRegex.test(origin)) {
          return callback(null, true);
        }

        // 4. Bloqueia todas as outras origens
        return callback(new Error(`Origin ${origin} not allowed by CORS.`), false);
        
      },
    
      credentials: true,
    
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    
      allowedHeaders: [
        'Origin',
        'Content-Type',
        'Accept',
        'Authorization',
        'x-tenant',
        'X-Tenant',
        'X-Requested-With'
      ],
    
    });
    
    
  }

  // =========================================================
  // 🔹 Pipes globais de validação dos DTOs
  // =========================================================
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: false,
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

bootstrap();
