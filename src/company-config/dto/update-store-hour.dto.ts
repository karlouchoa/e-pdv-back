import { PartialType } from '@nestjs/mapped-types';
import { CreateStoreHourDto } from './create-store-hour.dto';

export class UpdateStoreHourDto extends PartialType(CreateStoreHourDto) {}

