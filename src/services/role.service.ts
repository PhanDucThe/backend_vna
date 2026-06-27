import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';

import {
  CreateRoleDto,
  ListPermissionsQueryDto,
  ListRolesQueryDto,
  UpdateRoleDto,
} from '../dtos/role.dto';
import { Permission } from '../entities/permission.entity';
import { RolePermission } from '../entities/role-permission.entity';
import { Role } from '../entities/role.entity';
import { UserRole } from '../entities/user-role.entity';

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
    private readonly dataSource: DataSource,
  ) {}

  async getPermissions(query: ListPermissionsQueryDto) {
    const queryBuilder = this.permissionRepository
      .createQueryBuilder('permission')
      .leftJoinAndSelect('permission.parent', 'parent');

    if (query.code?.trim()) {
      queryBuilder.andWhere('LOWER(permission.code) LIKE :code', {
        code: this.toLikeValue(query.code),
      });
    }

    if (query.name?.trim()) {
      queryBuilder.andWhere('LOWER(permission.name) LIKE :name', {
        name: this.toLikeValue(query.name),
      });
    }

    if (query.type?.trim()) {
      queryBuilder.andWhere('LOWER(permission.type::text) = :type', {
        type: query.type.trim().toLowerCase(),
      });
    }

    const permissions = await queryBuilder
      .orderBy('COALESCE(parent.sortOrder, permission.sortOrder)', 'ASC')
      .addOrderBy('parent.id', 'ASC', 'NULLS FIRST')
      .addOrderBy('permission.sortOrder', 'ASC')
      .addOrderBy('permission.id', 'ASC')
      .getMany();

    const groups = permissions.filter((permission) => !permission.parent);
    const groupIds = new Set(groups.map((permission) => permission.id));

    for (const permission of permissions) {
      if (permission.parent && !groupIds.has(permission.parent.id)) {
        groups.push(permission.parent);
        groupIds.add(permission.parent.id);
      }
    }

    groups.sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);

    return {
      message: 'Lấy danh sách quyền thành công',
      data: {
        items: groups.map((group, index) => ({
          id: group.id,
          ordinal: this.toRoman(index + 1),
          type: group.type,
          code: group.code,
          name: group.name,
          sortOrder: group.sortOrder,
          children: permissions
            .filter((permission) => permission.parent?.id === group.id)
            .sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id)
            .map((permission, childIndex) => ({
              id: permission.id,
              ordinal: childIndex + 1,
              type: permission.type,
              code: permission.code,
              name: permission.name,
              sortOrder: permission.sortOrder,
              parentId: group.id,
            })),
        })),
      },
    };
  }

  async getRoles(query: ListRolesQueryDto) {
    const page = this.toPositiveNumber(query.page, 1);
    const limit = Math.min(this.toPositiveNumber(query.limit, 10), 100);
    const queryBuilder = this.roleRepository.createQueryBuilder('role');

    if (query.code?.trim()) {
      queryBuilder.andWhere('LOWER(role.code) LIKE :code', {
        code: this.toLikeValue(query.code),
      });
    }

    if (query.name?.trim()) {
      queryBuilder.andWhere('LOWER(role.name) LIKE :name', {
        name: this.toLikeValue(query.name),
      });
    }

    const [roles, totalItems] = await queryBuilder
      .orderBy('role.id', 'ASC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    const totalPages = Math.ceil(totalItems / limit);

    return {
      message: 'Lấy danh sách vai trò thành công',
      data: {
        items: roles.map((role) => this.mapRole(role)),
        meta: {
          page,
          limit,
          totalItems,
          totalPages,
          hasPreviousPage: page > 1,
          hasNextPage: page < totalPages,
        },
      },
    };
  }

  async getRole(id: number) {
    const role = await this.findRoleWithPermissions(id);
    return {
      message: 'Lấy chi tiết vai trò thành công',
      data: this.mapRole(role),
    };
  }

  async createRole(dto: CreateRoleDto) {
    const code = dto.code.trim();
    const name = dto.name.trim();
    await this.assertUniqueRole(code, name);

    const role = await this.dataSource.transaction(async (manager) => {
      const savedRole = await manager
        .getRepository(Role)
        .save(
          manager.getRepository(Role).create({ code, name, isSystem: false }),
        );
      await this.replacePermissions(
        manager,
        savedRole,
        dto.permissionIds ?? [],
      );
      return savedRole;
    });

    return {
      message: 'Thêm mới vai trò thành công',
      data: this.mapRole(await this.findRoleWithPermissions(role.id)),
    };
  }

  async updateRole(id: number, dto: UpdateRoleDto) {
    const existingRole = await this.findRoleWithPermissions(id);
    const code = dto.code?.trim() ?? existingRole.code;
    const name = dto.name?.trim() ?? existingRole.name;

    if (!code || !name) {
      throw new BadRequestException('Mã và tên vai trò không được để trống');
    }

    if (existingRole.isSystem && code !== existingRole.code) {
      throw new BadRequestException(
        'Không thể thay đổi mã của vai trò hệ thống',
      );
    }

    await this.assertUniqueRole(code, name, id);
    await this.dataSource.transaction(async (manager) => {
      existingRole.code = code;
      existingRole.name = name;
      await manager.getRepository(Role).save(existingRole);

      if (dto.permissionIds !== undefined) {
        await this.replacePermissions(manager, existingRole, dto.permissionIds);
      }
    });

    return {
      message: 'Cập nhật vai trò thành công',
      data: this.mapRole(await this.findRoleWithPermissions(id)),
    };
  }

  async deleteRole(id: number) {
    const role = await this.findRoleWithPermissions(id);
    if (role.isSystem) {
      throw new ConflictException('Không thể xóa vai trò hệ thống');
    }

    const userCount = await this.userRoleRepository.count({
      where: { role: { id } },
    });

    if (userCount > 0) {
      throw new ConflictException(
        'Không thể xóa vai trò đang được gán cho người dùng',
      );
    }

    await this.roleRepository.remove(role);
    return { message: 'Xóa vai trò thành công', data: { id } };
  }

  private async replacePermissions(
    manager: import('typeorm').EntityManager,
    role: Role,
    permissionIds: number[],
  ) {
    const uniqueIds = [...new Set(permissionIds)];
    const permissionRepository = manager.getRepository(Permission);
    const rolePermissionRepository = manager.getRepository(RolePermission);
    const permissions = uniqueIds.length
      ? await permissionRepository.find({
          where: { id: In(uniqueIds) },
          relations: { parent: true },
        })
      : [];

    if (permissions.length !== uniqueIds.length) {
      throw new BadRequestException('Danh sách quyền chứa quyền không tồn tại');
    }

    const normalizedPermissions = [...permissions];
    const selectedIds = new Set(permissions.map((permission) => permission.id));

    for (const permission of permissions) {
      if (permission.parent && !selectedIds.has(permission.parent.id)) {
        normalizedPermissions.push(permission.parent);
        selectedIds.add(permission.parent.id);
      }
    }

    await rolePermissionRepository.delete({ role: { id: role.id } });
    await rolePermissionRepository.save(
      normalizedPermissions.map((permission) =>
        rolePermissionRepository.create({ role, permission }),
      ),
    );
  }

  private async findRoleWithPermissions(id: number) {
    const role = await this.roleRepository.findOne({
      where: { id },
      relations: {
        rolePermissions: {
          permission: {
            parent: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException('Không tìm thấy vai trò');
    }
    return role;
  }

  private async assertUniqueRole(
    code: string,
    name: string,
    excludedId?: number,
  ) {
    const queryBuilder = this.roleRepository
      .createQueryBuilder('role')
      .where('(LOWER(role.code) = :code OR LOWER(role.name) = :name)', {
        code: code.toLowerCase(),
        name: name.toLowerCase(),
      });

    if (excludedId) {
      queryBuilder.andWhere('role.id != :excludedId', { excludedId });
    }

    if (await queryBuilder.getOne()) {
      throw new ConflictException('Mã hoặc tên vai trò đã tồn tại');
    }
  }

  private mapRole(role: Role) {
    const permissions = (role.rolePermissions ?? [])
      .map((item) => item.permission)
      .sort((a, b) => a.id - b.id);
    return {
      id: role.id,
      code: role.code,
      name: role.name,
      isSystem: role.isSystem,
      permissionIds: permissions.map((permission) => permission.id),
      permissions: permissions.map((permission) => ({
        id: permission.id,
        code: permission.code,
        name: permission.name,
        type: permission.type,
        parentId: permission.parent?.id ?? null,
      })),
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }

  private toLikeValue(value: string) {
    return `%${value.trim().toLowerCase()}%`;
  }

  private toPositiveNumber(value: string | undefined, fallback: number) {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  }

  private toRoman(value: number) {
    const numerals: [number, string][] = [
      [1000, 'M'],
      [900, 'CM'],
      [500, 'D'],
      [400, 'CD'],
      [100, 'C'],
      [90, 'XC'],
      [50, 'L'],
      [40, 'XL'],
      [10, 'X'],
      [9, 'IX'],
      [5, 'V'],
      [4, 'IV'],
      [1, 'I'],
    ];
    let remaining = value;
    return numerals.reduce((result, [number, numeral]) => {
      while (remaining >= number) {
        result += numeral;
        remaining -= number;
      }
      return result;
    }, '');
  }
}
