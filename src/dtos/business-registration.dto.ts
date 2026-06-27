import { ApiProperty, OmitType } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';

import { CreateBusinessDto } from './create-business.dto';

export class SendBusinessRegistrationOtpDto {
  @ApiProperty({
    example: 'business@example.com',
    description: 'Email nhận mã OTP xác thực đăng ký tài khoản doanh nghiệp',
  })
  @IsNotEmpty({ message: 'Email không được để trống' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email!: string;

  @ApiProperty({
    example: '0312345678',
    description: 'Mã số thuế của doanh nghiệp để kiểm tra trùng',
    required: false,
  })
  @IsOptional()
  @IsString()
  taxCode?: string;
}

export class VerifyBusinessRegistrationOtpDto extends SendBusinessRegistrationOtpDto {
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
