import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { MANAGEMENT_ROLE_CODES } from '../constants/roles.constant';
import { Roles } from '../decorators/roles.decorator';
import { Permissions } from '../decorators/permissions.decorator';
import {
  CreateRoleDto,
  ListPermissionsQueryDto,
  ListRolesQueryDto,
  UpdateRoleDto,
} from '../dtos/role.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { PermissionsGuard } from '../guards/permissions.guard';
import { RoleService } from '../services/role.service';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(...MANAGEMENT_ROLE_CODES)
@ApiBearerAuth('access-token')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get('permissions')
  @ApiTags('Permissions')
  @ApiOperation({ summary: 'Danh sách cây quyền Group - Component' })
  @Permissions('ADMIN_C_ROLE_VIEW')
  getPermissions(@Query() query: ListPermissionsQueryDto) {
    return this.roleService.getPermissions(query);
  }

  @Get('roles')
  @ApiTags('Roles')
  @ApiOperation({ summary: 'Danh sách vai trò' })
  @Permissions('ADMIN_C_ROLE_VIEW')
  getRoles(@Query() query: ListRolesQueryDto) {
    return this.roleService.getRoles(query);
  }

  @Get('roles/:id')
  @ApiTags('Roles')
  @ApiOperation({ summary: 'Chi tiết vai trò và các quyền đã chọn' })
  @Permissions('ADMIN_C_ROLE_VIEW')
  getRole(@Param('id', ParseIntPipe) id: number) {
    return this.roleService.getRole(id);
  }

  @Post('roles')
  @ApiTags('Roles')
  @ApiOperation({ summary: 'Thêm mới vai trò và gán quyền' })
  @Permissions('ADMIN_C_ROLE_CREATE')
  createRole(@Body() dto: CreateRoleDto) {
    return this.roleService.createRole(dto);
  }

  @Patch('roles/:id')
  @ApiTags('Roles')
  @ApiOperation({ summary: 'Chỉnh sửa vai trò và danh sách quyền' })
  @Permissions('ADMIN_C_ROLE_UPDATE')
  updateRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateRoleDto,
  ) {
    return this.roleService.updateRole(id, dto);
  }

  @Delete('roles/:id')
  @ApiTags('Roles')
  @ApiOperation({ summary: 'Xóa vai trò chưa được gán cho người dùng' })
  @Permissions('ADMIN_C_ROLE_DELETE')
  deleteRole(@Param('id', ParseIntPipe) id: number) {
    return this.roleService.deleteRole(id);
  }
}
