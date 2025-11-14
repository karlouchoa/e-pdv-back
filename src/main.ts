import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: 'http://localhost:3001', credentials: true });

 // 🔹 Ativa transformação e validação automática dos DTOs
 app.useGlobalPipes(
  new ValidationPipe({
    transform: true, // converte tipos automaticamente
    whitelist: true, // ignora campos desconhecidos
    forbidNonWhitelisted: false,
  }),
);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
