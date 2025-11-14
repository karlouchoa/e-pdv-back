import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    // 🔹 CORS para ambiente de desenvolvimento
    app.enableCors({
      origin: [
        'http://localhost:3000',
        'http://localhost:3001',
      ],
      credentials: true,
    });
  } else {
    // 🔹 CORS para produção com tenants dinâmicos
    app.enableCors({
      origin: (origin, callback) => {
        // Liberar requisições internas (CLI, curl, etc.)
        if (!origin) {
          return callback(null, true);
        }

        const allowedStatic = [
          'https://www.goldpdv.com.br',
          'https://goldpdv.com.br',
          'https://www.nortesoft.com.br',
          'https://nortesoft.com.br',
          'https://www.e-pdv.com.br',
          'https://e-pdv.com.br',
        ];

        // 🔹 Permitir subdomínios dos tenants → *.goldpdv.com.br
        const tenantRegex = /\.goldpdv\.com\.br$/;

        if (
          allowedStatic.includes(origin) ||
          tenantRegex.test(origin)
        ) {
          return callback(null, true);
        }

        console.warn('🚫 CORS BLOQUEADO:', origin);
        return callback(new Error('Origem não autorizada: ' + origin), false);
      },
      credentials: true,
    });
  }

  // 🔹 Pipes globais (validação de DTOs)
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: false,
    }),
  );

  const port = process.env.PORT || 3023;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 API rodando na porta ${port}`);
}

bootstrap();
