import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { LaborAccidentReportDetailSection } from '../entities/labor-accident-report-detail.entity';
import { LaborAccidentReportStatus } from '../entities/labor-accident-report.entity';
import { LaborAccidentReportPeriodType } from '../entities/labor-accident-report-period.entity';

export class ListMyLaborAccidentReportsQueryDto {
  @ApiPropertyOptional({ example: '1' })
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional({ example: '10' })
  @IsOptional()
  @IsString()
  limit?: string;

  @ApiPropertyOptional({ example: '2026' })
  @IsOptional()
  @IsString()
  year?: string;

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
    example: LaborAccidentReportStatus.DRAFT,
    enum: LaborAccidentReportStatus,
  })
  @IsOptional()
  @IsIn(Object.values(LaborAccidentReportStatus), {
    message: 'Trạng thái báo cáo không hợp lệ',
  })
  status?: LaborAccidentReportStatus;
}

export class ListLaborAccidentReportsQueryDto extends ListMyLaborAccidentReportsQueryDto {
  @ApiPropertyOptional({ example: '1' })
  @IsOptional()
  @IsString()
  reportPeriodId?: string;

  @ApiPropertyOptional({ example: 'Công ty TNHH Kiểm Thử' })
  @IsOptional()
  @IsString()
  businessName?: string;

  @ApiPropertyOptional({ example: '0866192601' })
  @IsOptional()
  @IsString()
  taxCode?: string;

  @ApiPropertyOptional({ example: 'Thành phố Hồ Chí Minh' })
  @IsOptional()
  @IsString()
  provinceCity?: string;

  @ApiPropertyOptional({ example: 'Phường Hiệp Bình Phước' })
  @IsOptional()
  @IsString()
  wardCommune?: string;
}

export class LaborAccidentReportSummaryQueryDto {
  @ApiPropertyOptional({ example: '1' })
  @IsOptional()
  @IsString()
  reportPeriodId?: string;

  @ApiPropertyOptional({ example: '2026' })
  @IsOptional()
  @IsString()
  year?: string;

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
    example: LaborAccidentReportStatus.SUBMITTED,
    enum: LaborAccidentReportStatus,
  })
  @IsOptional()
  @IsIn(Object.values(LaborAccidentReportStatus), {
    message: 'Trạng thái báo cáo không hợp lệ',
  })
  status?: LaborAccidentReportStatus;

  @ApiPropertyOptional({ example: 'Thành phố Hồ Chí Minh' })
  @IsOptional()
  @IsString()
  provinceCity?: string;

  @ApiPropertyOptional({ example: 'Phường Hiệp Bình Phước' })
  @IsOptional()
  @IsString()
  wardCommune?: string;
}

export class SaveLaborAccidentReportDraftDto {
  @ApiProperty({ example: 1 })
  @IsNotEmpty({ message: 'Kỳ báo cáo không được để trống' })
  reportPeriodId!: string | number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  totalEmployees?: string | number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  femaleEmployees?: string | number;

  @ApiPropertyOptional({ example: '10000000' })
  @IsOptional()
  totalPayroll?: string | number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  totalAccidents?: string | number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  fatalAccidents?: string | number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  accidentsWithTwoOrMoreVictims?: string | number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  totalVictims?: string | number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  femaleVictims?: string | number;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  deathVictims?: string | number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  severeInjuryVictims?: string | number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  victimsNotUnderManagement?: string | number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  femaleVictimsNotUnderManagement?: string | number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  deathVictimsNotUnderManagement?: string | number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  severeInjuryVictimsNotUnderManagement?: string | number;

  @ApiPropertyOptional({ example: '2000000' })
  @IsOptional()
  medicalCost?: string | number;

  @ApiPropertyOptional({ example: '2000000' })
  @IsOptional()
  salaryPaymentCost?: string | number;

  @ApiPropertyOptional({ example: '2000000' })
  @IsOptional()
  allowanceCost?: string | number;

  @ApiPropertyOptional({
    example: '6000000',
    description:
      'Nếu không gửi, hệ thống tự tính bằng chi phí y tế + trả lương + bồi thường/trợ cấp.',
  })
  @IsOptional()
  totalCost?: string | number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  totalDaysOff?: string | number;

  @ApiPropertyOptional({ example: '20000000' })
  @IsOptional()
  propertyDamage?: string | number;

  @ApiPropertyOptional({
    type: 'string',
    description:
      'JSON array chi tiết báo cáo. Mỗi phần tử gồm section, orderNo, catalog ids và các chỉ tiêu số liệu.',
    example: JSON.stringify([
      {
        section: LaborAccidentReportDetailSection.ACCIDENT,
        orderNo: 1,
        accidentCauseCatalogId: 1,
        injuryFactorCatalogId: 12,
        occupationCatalogId: 24,
        totalAccidents: 1,
        totalVictims: 5,
        medicalCost: 2000000,
        salaryPaymentCost: 2000000,
        allowanceCost: 2000000,
        totalCost: 6000000,
        daysOff: 20,
        propertyDamage: 20000000,
      },
    ]),
  })
  @IsOptional()
  details?: string | unknown[];

  @ApiPropertyOptional({
    example: '["Báo cáo TNLĐ có dấu mộc"]',
    description: 'Tên hiển thị cho các file đính kèm, dạng JSON array hoặc chuỗi phân tách dấu phẩy.',
  })
  @IsOptional()
  @IsString()
  attachmentNames?: string;
}

export class SubmitLaborAccidentReportDto {
  @ApiPropertyOptional({
    example: '["Báo cáo TNLĐ có dấu mộc"]',
  })
  @IsOptional()
  @IsString()
  attachmentNames?: string;
}
