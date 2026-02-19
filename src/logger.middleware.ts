import {
  Injectable,
  Logger,
  NestMiddleware,
  OnModuleDestroy,
} from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware, OnModuleDestroy {
  private readonly logger = new Logger('RequestLogger');
  private readonly metricWindowMs = 5 * 60 * 1000;
  private readonly maxLatencySamples = 20_000;
  private readonly metricFlushTimer: NodeJS.Timeout;
  private metricsWindowStartedAt = Date.now();
  private requestCountInWindow = 0;
  private request4xxInWindow = 0;
  private request5xxInWindow = 0;
  private latencySamplesMs: number[] = [];

  constructor() {
    this.metricFlushTimer = setInterval(() => {
      this.flushMetrics(Date.now(), true);
    }, this.metricWindowMs);
    this.metricFlushTimer.unref();
  }

  onModuleDestroy() {
    clearInterval(this.metricFlushTimer);
    this.flushMetrics(Date.now(), true);
  }

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

  private pushLatencySample(durationMs: number) {
    if (!Number.isFinite(durationMs) || durationMs < 0) return;
    if (this.latencySamplesMs.length >= this.maxLatencySamples) return;
    this.latencySamplesMs.push(durationMs);
  }

  private percentile(samples: number[], percentile: number): number {
    if (!samples.length) return 0;
    const sorted = [...samples].sort((a, b) => a - b);
    const index = Math.min(
      sorted.length - 1,
      Math.max(0, Math.ceil((percentile / 100) * sorted.length) - 1),
    );
    return sorted[index] ?? 0;
  }

  private resetMetricsWindow(startedAtMs: number) {
    this.metricsWindowStartedAt = startedAtMs;
    this.requestCountInWindow = 0;
    this.request4xxInWindow = 0;
    this.request5xxInWindow = 0;
    this.latencySamplesMs = [];
  }

  private flushMetrics(nowMs: number, force = false) {
    const elapsed = nowMs - this.metricsWindowStartedAt;
    if (!force && elapsed < this.metricWindowMs) {
      return;
    }

    if (this.requestCountInWindow === 0) {
      this.resetMetricsWindow(nowMs);
      return;
    }

    const sampleCount = this.latencySamplesMs.length;
    const totalLatency = this.latencySamplesMs.reduce(
      (sum, item) => sum + item,
      0,
    );
    const avgMs = sampleCount ? totalLatency / sampleCount : 0;
    const p95Ms = this.percentile(this.latencySamplesMs, 95);
    const maxMs = sampleCount ? Math.max(...this.latencySamplesMs) : 0;
    const rate5xx =
      this.requestCountInWindow > 0
        ? (this.request5xxInWindow / this.requestCountInWindow) * 100
        : 0;

    this.logger.log(
      `[metrics][5m] requests=${this.requestCountInWindow} p95_ms=${p95Ms.toFixed(
        1,
      )} avg_ms=${avgMs.toFixed(1)} max_ms=${maxMs.toFixed(
        1,
      )} 4xx=${this.request4xxInWindow} 5xx=${this.request5xxInWindow} 5xx_rate=${rate5xx.toFixed(2)}% samples=${sampleCount}`,
    );

    this.resetMetricsWindow(nowMs);
  }

  private recordRequest(durationMs: number, statusCode: number) {
    this.requestCountInWindow += 1;
    if (statusCode >= 500) {
      this.request5xxInWindow += 1;
    } else if (statusCode >= 400) {
      this.request4xxInWindow += 1;
    }
    this.pushLatencySample(durationMs);

    this.flushMetrics(Date.now());
  }

  use(req: Request, res: Response, next: NextFunction) {
    const startedAt = process.hrtime.bigint();
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

    res.on('finish', () => {
      const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      this.recordRequest(elapsedMs, res.statusCode);
    });

    next();
  }
}
