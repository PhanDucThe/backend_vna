import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  Matches,
} from 'class-validator';

import { CreateBusinessDto } from './create-business.dto';

export class SendBusinessRegistrationOtpDto {
  @ApiProperty({
    example: 'business@example.com',
    description: 'Email nhận mã OTP xác thực đăng ký tài khoản doanh nghiệp',
  })
  @IsNotEmpty({ message: 'Email không được để trống' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email!: string;

  @ApiPropertyOptional({
    example: '0312345678',
    description: 'Mã số thuế gồm 10 số hoặc dạng 10 số-3 số',
  })
  @IsOptional()
  @Matches(/^\d{10}(-\d{3})?$/, {
    message: 'Mã số thuế phải gồm 10 số hoặc dạng 10 số-3 số',
  })
  taxCode?: string;
}

export class VerifyBusinessRegistrationOtpDto {
  @ApiProperty({
    example: 'business@example.com',
    description: 'Email đã nhận mã OTP đăng ký doanh nghiệp',
  })
  @IsNotEmpty({ message: 'Email không được để trống' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email!: string;

  @ApiProperty({ example: '123456', description: 'OTP gồm đúng 6 chữ số' })
  @Matches(/^\d{6}$/, { message: 'OTP phải gồm 6 chữ số' })
  otp!: string;
}

export class RegisterBusinessDto extends OmitType(CreateBusinessDto, [
  'email',
  'isActive',
] as const) {
  @ApiProperty({
    example: 'business@example.com',
    description: 'Email bắt buộc và phải được xác thực OTP trước khi đăng ký',
  })
  @IsNotEmpty({ message: 'Email không được để trống' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email!: string;
}
