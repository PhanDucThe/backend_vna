import {
  IsBooleanString,
  IsEmail,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateUserDto {
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
