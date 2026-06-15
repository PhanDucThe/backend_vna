import { IsBoolean, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: 'admin',
    description: 'Ten dang nhap cua tai khoan',
  })
  @IsNotEmpty({
    message: 'Tên đăng nhập không được để trống',
  })
  username!: string;

  @ApiProperty({
    example: '123456',
    description: 'Mat khau dang nhap',
  })
  @IsNotEmpty({
    message: 'Mật khẩu không được để trống',
  })
  password!: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Ghi nho dang nhap de refresh token co thoi han dai hon',
  })
  @IsOptional()
  @IsBoolean({
    message: 'rememberMe phải là kiểu boolean',
  })
  rememberMe?: boolean;
}
