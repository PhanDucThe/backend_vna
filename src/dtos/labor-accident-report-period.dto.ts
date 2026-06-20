import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { LaborAccidentReportPeriodType } from '../entities/labor-accident-report-period.entity';

export const LABOR_ACCIDENT_REPORT_NAMES = ['Báo cáo TNLĐ'] as const;

export class ListLaborAccidentReportPeriodsQueryDto {
  @ApiPropertyOptional({ example: '1' })
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional({ example: '10' })
  @IsOptional()
  @IsString()
  limit?: string;

  @ApiPropertyOptional({ example: 'Báo cáo TNLĐ' })
  @IsOptional()
  @IsString()
  reportName?: string;

  @ApiPropertyOptional({ example: '2026' })
  @IsOptional()
  @IsString()
  year?: string;

  @ApiPropertyOptional({
    example: LaborAccidentReportPeriodType.FULL_YEAR,
    enum: LaborAccidentReportPeriodType,
  })
  @IsOptional()
  @IsIn(Object.values(LaborAccidentReportPeriodType), {
    message: 'Kỳ báo cáo không hợp lệ',
  })
  periodType?: LaborAccidentReportPeriodType;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ example: 'true' })
  @IsOptional()
  @IsString()
  isActive?: string;
}

export class CreateLaborAccidentReportPeriodDto {
  @ApiProperty({
    example: 'Báo cáo TNLĐ',
    enum: LABOR_ACCIDENT_REPORT_NAMES,
  })
  @IsNotEmpty({ message: 'Tên báo cáo không được để trống' })
  @IsIn(LABOR_ACCIDENT_REPORT_NAMES, {
    message: 'Tên báo cáo không hợp lệ',
  })
  reportName!: string;

  @ApiProperty({ example: 2026 })
  @IsNotEmpty({ message: 'Năm báo cáo không được để trống' })
  year!: string | number;

  @ApiProperty({
    example: LaborAccidentReportPeriodType.FULL_YEAR,
    enum: LaborAccidentReportPeriodType,
  })
  @IsNotEmpty({ message: 'Kỳ báo cáo không được để trống' })
  @IsIn(Object.values(LaborAccidentReportPeriodType), {
    message: 'Kỳ báo cáo không hợp lệ',
  })
  periodType!: LaborAccidentReportPeriodType;

  @ApiProperty({
    example: '2026-01-01',
    description: 'Định dạng YYYY-MM-DD hoặc DD/MM/YYYY',
  })
  @IsNotEmpty({ message: 'Ngày bắt đầu không được để trống' })
  startDate!: string;

  @ApiProperty({
    example: '2026-12-31',
    description: 'Định dạng YYYY-MM-DD hoặc DD/MM/YYYY',
  })
  @IsNotEmpty({ message: 'Ngày kết thúc không được để trống' })
  endDate!: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  isActive?: string | boolean;
}

export class UpdateLaborAccidentReportPeriodDto {
  @ApiPropertyOptional({
    example: 'Báo cáo TNLĐ',
    enum: LABOR_ACCIDENT_REPORT_NAMES,
  })
  @IsOptional()
  @IsIn(LABOR_ACCIDENT_REPORT_NAMES, {
    message: 'Tên báo cáo không hợp lệ',
  })
  reportName?: string;

  @ApiPropertyOptional({ example: 2026 })
  @IsOptional()
  year?: string | number;

  @ApiPropertyOptional({
    example: LaborAccidentReportPeriodType.SIX_MONTHS,
    enum: LaborAccidentReportPeriodType,
  })
  @IsOptional()
  @IsIn(Object.values(LaborAccidentReportPeriodType), {
    message: 'Kỳ báo cáo không hợp lệ',
  })
  periodType?: LaborAccidentReportPeriodType;

  @ApiPropertyOptional({
    example: '2026-07-01',
    description: 'Định dạng YYYY-MM-DD hoặc DD/MM/YYYY',
  })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({
    example: '2026-07-15',
    description: 'Định dạng YYYY-MM-DD hoặc DD/MM/YYYY',
  })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  isActive?: string | boolean;
}

export class UpdateLaborAccidentReportPeriodStatusDto {
  @ApiProperty({ example: true })
  @IsNotEmpty({ message: 'Trạng thái không được để trống' })
  isActive!: string | boolean;
}
