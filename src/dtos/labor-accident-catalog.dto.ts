import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { LaborAccidentCatalogType } from '../entities/labor-accident-catalog.entity';

export class ListLaborAccidentCatalogsQueryDto {
  @ApiPropertyOptional({ example: '1' })
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional({ example: '10' })
  @IsOptional()
  @IsString()
  limit?: string;

  @ApiPropertyOptional({
    example: LaborAccidentCatalogType.INJURY_FACTOR,
    enum: LaborAccidentCatalogType,
  })
  @IsOptional()
  @IsIn(Object.values(LaborAccidentCatalogType), {
    message: 'Loại danh mục không hợp lệ',
  })
  type?: LaborAccidentCatalogType;

  @ApiPropertyOptional({ example: 'Thiết bị' })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ example: '4' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ example: 'Thiết bị nâng' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: '1' })
  @IsOptional()
  @IsString()
  level?: string;

  @ApiPropertyOptional({ example: '1' })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional({ example: 'true' })
  @IsOptional()
  @IsString()
  isActive?: string;
}

export class LaborAccidentCatalogOptionsQueryDto {
  @ApiPropertyOptional({
    example: LaborAccidentCatalogType.ACCIDENT_CAUSE,
    enum: LaborAccidentCatalogType,
  })
  @IsOptional()
  @IsIn(Object.values(LaborAccidentCatalogType), {
    message: 'Loại danh mục không hợp lệ',
  })
  type?: LaborAccidentCatalogType;
}

export class CreateLaborAccidentCatalogDto {
  @ApiProperty({
    example: LaborAccidentCatalogType.INJURY_FACTOR,
    enum: LaborAccidentCatalogType,
  })
  @IsNotEmpty({ message: 'Loại danh mục không được để trống' })
  @IsIn(Object.values(LaborAccidentCatalogType), {
    message: 'Loại danh mục không hợp lệ',
  })
  type!: LaborAccidentCatalogType;

  @ApiProperty({ example: '4' })
  @IsNotEmpty({ message: 'Mã danh mục không được để trống' })
  code!: string;

  @ApiProperty({ example: 'Thiết bị nâng' })
  @IsNotEmpty({ message: 'Tên danh mục không được để trống' })
  name!: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Danh mục cha, dùng cho loại chấn thương/nghề nghiệp/nguyên nhân',
  })
  @IsOptional()
  parentId?: string | number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  isActive?: string | boolean;
}

export class UpdateLaborAccidentCatalogDto {
  @ApiPropertyOptional({
    example: LaborAccidentCatalogType.INJURY_FACTOR,
    enum: LaborAccidentCatalogType,
  })
  @IsOptional()
  @IsIn(Object.values(LaborAccidentCatalogType), {
    message: 'Loại danh mục không hợp lệ',
  })
  type?: LaborAccidentCatalogType;

  @ApiPropertyOptional({ example: '4' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ example: 'Thiết bị nâng' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  parentId?: string | number | null;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  isActive?: string | boolean;
}

export class UpdateLaborAccidentCatalogStatusDto {
  @ApiProperty({ example: true })
  @IsNotEmpty({ message: 'Trạng thái không được để trống' })
  isActive!: string | boolean;
}
