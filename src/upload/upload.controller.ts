import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { UploadService } from './upload.service';

// Se você tiver autenticação, descomente as linhas do JwtAuthGuard
// import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  // @UseGuards(JwtAuthGuard) // Protege a rota para que apenas usuários logados façam upload
  @Post('presigned')
  async getPresignedUrl(
    @Body() body: { fileName: string; fileType: string; tenantId?: string },
    @Request() req: any
  ) {
    const tenantId = body.tenantId || 'temp-tenant';
    
    // Captura o header 'origin' ou 'referer' para saber de onde veio
    const origin = req.headers.origin || req.headers.referer;

    return this.uploadService.generatePresignedUrl(
      tenantId, 
      body.fileName, 
      body.fileType,
      origin // <--- Passando a origem aqui
    );
  }
}