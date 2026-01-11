import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { LoggerService } from './logger.service';

@Injectable()
export class LoggerInterceptor implements NestInterceptor {
  constructor(private readonly logger: LoggerService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const startTime = Date.now();
    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          const duration = Date.now() - startTime;
          this.logger.logRequest(request, response, duration);
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          this.logger.error(`Request failed: ${error.message}`, error.stack, {
            type: 'REQUEST_ERROR',
            method: request.method,
            url: request.url,
            duration,
          });
        },
      }),
    );
  }
}
