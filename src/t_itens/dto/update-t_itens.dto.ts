import { PartialType } from "@nestjs/mapped-types";
import { CreateTItemDto } from "./create-t_itens.dto";

export class UpdateTItemDto extends PartialType(CreateTItemDto) {}
