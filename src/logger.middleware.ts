import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('RequestLogger');

  private sanitizeForLog(value: unknown): unknown {
    const sensitiveKeys = new Set([
      'senha',
      'password',
      'token',
      'authorization',
    ]);

    if (Array.isArray(value)) {
      return value.map((item) => this.sanitizeForLog(item));
    }

    if (!value || typeof value !== 'object') {
      return value;
    }

    const record = value as Record<string, unknown>;
    const sanitized: Record<string, unknown> = {};

    Object.entries(record).forEach(([key, raw]) => {
      if (sensitiveKeys.has(key.toLowerCase())) {
        sanitized[key] = '***';
        return;
      }
      sanitized[key] = this.sanitizeForLog(raw);
    });

    return sanitized;
  }

  private stringifyPayload(payload: unknown): string {
    try {
      return JSON.stringify(this.sanitizeForLog(payload));
    } catch {
      return '"[unserializable-payload]"';
    }
  }

  use(req: Request, _res: Response, next: NextFunction) {
    const method = req.method;
    const endpoint = req.originalUrl || req.url;
    const payload = req.body;
    const hasPayload =
      payload &&
      typeof payload === 'object' &&
      !Array.isArray(payload) &&
      Object.keys(payload as Record<string, unknown>).length > 0;

    if (hasPayload) {
      this.logger.log(
        `[${new Date().toISOString()}] ${method} ${endpoint} payload=${this.stringifyPayload(payload)}`,
      );
    } else {
      this.logger.log(`[${new Date().toISOString()}] ${method} ${endpoint}`);
    }

    next();
  }
}
