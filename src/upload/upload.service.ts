import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';

@Injectable()
export class UploadService {
  private s3Client: S3Client;

  constructor(private configService: ConfigService) {
    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${this.configService.getOrThrow('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: this.configService.getOrThrow('R2_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.getOrThrow('R2_SECRET_ACCESS_KEY'),
      },
    });
  }

  // Adicionado o parâmetro opcional 'origin'
  async generatePresignedUrl(
    tenantSlug: string,
    _fileName: string,
    fileType: string,
    origin?: string,
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

      const command = new PutObjectCommand({
        Bucket: this.configService.getOrThrow('R2_BUCKET_NAME'),
        Key: key,
        ContentType: fileType,
      });

      // Gera a URL assinada (válida por 10 minutos)
      const uploadUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn: 600,
      });

      // --- LÓGICA DE WHITE-LABEL ---
      // Pega o domínio padrão do .env (ex: https://cdn.goldpdv.com.br)
      let publicDomain = this.configService.getOrThrow('R2_PUBLIC_DOMAIN');

      // Se a origem da requisição for do domínio E-PDV, altera a URL de retorno
      if (
        origin &&
        (origin.includes('e-pdv.com') || origin.includes('localhost'))
      ) {
        // Você pode refinar a regra do localhost se quiser testar um específico
        // ou apenas verificar se inclui a string do domínio secundário
        if (origin.includes('e-pdv.com')) {
          publicDomain = 'https://cdn.e-pdv.com';
        }
      }

      return {
        uploadUrl, // URL para upload (PUT)
        fileUrl: `${publicDomain}/${key}`, // URL pública ajustada conforme a origem
        fileKey: key, // Chave interna
      };
    } catch (error) {
      console.error('Erro ao gerar Presigned URL:', error);
      throw new InternalServerErrorException(
        'Erro ao preparar upload de imagem',
      );
    }
  }
}
