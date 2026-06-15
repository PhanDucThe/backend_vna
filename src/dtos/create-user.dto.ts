import {
  IsBooleanString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'user01' })
  @IsNotEmpty({ message: 'Ten dang nhap khong duoc de trong' })
  @IsString()
  username!: string;

  @ApiProperty({ example: '123456', minLength: 6 })
  @IsNotEmpty({ message: 'Mat khau khong duoc de trong' })
  @IsString()
  @MinLength(6, { message: 'Mat khau phai co it nhat 6 ky tu' })
  password!: string;

  @ApiProperty({ example: 'Nguyen Van A' })
  @IsNotEmpty({ message: 'Ho va ten khong duoc de trong' })
  @IsString()
  fullName!: string;

  @ApiProperty({ example: 'user01@gmail.com' })
  @IsNotEmpty({ message: 'Email khong duoc de trong' })
  @IsEmail({}, { message: 'Email khong hop le' })
  email!: string;

  @ApiPropertyOptional({ example: 'Nam' })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional({ example: '1995-06-01', description: 'YYYY-MM-DD' })
  @IsOptional()
  @IsString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ example: 'Chuyen vien' })
  @IsOptional()
  @IsString()
  position?: string;

  @ApiPropertyOptional({ example: '2' })
  @IsOptional()
  @IsString()
  roleId?: string;

  @ApiPropertyOptional({ example: 'USER' })
  @IsOptional()
  @IsString()
  roleCode?: string;

  @ApiPropertyOptional({ example: 'USER' })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({ example: 'Thanh pho Ho Chi Minh' })
  @IsOptional()
  @IsString()
  provinceCity?: string;

  @ApiPropertyOptional({ example: 'Phuong Go Vap' })
  @IsOptional()
  @IsString()
  wardCommune?: string;

  @ApiPropertyOptional({ example: '123 Le Loi' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'true' })
  @IsOptional()
  @IsBooleanString()
  isActive?: string;
}
