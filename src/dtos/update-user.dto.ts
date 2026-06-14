import {
  IsBooleanString,
  IsEmail,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  dateOfBirth?: string;

  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @IsString()
  roleId?: string;

  @IsOptional()
  @IsString()
  roleCode?: string;

  @IsOptional()
  @IsString()
  role?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsBooleanString()
  removeAvatar?: string;

  @IsOptional()
  @IsString()
  provinceCity?: string;

  @IsOptional()
  @IsString()
  wardCommune?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsBooleanString()
  isActive?: string;
}
