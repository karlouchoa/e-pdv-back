import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../auth/decorators/public.decorator';
import { PublicContactDto } from './dto/public-contact.dto';
import { PublicContactService } from './public-contact.service';

@Public()
@Controller('public')
export class PublicContactController {
  constructor(private readonly publicContactService: PublicContactService) {}

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('contact')
  sendContact(@Body() dto: PublicContactDto) {
    return this.publicContactService.sendContactEmail(dto);
  }
}
