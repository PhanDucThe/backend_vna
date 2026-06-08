import { IsEmail, IsNotEmpty, Matches } from 'class-validator';

export class VerifyChangeGmailOtpDto {
  @Matches(/^\d{6}$/, { message: 'OTP phải gồm 6 chữ số' })
  otp: string;
}

export class UpdateChangeGmailDto {
  @IsEmail({}, { message: 'Email mới không hợp lệ' })
  @IsNotEmpty({ message: 'Email mới không được để trống' })
  newEmail: string;
}
