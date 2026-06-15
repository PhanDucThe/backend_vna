import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListBusinessesQueryDto {
  @ApiPropertyOptional({ example: '1' })
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional({ example: '10' })
  @IsOptional()
  @IsString()
  limit?: string;

  @ApiPropertyOptional({ example: 'VNA', description: 'Tim kiem chung' })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiPropertyOptional({ example: 'VNA' })
  @IsOptional()
  @IsString()
  businessName?: string;

  @ApiPropertyOptional({ example: '0312345678' })
  @IsOptional()
  @IsString()
  taxCode?: string;

  @ApiPropertyOptional({ example: 'Cong ty TNHH 1 thanh vien' })
  @IsOptional()
  @IsString()
  businessType?: string;

  @ApiPropertyOptional({ example: '4669' })
  @IsOptional()
  @IsString()
  industryCode?: string;

  @ApiPropertyOptional({ example: 'Ban buon' })
  @IsOptional()
  @IsString()
  industryName?: string;

  @ApiPropertyOptional({ example: 'Hiep Binh Phuoc' })
  @IsOptional()
  @IsString()
  wardCommune?: string;

  @ApiPropertyOptional({ example: 'true' })
  @IsOptional()
  @IsString()
  isActive?: string;
}
