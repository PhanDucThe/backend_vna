import { BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { ROLE_CODES } from '../constants/roles.constant';
import type { CurrentUserData } from '../decorators/current-user.decorator';
import { UserService } from './user.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn(),
}));

const manager: CurrentUserData = {
  id: 10,
  username: 'manager',
  roles: [ROLE_CODES.MANAGER],
  permissions: [],
};

const ceo: CurrentUserData = {
  id: 11,
  username: 'ceo',
  roles: [ROLE_CODES.CEO],
  permissions: [],
};

function createRole(code: string, id = 1) {
  return {
    id,
    code,
    name: code,
  };
}

function createUser(roleCode: string, id = 20) {
  return {
    id,
    username: `user-${id}`,
    password: 'hashed-password',
    fullName: `User ${id}`,
    email: `user-${id}@example.com`,
    gender: null,
    dateOfBirth: null,
    avatar: null,
    position: null,
    provinceCity: null,
    wardCommune: null,
    address: null,
    isActive: true,
    userRoles: [{ role: createRole(roleCode) }],
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };
}

function createQueryBuilder(overrides: Record<string, unknown> = {}) {
  const queryBuilder = {
    leftJoinAndSelect: jest.fn(),
    distinct: jest.fn(),
    andWhere: jest.fn(),
    where: jest.fn(),
    orderBy: jest.fn(),
    addOrderBy: jest.fn(),
    skip: jest.fn(),
    take: jest.fn(),
    getOne: jest.fn().mockResolvedValue(null),
    getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    delete: jest.fn(),
    from: jest.fn(),
    execute: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };

  for (const method of [
    'leftJoinAndSelect',
    'distinct',
    'andWhere',
    'where',
    'orderBy',
    'addOrderBy',
    'skip',
    'take',
    'delete',
    'from',
  ] as const) {
    queryBuilder[method].mockReturnValue(queryBuilder);
  }

  return queryBuilder;
}

function createService(options?: {
  role?: ReturnType<typeof createRole>;
  users?: ReturnType<typeof createUser>[];
}) {
  const uniqueQueryBuilder = createQueryBuilder();
  const listQueryBuilder = createQueryBuilder({
    getManyAndCount: jest
      .fn()
      .mockResolvedValue([options?.users ?? [], options?.users?.length ?? 0]),
  });
  const userRepository = {
    createQueryBuilder: jest
      .fn()
      .mockReturnValueOnce(listQueryBuilder)
      .mockReturnValue(uniqueQueryBuilder),
    create: jest.fn((value: Record<string, unknown>) => value),
    save: jest.fn((value: Record<string, unknown>) =>
      Promise.resolve({ id: 20, ...value }),
    ),
    findOne: jest.fn(),
    remove: jest.fn(),
  };
  const roleQueryBuilder = createQueryBuilder({
    getOne: jest.fn().mockResolvedValue(options?.role ?? null),
  });
  const roleRepository = {
    createQueryBuilder: jest.fn().mockReturnValue(roleQueryBuilder),
    findOne: jest.fn(),
  };
  const userRoleDeleteQueryBuilder = createQueryBuilder();
  const userRoleRepository = {
    create: jest.fn((value: Record<string, unknown>) => value),
    save: jest.fn().mockResolvedValue(undefined),
    createQueryBuilder: jest.fn().mockReturnValue(userRoleDeleteQueryBuilder),
  };
  const cloudinaryService = {
    uploadImage: jest.fn(),
  };

  const service = new UserService(
    userRepository as never,
    roleRepository as never,
    userRoleRepository as never,
    { get: jest.fn() } as never,
    cloudinaryService as never,
  );

  return {
    service,
    userRepository,
    roleQueryBuilder,
    listQueryBuilder,
    cloudinaryService,
  };
}

