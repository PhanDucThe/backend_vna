import type { ExecutionContext } from '@nestjs/common';

import { SelfOrUserManagementGuard } from './self-or-user-management.guard';

function createContext(userId: number, targetId: string) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        params: { id: targetId },
        user: { id: userId },
      }),
    }),
  } as ExecutionContext;
}

describe('SelfOrUserManagementGuard', () => {
  it('allows an authenticated user to update their own id', () => {
    const rolesGuard = { canActivate: jest.fn() };
    const permissionsGuard = { canActivate: jest.fn() };
    const guard = new SelfOrUserManagementGuard(
      rolesGuard as never,
      permissionsGuard as never,
    );

    expect(guard.canActivate(createContext(10, '10'))).toBe(true);
    expect(rolesGuard.canActivate).not.toHaveBeenCalled();
    expect(permissionsGuard.canActivate).not.toHaveBeenCalled();
  });

  it('keeps role and permission checks for a different target id', () => {
    const rolesGuard = { canActivate: jest.fn().mockReturnValue(true) };
    const permissionsGuard = { canActivate: jest.fn().mockReturnValue(true) };
    const context = createContext(10, '20');
    const guard = new SelfOrUserManagementGuard(
      rolesGuard as never,
      permissionsGuard as never,
    );

    expect(guard.canActivate(context)).toBe(true);
    expect(rolesGuard.canActivate).toHaveBeenCalledWith(context);
    expect(permissionsGuard.canActivate).toHaveBeenCalledWith(context);
  });

  it('denies another target when management role check fails', () => {
    const rolesGuard = { canActivate: jest.fn().mockReturnValue(false) };
    const permissionsGuard = { canActivate: jest.fn().mockReturnValue(true) };
    const guard = new SelfOrUserManagementGuard(
      rolesGuard as never,
      permissionsGuard as never,
    );

    expect(guard.canActivate(createContext(10, '20'))).toBe(false);
    expect(permissionsGuard.canActivate).not.toHaveBeenCalled();
  });
});
