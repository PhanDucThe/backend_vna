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
  'Công ty TNHH 1 thành viên',
  'Công ty TNHH 2 thành viên trở lên',
  'Công ty cổ phần',
  'Công ty hợp danh',
  'Doanh nghiệp tư nhân',
  'Hộ kinh doanh',
  'Hợp tác xã',
  'Chi nhánh',
] as const;

export class CreateBusinessDto {
  @ApiProperty({
    example: 'Công ty cổ phần công nghệ quốc tế VNA',
    description: 'Tên doanh nghiệp theo giấy đăng ký kinh doanh',
  })
  @IsNotEmpty({ message: 'Tên doanh nghiệp không được để trống' })
  @IsString()
  businessName!: string;

  @ApiPropertyOptional({
    example: 'VNA International Technology Joint Stock Company',
    description: 'Tên viết bằng tiếng nước ngoài nếu có',
  })
  @IsOptional()
  @IsString()
  foreignName?: string;

  @ApiProperty({
    example: '0312345678',
    description:
      'Mã số thuế Việt Nam: 10 chữ số, hoặc mã đơn vị phụ thuộc dạng 10 số-3 số. Ví dụ: 0100109106-001',
  })
  @IsNotEmpty({ message: 'Mã số thuế không được để trống' })
  @Matches(/^\d{10}(-\d{3})?$/, {
    message: 'Mã số thuế phải gồm 10 số hoặc dạng 10 số-3 số',
  })
  taxCode!: string;

  @ApiProperty({
    example: 'Công ty TNHH 1 thành viên',
    enum: BUSINESS_TYPES,
  })
  @IsNotEmpty({ message: 'Loại hình kinh doanh không được để trống' })
  @IsIn(BUSINESS_TYPES, { message: 'Loại hình kinh doanh không hợp lệ' })
  businessType!: string;

  @ApiProperty({
    example: '4669',
    description: 'Mã ngành nghề kinh doanh cấp 4 theo VSIC, gồm đúng 4 chữ số',
  })
  @IsNotEmpty({ message: 'Mã ngành nghề cấp 4 không được để trống' })
  @Matches(/^\d{4}$/, {
    message: 'Mã ngành nghề kinh doanh cấp 4 phải gồm 4 chữ số',
  })
  industryCode!: string;

  @ApiProperty({
    example: 'Bán buôn chuyên doanh khác chưa được phân vào đâu',
  })
  @IsNotEmpty({ message: 'Tên ngành nghề kinh doanh chính không được để trống' })
  @IsString()
  industryName!: string;

  @ApiPropertyOptional({
    example: '2020-01-01',
    description: 'Ngày cấp giấy phép theo định dạng YYYY-MM-DD',
  })
  @IsOptional()
  @IsString()
  licenseIssueDate?: string;

  @ApiProperty({ example: 'Thành phố Hồ Chí Minh' })
  @IsNotEmpty({ message: 'Tỉnh/Thành phố ĐKKD không được để trống' })
  @IsString()
  provinceCity!: string;

  @ApiProperty({ example: 'Phường Hiệp Bình Phước' })
  @IsNotEmpty({ message: 'Phường/Xã ĐKKD không được để trống' })
  @IsString()
  wardCommune!: string;

  @ApiPropertyOptional({ example: '162 đường số 2, khu đô thị Vạn Phúc' })
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

  @ApiPropertyOptional({ example: 'Thành phố Hồ Chí Minh' })
  @IsOptional()
  @IsString()
  operatingProvinceCity?: string;

  @ApiPropertyOptional({ example: 'Phường Hiệp Bình Phước' })
  @IsOptional()
  @IsString()
  operatingWardCommune?: string;

  @ApiPropertyOptional({ example: '162 đường số 2, khu đô thị Vạn Phúc' })
  @IsOptional()
  @IsString()
  businessLocation?: string;

  @ApiPropertyOptional({ example: 'Nguyễn Văn A' })
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
    example: '["Giấy phép kinh doanh","Giấy tờ khác"]',
    description:
      'Tên hiển thị cho từng file đính kèm. Gửi JSON array string hoặc chuỗi cách nhau bởi dấu phẩy.',
  })
  @IsOptional()
  @IsString()
  attachmentNames?: string;
}
