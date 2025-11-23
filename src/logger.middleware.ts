import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('RequestLogger');

  use(req: Request, res: Response, next: NextFunction) {
    // 1. URL Completa (incluindo parâmetros de consulta)
    const fullUrl = req.originalUrl; 
    
    // 2. Payload da Requisição (Body)
    // O body (payload) só estará populado para requisições POST, PUT, PATCH.
    // Para GET/DELETE, ele será um objeto vazio.
    const payload = req.body; 
    
    // 3. Método HTTP
    const method = req.method;

    // Logando as informações
    this.logger.log(`
      --- DADOS DA REQUISIÇÃO ---
      Método: ${method}
      URL: ${fullUrl}
      Payload/Body: ${JSON.stringify(payload, null, 2)}
      ---------------------------
    `);
    
    // É crucial chamar next() para permitir que a requisição continue
    next();
  }
}