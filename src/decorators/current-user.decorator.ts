import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentUserData {
  id: number;
  username: string;
  roles: string[];
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): CurrentUserData => {
    const request = context.switchToHttp().getRequest();
    return request.user;
  },
);