describe('UserService role contract', () => {
  beforeEach(() => {
    jest.mocked(bcrypt.hash).mockResolvedValue('hashed-password' as never);
  });

  it('filters ADMIN as Role1 and Role3 and maps list response to ADMIN', async () => {
    const { service, listQueryBuilder } = createService({
      users: [
        createUser(ROLE_CODES.MANAGER, 1),
        createUser(ROLE_CODES.CEO, 2),
      ],
    });

    const response = await service.getUsers({ role: 'ADMIN' }, manager);

    expect(listQueryBuilder.andWhere).toHaveBeenCalledWith(
      'role.code IN (:...roleCodes)',
      {
        roleCodes: [ROLE_CODES.MANAGER, ROLE_CODES.CEO],
      },
    );
    expect(response.data.items.map((item) => item.roleCodes)).toEqual([
      ['ADMIN'],
      ['ADMIN'],
    ]);
    expect(response.data.items[0].roles[0].code).toBe('ADMIN');
  });

  it('filters USER as Role2', async () => {
    const { service, listQueryBuilder } = createService({
      users: [createUser(ROLE_CODES.EMPLOYEE)],
    });

    const response = await service.getUsers({ role: 'USER' }, manager);

    expect(listQueryBuilder.andWhere).toHaveBeenCalledWith(
      'role.code IN (:...roleCodes)',
      {
        roleCodes: [ROLE_CODES.EMPLOYEE],
      },
    );
    expect(response.data.items[0].roleCodes).toEqual(['USER']);
  });

  it('maps GET me and user detail roles to the API contract', async () => {
    const employee = createUser(ROLE_CODES.EMPLOYEE);
    const { service, userRepository } = createService();
    userRepository.findOne.mockResolvedValue(employee);

    const meResponse = await service.getMe(employee.id);
    const detailResponse = await service.getUserDetail(employee.id, manager);

    expect(meResponse.data.roles).toEqual(['USER']);
    expect(detailResponse.data.roleCode).toBe('USER');
    expect(detailResponse.data.roles[0].code).toBe('USER');
  });

  it('allows CEO to create ADMIN and resolves it to Role1 internally', async () => {
    const role = createRole(ROLE_CODES.MANAGER);
    const createdUser = createUser(ROLE_CODES.MANAGER);
    const { service, userRepository, roleQueryBuilder } = createService({
      role,
    });
    userRepository.findOne.mockResolvedValue(createdUser);

    const response = await service.createUser(
      {
        username: 'new-admin',
        password: '123456',
        fullName: 'New Admin',
        email: 'new-admin@example.com',
        roleCode: 'ADMIN',
      },
      ceo,
    );

    expect(roleQueryBuilder.where).toHaveBeenCalledWith(
      'LOWER(role.code) = :roleValue OR LOWER(role.name) = :roleValue',
      { roleValue: ROLE_CODES.MANAGER.toLowerCase() },
    );
    expect(response.data.roleCode).toBe('ADMIN');
    expect(response.data.roles[0].code).toBe('ADMIN');
  });

  it('does not allow Manager to assign an administrative role', async () => {
    const { service } = createService({
      role: createRole(ROLE_CODES.MANAGER),
    });

    await expect(
      service.createUser(
        {
          username: 'blocked-admin',
          password: '123456',
          fullName: 'Blocked Admin',
          email: 'blocked-admin@example.com',
          role: 'Role1',
        },
        manager,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('does not allow Manager to elevate a user during update', async () => {
    const targetUser = createUser(ROLE_CODES.EMPLOYEE);
    const { service, userRepository } = createService({
      role: createRole(ROLE_CODES.CEO, 3),
    });
    userRepository.findOne.mockResolvedValue(targetUser);

    await expect(
      service.updateUser(targetUser.id, { role: 'Role3' }, manager),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('accepts USER on update, stores Role2 and returns USER', async () => {
    const role = createRole(ROLE_CODES.EMPLOYEE, 2);
    const targetUser = createUser(ROLE_CODES.EMPLOYEE);
    const { service, userRepository, roleQueryBuilder } = createService({
      role,
    });
    userRepository.findOne.mockResolvedValue(targetUser);

    const response = await service.updateUser(
      targetUser.id,
      { roleCode: 'USER' },
      manager,
    );

    expect(roleQueryBuilder.where).toHaveBeenCalledWith(
      'LOWER(role.code) = :roleValue OR LOWER(role.name) = :roleValue',
      { roleValue: ROLE_CODES.EMPLOYEE.toLowerCase() },
    );
    expect(response.data.roleCode).toBe('USER');
    expect(response.data.roles[0].code).toBe('USER');
  });

  it('allows a user to update only their own safe profile fields', async () => {
    const targetUser = createUser(ROLE_CODES.EMPLOYEE);
    const self: CurrentUserData = {
      id: targetUser.id,
      username: targetUser.username,
      roles: [ROLE_CODES.EMPLOYEE],
      permissions: [],
    };
    const { service, userRepository } = createService();
    userRepository.findOne.mockResolvedValue(targetUser);

    const response = await service.updateUser(
      targetUser.id,
      {
        fullName: 'Updated Name',
        email: 'updated@example.com',
        provinceCity: 'Hà Nội',
        isActive: 'false',
      },
      self,
    );

    expect(response.data.fullName).toBe('Updated Name');
    expect(response.data.email).toBe('updated@example.com');
    expect(response.data.provinceCity).toBe('Hà Nội');
    expect(response.data.isActive).toBe(true);
    expect(response.data.roles[0].code).toBe('USER');
  });

  it('allows Manager to self-update without treating it as admin management', async () => {
    const targetUser = createUser(ROLE_CODES.MANAGER, manager.id);
    const { service, userRepository } = createService();
    userRepository.findOne.mockResolvedValue(targetUser);

    const response = await service.updateUser(
      targetUser.id,
      { fullName: 'Manager Updated' },
      manager,
    );

    expect(response.data.fullName).toBe('Manager Updated');
    expect(response.data.roles[0].code).toBe('ADMIN');
  });

  it('does not allow a normal user to update another profile', async () => {
    const targetUser = createUser(ROLE_CODES.EMPLOYEE);
    const anotherUser: CurrentUserData = {
      id: 999,
      username: 'another-user',
      roles: [ROLE_CODES.EMPLOYEE],
      permissions: [],
    };
    const { service } = createService();

    await expect(
      service.updateUser(targetUser.id, { fullName: 'Blocked' }, anotherUser),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it.each([
    [{ username: 'new-username' }],
    [{ password: 'new-password' }],
    [{ roleCode: 'ADMIN' }],
    [{ role: 'Role3' }],
  ])('blocks privilege-sensitive fields during self-update', async (payload) => {
    const targetUser = createUser(ROLE_CODES.EMPLOYEE);
    const self: CurrentUserData = {
      id: targetUser.id,
      username: targetUser.username,
      roles: [ROLE_CODES.EMPLOYEE],
      permissions: [],
    };
    const { service } = createService();

    await expect(
      service.updateUser(targetUser.id, payload, self),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('uploads and returns a new avatar during self-update', async () => {
    const targetUser = createUser(ROLE_CODES.EMPLOYEE);
    const self: CurrentUserData = {
      id: targetUser.id,
      username: targetUser.username,
      roles: [ROLE_CODES.EMPLOYEE],
      permissions: [],
    };
    const file = {
      mimetype: 'image/png',
      originalname: 'avatar.png',
    } as Express.Multer.File;
    const { service, userRepository, cloudinaryService } = createService();
    userRepository.findOne.mockResolvedValue(targetUser);
    cloudinaryService.uploadImage.mockResolvedValue({
      secure_url: 'https://cdn.example.com/avatar.png',
    });

    const response = await service.updateUser(
      targetUser.id,
      { fullName: targetUser.fullName },
      self,
      file,
    );

    expect(cloudinaryService.uploadImage).toHaveBeenCalledWith(file, 'users');
    expect(response.data.avatar).toBe(
      'https://cdn.example.com/avatar.png',
    );
  });

  it('removes an avatar during self-update', async () => {
    const targetUser = {
      ...createUser(ROLE_CODES.EMPLOYEE),
      avatar: 'https://cdn.example.com/old-avatar.png',
    };
    const self: CurrentUserData = {
      id: targetUser.id,
      username: targetUser.username,
      roles: [ROLE_CODES.EMPLOYEE],
      permissions: [],
    };
    const { service, userRepository } = createService();
    userRepository.findOne.mockResolvedValue(targetUser);

    const response = await service.updateUser(
      targetUser.id,
      { removeAvatar: 'true' },
      self,
    );

    expect(response.data.avatar).toBeNull();
  });
});
