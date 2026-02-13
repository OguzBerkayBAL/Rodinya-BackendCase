import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

//Request ve response logging için kullanılır
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  //Request → Interceptor → Controller → Service → Response → Interceptor → Client
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const userId = request.user?.userId || 'anonymous';
    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse();
        const duration = Date.now() - startTime;
        this.logger.log(
          `[${method} ${url}] userId=${userId} status=${response.statusCode} duration=${duration}ms`,
        );
      }),
    );
  }
}
