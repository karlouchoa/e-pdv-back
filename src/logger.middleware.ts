import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('RequestLogger');

  // use(req: Request, res: Response, next: NextFunction) {
  //   const fullUrl = req.originalUrl;
  //   const payload = req.body;
  //   const method = req.method;
  //   this.logger.log(`
  //     --- DADOS DA REQUISIÇÃO ---
  //     Método: ${method}
  //     URL: ${fullUrl}
  //     Payload/Body: ${JSON.stringify(payload, null, 2)}
  //     ---------------------------
  //   `);
  //   next();
  // }

  use(req: Request, res: Response, next: NextFunction) {
    // intercepta res.send para capturar a resposta
    const originalSend = res.send.bind(res);
    res.send = (body?: any) => {
      res.locals.responseBody = body;
      return originalSend(body);
    };

    // res.on('finish', () => {
    //   this.logger.log(
    //     [
    //       '--- DADOS DA REQUISIÇÃO ---',
    //       `Método: ${method}`,
    //       `URL: ${fullUrl}`,
    //       `Payload/Body: ${JSON.stringify(payload, null, 2)}`,
    //       `Status: ${res.statusCode}`,
    //       `Response: ${JSON.stringify(res.locals.responseBody, null, 2)}`,
    //       '---------------------------',
    //     ].join('\n'),
    //   );
    // });

    next();
  }
}
