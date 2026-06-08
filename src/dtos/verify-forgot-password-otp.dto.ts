import { IsEmail, IsNotEmpty, Matches } from 'class-validator';

export class VerifyForgotPasswordOtpDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  email: string;

  @Matches(/^\d{6}$/, { message: 'OTP phải gồm 6 chữ số' })
  otp: string;
}
