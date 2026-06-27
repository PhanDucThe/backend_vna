import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

import { ROLE_CODES } from '../constants/roles.constant';
import { Permission, PermissionType } from '../entities/permission.entity';
import { RolePermission } from '../entities/role-permission.entity';
import { Role } from '../entities/role.entity';

type PermissionSeed = {
  code: string;
  name: string;
  type: PermissionType;
  sortOrder: number;
  parentCode?: string;
};

const PERMISSIONS: PermissionSeed[] = [
  {
    code: 'ADMIN_G_DEPARTMENT',
    name: 'Department Group',
    type: PermissionType.GROUP,
    sortOrder: 1,
  },
  {
    code: 'ADMIN_C_DEPARTMENT_VIEW',
    name: 'View Department',
    type: PermissionType.COMPONENT,
    sortOrder: 1,
    parentCode: 'ADMIN_G_DEPARTMENT',
  },
  {
    code: 'ADMIN_C_DEPARTMENT_CREATE',
    name: 'Create Department',
    type: PermissionType.COMPONENT,
    sortOrder: 2,
    parentCode: 'ADMIN_G_DEPARTMENT',
  },
  {
    code: 'ADMIN_C_DEPARTMENT_UPDATE',
    name: 'Update Department',
    type: PermissionType.COMPONENT,
    sortOrder: 3,
    parentCode: 'ADMIN_G_DEPARTMENT',
  },
  {
    code: 'ADMIN_C_DEPARTMENT_DELETE',
    name: 'Delete Department',
    type: PermissionType.COMPONENT,
    sortOrder: 4,
    parentCode: 'ADMIN_G_DEPARTMENT',
  },
  {
    code: 'ADMIN_G_ROLE',
    name: 'Role Group',
    type: PermissionType.GROUP,
    sortOrder: 2,
  },
  {
    code: 'ADMIN_C_ROLE_VIEW',
    name: 'View Role',
    type: PermissionType.COMPONENT,
    sortOrder: 1,
    parentCode: 'ADMIN_G_ROLE',
  },
  {
    code: 'ADMIN_C_ROLE_CREATE',
    name: 'Create Role',
    type: PermissionType.COMPONENT,
    sortOrder: 2,
    parentCode: 'ADMIN_G_ROLE',
  },
  {
    code: 'ADMIN_C_ROLE_UPDATE',
    name: 'Update Role',
    type: PermissionType.COMPONENT,
    sortOrder: 3,
    parentCode: 'ADMIN_G_ROLE',
  },
  {
    code: 'ADMIN_C_ROLE_DELETE',
    name: 'Delete Role',
    type: PermissionType.COMPONENT,
    sortOrder: 4,
    parentCode: 'ADMIN_G_ROLE',
  },
  {
    code: 'ADMIN_G_USER',
    name: 'User Group',
    type: PermissionType.GROUP,
    sortOrder: 3,
  },
  {
    code: 'ADMIN_C_USER_VIEW',
    name: 'View User',
    type: PermissionType.COMPONENT,
    sortOrder: 1,
    parentCode: 'ADMIN_G_USER',
  },
  {
    code: 'ADMIN_C_USER_CREATE',
    name: 'Create User',
    type: PermissionType.COMPONENT,
    sortOrder: 2,
    parentCode: 'ADMIN_G_USER',
  },
  {
    code: 'ADMIN_C_USER_UPDATE',
    name: 'Update User',
    type: PermissionType.COMPONENT,
    sortOrder: 3,
    parentCode: 'ADMIN_G_USER',
  },
  {
    code: 'ADMIN_C_USER_DELETE',
    name: 'Delete User',
    type: PermissionType.COMPONENT,
    sortOrder: 4,
    parentCode: 'ADMIN_G_USER',
  },
];

const ROLES = [
  {
    code: ROLE_CODES.MANAGER,
    name: 'Manager',
    legacyCode: 'ADMIN',
    permissionCodes: PERMISSIONS.map((permission) => permission.code),
  },
  {
    code: ROLE_CODES.EMPLOYEE,
    name: 'Employee',
    legacyCode: 'USER',
    permissionCodes: ['ADMIN_G_DEPARTMENT', 'ADMIN_C_DEPARTMENT_VIEW'],
  },
  {
    code: ROLE_CODES.CEO,
    name: 'CEO',
    permissionCodes: PERMISSIONS.map((permission) => permission.code),
  },
];

@Injectable()
export class RoleSeedService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepository: Repository<Permission>,
    @InjectRepository(RolePermission)
    private readonly rolePermissionRepository: Repository<RolePermission>,
  ) {}

  async onApplicationBootstrap() {
    const permissionsByCode = await this.seedPermissions();
    await this.seedRoles(permissionsByCode);
  }

  private async seedPermissions() {
    const permissionsByCode = new Map<string, Permission>();

    for (const seed of PERMISSIONS.filter((item) => !item.parentCode)) {
      permissionsByCode.set(seed.code, await this.upsertPermission(seed, null));
    }

    for (const seed of PERMISSIONS.filter((item) => item.parentCode)) {
      const parent = permissionsByCode.get(seed.parentCode!);
      permissionsByCode.set(
        seed.code,
        await this.upsertPermission(seed, parent ?? null),
      );
    }

    return permissionsByCode;
  }

  private async upsertPermission(
    seed: PermissionSeed,
    parent: Permission | null,
  ) {
    const permission =
      (await this.permissionRepository.findOne({
        where: { code: seed.code },
      })) ?? this.permissionRepository.create();

    permission.code = seed.code;
    permission.name = seed.name;
    permission.type = seed.type;
    permission.sortOrder = seed.sortOrder;
    permission.parent = parent;
    return this.permissionRepository.save(permission);
  }

  private async seedRoles(permissionsByCode: Map<string, Permission>) {
    for (const seed of ROLES) {
      let role = await this.roleRepository.findOne({
        where: { code: seed.code },
      });
      const isExistingTargetRole = Boolean(role);

      if (!role && seed.legacyCode) {
        role = await this.roleRepository.findOne({
          where: { code: seed.legacyCode },
        });
      }

      const isNewRole = !role;
      role ??= this.roleRepository.create();
      if (!isExistingTargetRole) {
        role.code = seed.code;
        role.name = seed.name;
      }
      role.isSystem = true;
      role = await this.roleRepository.save(role);

      const assignedPermissionCount = await this.rolePermissionRepository.count(
        { where: { role: { id: role.id } } },
      );

      if (isNewRole || assignedPermissionCount === 0) {
        const permissions = await this.permissionRepository.find({
          where: {
            id: In(
              seed.permissionCodes
                .map((code) => permissionsByCode.get(code)?.id)
                .filter((id): id is number => id !== undefined),
            ),
          },
        });

        await this.rolePermissionRepository.save(
          permissions.map((permission) =>
            this.rolePermissionRepository.create({ role, permission }),
          ),
        );
      }
    }
  }
}
