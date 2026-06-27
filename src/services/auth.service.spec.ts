import * as bcrypt from 'bcrypt';

import { UnauthorizedException } from '@nestjs/common';

import { ROLE_CODES } from '../constants/roles.constant';
import { AuthService } from './auth.service';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

describe('AuthService role contract', () => {
  it('keeps internal roles in JWT and returns API roles from login', async () => {
    const userRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: 1,
        username: 'manager',
        password: 'hashed-password',
        fullName: 'Manager',
        email: 'manager@example.com',
        avatar: null,
        isActive: true,
        userRoles: [
          {
            role: {
              code: ROLE_CODES.MANAGER,
              rolePermissions: [
                { permission: { code: 'ADMIN_C_USER_VIEW' } },
              ],
            },
          },
        ],
      }),
    };
    const refreshTokenRepository = {
      create: jest.fn((value: Record<string, unknown>) => value),
      save: jest.fn().mockResolvedValue(undefined),
    };
    const jwtService = {
      signAsync: jest
        .fn()
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token'),
    };
    const configService = {
      get: jest.fn().mockReturnValue(undefined),
    };

    jest.mocked(bcrypt.compare).mockResolvedValue(true as never);
    jest.mocked(bcrypt.hash).mockResolvedValue('refresh-token-hash' as never);

    const service = new AuthService(
      userRepository as never,
      refreshTokenRepository as never,
      {} as never,
      jwtService as never,
      configService as never,
      {} as never,
    );

    const response = await service.login({
      username: 'manager',
      password: 'password',
    });

    expect(jwtService.signAsync).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        roles: [ROLE_CODES.MANAGER],
        permissions: ['ADMIN_C_USER_VIEW'],
      }),
      expect.any(Object),
    );
    expect(response.data.user.roles).toEqual(['ADMIN']);
    expect(response.data.user.permissions).toEqual(['ADMIN_C_USER_VIEW']);
  });
});

function createRefreshUser() {
  return {
    id: 1,
    username: 'manager',
    isActive: true,
    userRoles: [
      {
        role: {
          code: ROLE_CODES.MANAGER,
          rolePermissions: [
            { permission: { code: 'ADMIN_C_USER_VIEW' } },
          ],
        },
      },
    ],
  };
}

function createRefreshService(options?: {
  storedToken?: Record<string, unknown>;
  verifyError?: Error;
}) {
  const user = createRefreshUser();
  const storedToken = options?.storedToken ?? {
    id: 10,
    tokenHash: 'stored-token-hash',
    expiresAt: new Date(Date.now() + 60_000),
    isRevoked: false,
    user,
    createdAt: new Date(),
  };
  const refreshTokenRepository = {
    find: jest.fn().mockResolvedValue([storedToken]),
    save: jest.fn((value: Record<string, unknown>) => Promise.resolve(value)),
  };
  const jwtService = {
    verifyAsync: options?.verifyError
      ? jest.fn().mockRejectedValue(options.verifyError)
      : jest.fn().mockResolvedValue({
          sub: user.id,
          type: 'refresh_token',
        }),
    signAsync: jest.fn().mockResolvedValue('new-access-token'),
  };
  const configValues: Record<string, string> = {
    JWT_ACCESS_SECRET: 'access-secret',
    JWT_REFRESH_SECRET: 'refresh-secret',
    JWT_ACCESS_EXPIRES_IN: '20m',
    JWT_REFRESH_EXPIRES_IN: '2d',
    JWT_REFRESH_REMEMBER_EXPIRES_IN: '45d',
  };
  const configService = {
    get: jest.fn((key: string) => configValues[key]),
  };
  const service = new AuthService(
    {} as never,
    refreshTokenRepository as never,
    {} as never,
    jwtService as never,
    configService as never,
    {} as never,
  );

  return {
    service,
    storedToken,
    refreshTokenRepository,
    jwtService,
  };
}

describe('AuthService refresh token lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(bcrypt.compare).mockResolvedValue(true as never);
  });

  it('returns a new access token for a valid stored refresh token', async () => {
    const { service, refreshTokenRepository, jwtService } =
      createRefreshService();

    const response = await service.refreshAccessToken('valid-refresh-token');

    expect(jwtService.verifyAsync).toHaveBeenCalledWith(
      'valid-refresh-token',
      { secret: 'refresh-secret' },
    );
    expect(refreshTokenRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { user: { id: 1 } },
      }),
    );
    expect(bcrypt.compare).toHaveBeenCalledWith(
      'valid-refresh-token',
      'stored-token-hash',
    );
    expect(jwtService.signAsync).toHaveBeenCalledWith(
      {
        sub: 1,
        username: 'manager',
        roles: [ROLE_CODES.MANAGER],
        permissions: ['ADMIN_C_USER_VIEW'],
      },
      {
        secret: 'access-secret',
        expiresIn: '20m',
      },
    );
    expect(response.data).toEqual({
      accessToken: 'new-access-token',
      tokenType: 'Bearer',
      expiresIn: 1200,
    });
  });

  it('rejects a refresh token expired in the database', async () => {
    const { service } = createRefreshService({
      storedToken: {
        id: 10,
        tokenHash: 'stored-token-hash',
        expiresAt: new Date(Date.now() - 1000),
        isRevoked: false,
        user: createRefreshUser(),
        createdAt: new Date(),
      },
    });

    await expect(
      service.refreshAccessToken('expired-refresh-token'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a forged or invalidly signed refresh token', async () => {
    const { service, refreshTokenRepository } = createRefreshService({
      verifyError: new Error('invalid signature'),
    });

    await expect(
      service.refreshAccessToken('forged-refresh-token'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(refreshTokenRepository.find).not.toHaveBeenCalled();
  });

  it('rejects a signed token that does not match any stored hash', async () => {
    const { service } = createRefreshService();
    jest.mocked(bcrypt.compare).mockResolvedValue(false as never);

    await expect(
      service.refreshAccessToken('unknown-refresh-token'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a stored token that belongs to a different user', async () => {
    const differentUser = {
      ...createRefreshUser(),
      id: 2,
    };
    const { service } = createRefreshService({
      storedToken: {
        id: 10,
        tokenHash: 'stored-token-hash',
        expiresAt: new Date(Date.now() + 60_000),
        isRevoked: false,
        user: differentUser,
        createdAt: new Date(),
      },
    });

    await expect(
      service.refreshAccessToken('wrong-user-refresh-token'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects a revoked refresh token', async () => {
    const { service } = createRefreshService({
      storedToken: {
        id: 10,
        tokenHash: 'stored-token-hash',
        expiresAt: new Date(Date.now() + 60_000),
        isRevoked: true,
        user: createRefreshUser(),
        createdAt: new Date(),
      },
    });

    await expect(
      service.refreshAccessToken('revoked-refresh-token'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('revokes the matching refresh token on logout', async () => {
    const { service, storedToken, refreshTokenRepository } =
      createRefreshService();

    const response = await service.logout('valid-refresh-token');

    expect(storedToken).toEqual(
      expect.objectContaining({
        isRevoked: true,
      }),
    );
    expect(refreshTokenRepository.save).toHaveBeenCalledWith(storedToken);
    expect(response).toEqual({
      message: 'Đăng xuất thành công',
      data: null,
    });
  });
});
