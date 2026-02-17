import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type ms from 'ms';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TenantDbService } from '../tenant-db/tenant-db.service';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';
import { TenantJwtGuard } from './tenant-jwt.guard';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const jwtSecret = configService.get<string>('JWT_SECRET')?.trim();
        if (!jwtSecret) {
          throw new Error('JWT_SECRET nao configurado no ambiente.');
        }

        const jwtExpiresIn: ms.StringValue | number =
          (configService.get<string>('JWT_EXPIRES_IN') ??
            '1h') as ms.StringValue;

        return {
          global: true,
          secret: jwtSecret,
          signOptions: { expiresIn: jwtExpiresIn },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    TenantDbService,
    JwtStrategy,
    JwtAuthGuard,
    TenantJwtGuard,
  ],
  exports: [AuthService],
})
export class AuthModule {}
