import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const BUSINESS_TYPES = [
  'Cong ty TNHH 1 thanh vien',
  'Cong ty TNHH 2 thanh vien tro len',
  'Cong ty co phan',
  'Cong ty hop danh',
  'Doanh nghiep tu nhan',
  'Ho kinh doanh',
  'Hop tac xa',
  'Chi nhanh',
] as const;

export class CreateBusinessDto {
  @ApiProperty({
    example: 'Cong ty co phan cong nghe quoc te VNA',
    description: 'Ten doanh nghiep theo giay dang ky kinh doanh',
  })
  @IsNotEmpty({ message: 'Tên doanh nghiệp không được để trống' })
  @IsString()
  businessName!: string;

  @ApiPropertyOptional({
    example: 'VNA International Technology Joint Stock Company',
    description: 'Ten viet bang tieng nuoc ngoai neu co',
  })
  @IsOptional()
  @IsString()
  foreignName?: string;

  @ApiProperty({
    example: '0312345678',
    description:
      'Ma so thue Viet Nam: 10 chu so, hoac ma don vi phu thuoc dang 10 so-3 so. Vi du: 0100109106-001',
  })
  @IsNotEmpty({ message: 'Mã số thuế không được để trống' })
  @Matches(/^\d{10}(-\d{3})?$/, {
    message: 'Mã số thuế phải gồm 10 số hoặc dạng 10 số-3 số',
  })
  taxCode!: string;

  @ApiProperty({
    example: 'Cong ty TNHH 1 thanh vien',
    enum: BUSINESS_TYPES,
  })
  @IsNotEmpty({ message: 'Loại hình kinh doanh không được để trống' })
  @IsIn(BUSINESS_TYPES, { message: 'Loại hình kinh doanh không hợp lệ' })
  businessType!: string;

  @ApiProperty({
    example: '4669',
    description: 'Ma nganh nghe kinh doanh cap 4 theo VSIC, gom dung 4 chu so',
  })
  @IsNotEmpty({ message: 'Mã ngành nghề cấp 4 không được để trống' })
  @Matches(/^\d{4}$/, {
    message: 'Mã ngành nghề kinh doanh cấp 4 phải gồm 4 chữ số',
  })
  industryCode!: string;

  @ApiProperty({
    example: 'Ban buon chuyen doanh khac chua duoc phan vao dau',
  })
  @IsNotEmpty({ message: 'Tên ngành nghề kinh doanh chính không được để trống' })
  @IsString()
  industryName!: string;

  @ApiPropertyOptional({ example: '2020-01-01', description: 'YYYY-MM-DD' })
  @IsOptional()
  @IsString()
  licenseIssueDate?: string;

  @ApiProperty({ example: 'Thanh pho Ho Chi Minh' })
  @IsNotEmpty({ message: 'Tỉnh/Thành phố ĐKKD không được để trống' })
  @IsString()
  provinceCity!: string;

  @ApiProperty({ example: 'Phuong Hiep Binh Phuoc' })
  @IsNotEmpty({ message: 'Phường/Xã ĐKKD không được để trống' })
  @IsString()
  wardCommune!: string;

  @ApiPropertyOptional({ example: '162 duong so 2, khu do thi Van Phuc' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'vna@gmail.com' })
  @IsOptional()
  @IsEmail({}, { message: 'Email không hợp lệ' })
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

  @ApiPropertyOptional({
    example: '["Giay phep kinh doanh","Giay to khac"]',
    description:
      'Ten hien thi cho tung file attachments. Gui JSON array string hoac chuoi cach nhau boi dau phay.',
  })
  @IsOptional()
  @IsString()
  attachmentNames?: string;
}
