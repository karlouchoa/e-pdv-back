import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';

type UploadTarget = {
  bucketName: string;
  publicDomain: string;
};

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly s3Client: S3Client;

  constructor(private readonly configService: ConfigService) {
    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${this.configService.getOrThrow('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: this.configService.getOrThrow('R2_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.getOrThrow('R2_SECRET_ACCESS_KEY'),
      },
    });
  }

  async generatePresignedUrl(
    tenantSlug: string,
    _fileName: string,
    fileType: string,
    origin?: string,
    requestHost?: string,
  ) {
    try {
      const extension =
        fileType === 'image/png'
          ? 'png'
          : fileType === 'image/webp'
            ? 'webp'
            : fileType === 'application/pdf'
              ? 'pdf'
              : 'jpg';

      const safeTenant = tenantSlug.trim().toLowerCase();
      const date = new Date();
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const key = `uploads/${safeTenant}/${year}/${month}/${randomUUID()}.${extension}`;
      const target = this.resolveUploadTarget({ origin, requestHost });

      const command = new PutObjectCommand({
        Bucket: target.bucketName,
        Key: key,
        ContentType: fileType,
      });

      const uploadUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: 600,
      });

      return {
        uploadUrl,
        fileUrl: `${target.publicDomain}/${key}`,
        fileKey: key,
      };
    } catch (error) {
      this.logger.error(
        'Erro ao gerar presigned URL',
        error instanceof Error ? error.stack : undefined,
      );
      throw new InternalServerErrorException(
        'Erro ao preparar upload de imagem',
      );
    }
  }

  private resolveUploadTarget(context: {
    origin?: string;
    requestHost?: string;
  }): UploadTarget {
    const defaultBucket = this.configService
      .getOrThrow<string>('R2_BUCKET_NAME')
      .trim();
    const defaultDomain = this.normalizePublicDomain(
      this.configService.getOrThrow<string>('R2_PUBLIC_DOMAIN'),
    );

    if (!this.isEpdvRequest(context)) {
      return { bucketName: defaultBucket, publicDomain: defaultDomain };
    }

    const epdvBucket = this.configService.get<string>('R2_BUCKET_NAME_EPDV');
    const epdvDomain = this.configService.get<string>('R2_PUBLIC_DOMAIN_EPDV');
    const normalizedEpdvBucket = epdvBucket?.trim();
    const normalizedEpdvDomain = epdvDomain?.trim();
    const fallbackEpdvBucket = 'e-pdv-assets';
    const fallbackEpdvDomain = 'https://cdn.e-pdv.com';

    if (!normalizedEpdvBucket || !normalizedEpdvDomain) {
      this.logger.warn(
        'Configuracao R2 EPDV ausente/incompleta; usando fallback e-pdv-assets/cdn.e-pdv.com.',
      );
    }

    return {
      bucketName: normalizedEpdvBucket ?? fallbackEpdvBucket,
      publicDomain: this.normalizePublicDomain(
        normalizedEpdvDomain ?? fallbackEpdvDomain,
      ),
    };
  }

  private isEpdvRequest(context: {
    origin?: string;
    requestHost?: string;
  }): boolean {
    const originHost = this.extractHostname(context.origin);
    if (originHost && this.isEpdvHostname(originHost)) {
      return true;
    }

    const requestHost = this.extractHostname(context.requestHost);
    if (requestHost && this.isEpdvHostname(requestHost)) {
      return true;
    }

    return false;
  }

  private extractHostname(input?: string): string | null {
    if (!input) return null;

    const raw = input.split(',')[0]?.trim();
    if (!raw) return null;

    try {
      return new URL(raw).hostname.toLowerCase();
    } catch {
      return raw
        .replace(/^https?:\/\//i, '')
        .split('/')[0]
        .replace(/:\d+$/, '')
        .toLowerCase();
    }
  }

  private isEpdvHostname(hostname: string): boolean {
    const normalized = hostname.replace(/:\d+$/, '');

    return (
      normalized === 'e-pdv.com' ||
      normalized.endsWith('.e-pdv.com') ||
      normalized === 'e-pdv.local' ||
      normalized.endsWith('.e-pdv.local')
    );
  }

  private normalizePublicDomain(value: string): string {
    return value.trim().replace(/\/+$/, '');
  }
}
