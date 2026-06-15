import { IsEmail, IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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
