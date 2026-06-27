import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';

import { PermissionsGuard } from './permissions.guard';
import { RolesGuard } from './roles.guard';

@Injectable()
export class SelfOrUserManagementGuard implements CanActivate {
  constructor(
    private readonly rolesGuard: RolesGuard,
    private readonly permissionsGuard: PermissionsGuard,
  ) {}

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{
      params?: { id?: string };
      user?: { id?: number };
    }>();
    const targetUserId = Number(request.params?.id);

    if (
      Number.isInteger(targetUserId) &&
      targetUserId > 0 &&
      targetUserId === request.user?.id
    ) {
      return true;
    }

    return (
      this.rolesGuard.canActivate(context) &&
      this.permissionsGuard.canActivate(context)
    );
  }
}
