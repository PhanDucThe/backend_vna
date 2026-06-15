import { IsNotEmpty, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({ example: '123456' })
  @IsNotEmpty({
    message: 'Mật khẩu cũ không được để trống',
  })
  oldPassword!: string;

  @ApiProperty({ example: '654321', minLength: 6 })
  @IsNotEmpty({
    message: 'Mật khẩu mới không được để trống',
  })
  @MinLength(6, {
    message: 'Mật khẩu mới phải có ít nhất 6 ký tự',
  })
  newPassword!: string;

  @ApiProperty({ example: '654321', minLength: 6 })
  @IsNotEmpty({
    message: 'Nhập lại mật khẩu mới không được để trống',
  })
  confirmPassword!: string;
}
