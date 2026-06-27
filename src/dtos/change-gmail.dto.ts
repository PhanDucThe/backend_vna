import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendChangeEmailOtpQueryDto {
  @ApiPropertyOptional({
    example: 'new-email@gmail.com',
    description:
      'Email mới cần kiểm tra trùng và liên kết với phiên xác thực OTP',
  })
  @IsOptional()
  @IsEmail({}, { message: 'Email mới không hợp lệ' })
  newEmail?: string;
}

export class VerifyChangeGmailOtpDto {
  @ApiProperty({ example: '123456', description: 'OTP gom dung 6 chu so' })
  @Matches(/^\d{6}$/, { message: 'OTP phải gồm 6 chữ số' })
  otp!: string;
}

export class UpdateChangeGmailDto {
  @ApiProperty({ example: 'new-email@gmail.com' })
  @IsEmail({}, { message: 'Email mới không hợp lệ' })
  @IsNotEmpty({ message: 'Email mới không được để trống' })
  newEmail!: string;
}
