import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { RecordRawMaterialDto } from './record-raw-material.dto';

export class CreateProductionOrderDto {
  @Transform(({ value, obj }) =>
    (value ?? obj.externalCode ?? obj.external_code ?? '').trim() || undefined,
  )
  @IsString()
  @MaxLength(100)
  @IsOptional()
  external_code?: string;

  @Transform(({ value, obj }) =>
    (value ?? obj.productCode ?? obj.product_code ?? '').trim(),
  )
  @IsString()
  @MaxLength(80)
  @IsNotEmpty()
  product_code!: string;

  @Transform(({ value, obj }) =>
    value ?? obj.quantityPlanned ?? obj.quantity_planned,
  )
  @Type(() => Number)
  @IsNumber({ allowInfinity: false, allowNaN: false }, { message: 'quantity_planned must be a number' })
  @Min(0)
  quantity_planned!: number;

  @Transform(({ value, obj }) => value ?? obj.unit)
  @IsString()
  @MaxLength(10)
  @IsNotEmpty()
  unit!: string;

  @Transform(({ value, obj }) => value ?? obj.startDate ?? obj.start_date)
  @IsDateString()
  start_date!: string;

  @Transform(({ value, obj }) => value ?? obj.dueDate ?? obj.due_date)
  @IsDateString()
  due_date!: string;

  @Transform(({ value, obj }) =>
    (value ?? obj.notes ?? '').trim() || undefined,
  )
  @IsOptional()
  @IsString()
  notes?: string;

  @Transform(({ value, obj }) => value ?? obj.lote)
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  lote?: number;

  @Transform(({ value, obj }) => value ?? obj.validate ?? obj.customValidateDate)
  @IsOptional()
  @IsDateString()
  validate?: string;

  @Transform(({ value, obj }) => value ?? obj.customValidateDate)
  @IsOptional()
  @IsDateString()
  custom_validate_date?: string;

  @Transform(({ value, obj }) => value ?? obj.boxesQty ?? obj.boxes_qty)
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  boxes_qty?: number;

  @Transform(({ value, obj }) => value ?? obj.boxCost ?? obj.box_cost)
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  box_cost?: number;

  @Transform(({ value, obj }) => value ?? obj.laborPerUnit ?? obj.labor_per_unit)
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  labor_per_unit?: number;

  @Transform(({ value, obj }) => value ?? obj.salePrice ?? obj.sale_price)
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  sale_price?: number;

  @Transform(({ value, obj }) => value ?? obj.markup)
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  markup?: number;

  @Transform(({ value, obj }) => value ?? obj.postSaleTax ?? obj.post_sale_tax)
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  post_sale_tax?: number;

  @Transform(({ value, obj }) => value ?? obj.rawMaterials ?? obj.raw_materials)
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecordRawMaterialDto)
  raw_materials?: RecordRawMaterialDto[];

  @Transform(({ value, obj }) => value ?? obj.OP ?? obj.op)
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  OP?: number;

  @Transform(({ value, obj }) =>
    (value ?? obj.author_user ?? '').trim() || undefined,
  )
  @IsOptional()
  @IsString()
  author_user?: string;

  @Transform(({ value, obj }) => value ?? obj.ingredients ?? obj.Ingredients)
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  ingredients?: number;

  @Transform(({ value, obj }) => value ?? obj.labor ?? obj.Labor)
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  labor?: number;

  @Transform(({ value, obj }) => value ?? obj.packaging ?? obj.Packaging)
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  packaging?: number;

  @Transform(({ value, obj }) => value ?? obj.taxes ?? obj.Taxes)
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  taxes?: number;

  @Transform(({ value, obj }) => value ?? obj.overhead ?? obj.Overhead)
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  Overhead?: number;

  @Transform(({ value, obj }) => value ?? obj.totalCost ?? obj.TotalCost)
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  totalCost?: number;

  @Transform(({ value, obj }) => value ?? obj.unitCost ?? obj.unitcost)
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  unitCost?: number;

}
