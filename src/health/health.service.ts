import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class HealthService {
  constructor(private prisma: PrismaService) {}

  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'e-PDV Backend',
    };
  }

  async checkDatabase() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        database: 'SQL Server',
        connected: true,
      };
    } catch (error) {
      return {
        status: 'error',
        database: 'SQL Server',
        connected: false,
        error: error.message,
      };
    }
  }
}
