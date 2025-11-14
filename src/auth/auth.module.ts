import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type ms from 'ms';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TenantDbService } from '../tenant-db/tenant-db.service';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';

const jwtSecret = process.env.JWT_SECRET ?? 'change-me';
const jwtExpiresIn: ms.StringValue | number = (process.env.JWT_EXPIRES_IN ??
  '1h') as ms.StringValue;

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      global: true,
      secret: jwtSecret,
      signOptions: { expiresIn: jwtExpiresIn },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, TenantDbService, JwtStrategy, JwtAuthGuard],
  exports: [AuthService],
})
export class AuthModule {}
