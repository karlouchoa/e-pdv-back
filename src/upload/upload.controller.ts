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
    @Body()
    body: { fileName: string; fileType: string; fileSize?: number | string },
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
    if (req.user.tenant !== tenant) {
      throw new ForbiddenException(
        'Tenant do token nao corresponde ao tenant da requisicao.',
      );
    }
    const fileType = body.fileType?.trim();
    if (!fileType || !ALLOWED_MIME_TYPES.has(fileType)) {
      throw new BadRequestException('Tipo de arquivo nao permitido.');
    }

    const rawSize =
      body.fileSize === undefined || body.fileSize === null
        ? NaN
        : Number(body.fileSize);
    if (!Number.isFinite(rawSize) || rawSize <= 0) {
      throw new BadRequestException(
        'fileSize obrigatorio e deve ser maior que zero.',
      );
    }
    if (rawSize > MAX_UPLOAD_SIZE_BYTES) {
      throw new BadRequestException(
        'Arquivo excede o tamanho maximo permitido.',
      );
    }

    // Captura o header 'origin' ou 'referer' para saber de onde veio
    const origin = req.headers.origin || req.headers.referer;
    return this.uploadService.generatePresignedUrl(
      tenant,
      body.fileName,
      fileType,
      origin, // <--- Passando a origem aqui
    );
  }
}
