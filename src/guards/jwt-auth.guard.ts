import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = any>(
    err: any,
    user: any,
    _info: any,
    _context: ExecutionContext,
    _status?: any,
  ): TUser {
    if (err) {
      throw err;
    }

    if (!user) {
      throw new UnauthorizedException(
        'Vui lòng đăng nhập để thực hiện chức năng này',
      );
    }

    return user as TUser;
  }
}
