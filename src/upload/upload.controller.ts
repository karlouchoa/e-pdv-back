import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Post,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { UploadService } from './upload.service';
import { TenantJwtGuard } from '../auth/tenant-jwt.guard';
import { resolveTenantFromRequest } from '../public/tenant-resolver';
import type { JwtPayload } from '../auth/types/jwt-payload.type';
import { RequestPresignedUrlDto } from './dto/request-presigned-url.dto';

interface TenantRequest extends Request {
  user?: JwtPayload;
  tenant?: { slug?: string };
}

const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'application/pdf',
]);

@Controller('upload')
@UseGuards(TenantJwtGuard)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  // TODO(rate-limit): aplicar throttling quando houver infra de rate limiting.
  @Post('presigned')
  async getPresignedUrl(
    @Body() body: RequestPresignedUrlDto,
    @Req() req: TenantRequest,
  ) {
    if (!req.user?.admin) {
      throw new ForbiddenException(
        'Apenas administradores podem gerar upload.',
      );
    }

    const tenant = req.tenant?.slug ?? resolveTenantFromRequest(req);
    if (!req.user?.tenant) {
      throw new BadRequestException('Tenant nao encontrado no token JWT.');
    }
    if (req.user.tenant.toLowerCase() !== tenant.toLowerCase()) {
      throw new ForbiddenException(
        'Tenant do token nao corresponde ao tenant da requisicao.',
      );
    }
    const fileType = body.fileType.trim().toLowerCase();
    if (!fileType || !ALLOWED_MIME_TYPES.has(fileType)) {
      throw new BadRequestException('Tipo de arquivo nao permitido.');
    }

    if (body.fileSize > MAX_UPLOAD_SIZE_BYTES) {
      throw new BadRequestException(
        'Arquivo excede o tamanho maximo permitido.',
      );
    }

    const originHeader =
      (typeof req.headers.origin === 'string' && req.headers.origin) ||
      (typeof req.headers.referer === 'string' && req.headers.referer) ||
      undefined;
    const requestHostHeader =
      (typeof req.headers['x-forwarded-host'] === 'string' &&
        req.headers['x-forwarded-host']) ||
      (typeof req.headers.host === 'string' && req.headers.host) ||
      undefined;

    return this.uploadService.generatePresignedUrl(
      tenant,
      body.fileName,
      fileType,
      originHeader,
      requestHostHeader,
    );
  }
}
