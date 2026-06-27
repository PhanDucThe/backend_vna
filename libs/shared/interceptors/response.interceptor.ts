import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, unknown> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();

    return next.handle().pipe(
      map((response) => {
        const hasExplicitData =
          typeof response === 'object' &&
          response !== null &&
          Object.prototype.hasOwnProperty.call(response, 'data');

        return {
          success: true,
          statusCode: context.switchToHttp().getResponse().statusCode,
          message: response?.message || 'Thành công',
          data: hasExplicitData ? response.data : response,
          timestamp: new Date().toISOString(),
          path: request.url,
        };
      }),
    );
  }
}
