import { IsNotEmpty, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsNotEmpty({
    message: 'Mật khẩu cũ không được để trống',
  })
  oldPassword: string;

  @IsNotEmpty({
    message: 'Mật khẩu mới không được để trống',
  })
  @MinLength(6, {
    message: 'Mật khẩu mới phải có ít nhất 6 ký tự',
  })
  newPassword: string;

  @IsNotEmpty({
    message: 'Nhập lại mật khẩu mới không được để trống',
  })
  confirmPassword: string;
}
