import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ example: 'Role1' })
  @IsString()
  @IsNotEmpty({ message: 'Mã vai trò không được để trống' })
  code!: string;

  @ApiProperty({ example: 'Manager' })
  @IsString()
  @IsNotEmpty({ message: 'Tên vai trò không được để trống' })
  name!: string;

  @ApiPropertyOptional({
    type: [Number],
    example: [1, 2],
    description: 'Danh sách ID quyền được chọn trên cây quyền',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  permissionIds?: number[];
}

export class UpdateRoleDto extends PartialType(CreateRoleDto) {}

export class ListRolesQueryDto {
  @ApiPropertyOptional({ example: '1' })
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional({ example: '10' })
  @IsOptional()
  @IsString()
  limit?: string;

  @ApiPropertyOptional({ example: 'Role1' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ example: 'Manager' })
  @IsOptional()
  @IsString()
  name?: string;
}

export class ListPermissionsQueryDto {
  @ApiPropertyOptional({ example: 'ADMIN_C_DEPARTMENT_VIEW' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ example: 'View Department' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'Component', enum: ['Group', 'Component'] })
  @IsOptional()
  @IsString()
  type?: string;
}
