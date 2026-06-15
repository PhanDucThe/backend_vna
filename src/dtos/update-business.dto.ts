import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

import { BUSINESS_TYPES } from './create-business.dto';

export class UpdateBusinessDto {
  @ApiPropertyOptional({ example: 'Cong ty co phan cong nghe quoc te VNA' })
  @IsOptional()
  @IsString()
  businessName?: string;

  @ApiPropertyOptional({
    example: 'VNA International Technology Joint Stock Company',
  })
  @IsOptional()
  @IsString()
  foreignName?: string;

  @ApiPropertyOptional({
    example: '0312345678',
    description: '10 chu so hoac 10 so-3 so',
  })
  @IsOptional()
  @Matches(/^\d{10}(-\d{3})?$/, {
    message: 'Ma so thue phai gom 10 so hoac dang 10 so-3 so',
  })
  taxCode?: string;

  @ApiPropertyOptional({
    example: 'Cong ty TNHH 1 thanh vien',
    enum: BUSINESS_TYPES,
  })
  @IsOptional()
  @IsIn(BUSINESS_TYPES, { message: 'Loai hinh kinh doanh khong hop le' })
  businessType?: string;

  @ApiPropertyOptional({ example: '4669', description: 'Ma cap 4 VSIC' })
  @IsOptional()
  @Matches(/^\d{4}$/, {
    message: 'Ma nganh nghe kinh doanh cap 4 phai gom 4 chu so',
  })
  industryCode?: string;

  @ApiPropertyOptional({
    example: 'Ban buon chuyen doanh khac chua duoc phan vao dau',
  })
  @IsOptional()
  @IsString()
  industryName?: string;

  @ApiPropertyOptional({ example: '2020-01-01' })
  @IsOptional()
  @IsString()
  licenseIssueDate?: string;

  @ApiPropertyOptional({ example: 'Thanh pho Ho Chi Minh' })
  @IsOptional()
  @IsString()
  provinceCity?: string;

  @ApiPropertyOptional({ example: 'Phuong Hiep Binh Phuoc' })
  @IsOptional()
  @IsString()
  wardCommune?: string;

  @ApiPropertyOptional({ example: '162 duong so 2, khu do thi Van Phuc' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'vna@gmail.com' })
  @IsOptional()
  @IsEmail({}, { message: 'Email khong hop le' })
  email?: string;

  @ApiPropertyOptional({ example: '02812345678' })
  @IsOptional()
  @IsString()
  agencyPhone?: string;

  @ApiPropertyOptional({ example: 'Thanh pho Ho Chi Minh' })
  @IsOptional()
  @IsString()
  operatingProvinceCity?: string;

  @ApiPropertyOptional({ example: 'Phuong Hiep Binh Phuoc' })
  @IsOptional()
  @IsString()
  operatingWardCommune?: string;

  @ApiPropertyOptional({ example: '162 duong so 2, khu do thi Van Phuc' })
  @IsOptional()
  @IsString()
  businessLocation?: string;

  @ApiPropertyOptional({ example: 'Nguyen Van A' })
  @IsOptional()
  @IsString()
  representativeName?: string;

  @ApiPropertyOptional({ example: '0909123456' })
  @IsOptional()
  @IsString()
  representativePhone?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  isActive?: string | boolean;

  @ApiPropertyOptional({ example: '["Giay phep kinh doanh","Giay to khac"]' })
  @IsOptional()
  @IsString()
  attachmentNames?: string;
}
