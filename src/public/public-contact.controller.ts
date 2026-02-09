import { Body, Controller, Post } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { PublicContactDto } from './dto/public-contact.dto';
import { PublicContactService } from './public-contact.service';

@Controller('public')
export class PublicContactController {
  constructor(private readonly publicContactService: PublicContactService) {}

  @Public()
  @Post('contact')
  sendContact(@Body() dto: PublicContactDto) {
    return this.publicContactService.sendContactEmail(dto);
  }
}
