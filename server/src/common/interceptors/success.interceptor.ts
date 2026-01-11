import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BaseResponse } from '../interfaces/base-response.interface';
import { ModuleNames } from '../enums/api.enum';

@Injectable()
export class SuccessInterceptor<T>
  implements NestInterceptor<T, BaseResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<BaseResponse<T>> {
    const request = context.switchToHttp().getRequest();
    const requestId = request.id;
    const path = request.route.path;
    const module = this.getModuleFromPath(path);

    return next.handle().pipe(
      map((data) => ({
        success: true,
        statusCode: context.switchToHttp().getResponse().statusCode,
        message:
          context.switchToHttp().getResponse().message || 'Request successful',
        module: module,
        data,
        timestamp: new Date().toISOString(),
        requestId,
      })),
    );
  }

  private getModuleFromPath(path: string): ModuleNames {
    if (path.includes('/auth')) return ModuleNames.AUTH;
    if (path.includes('/todos')) return ModuleNames.TODO;
    if (path.includes('/users')) return ModuleNames.USER;
    if (path.includes('/rbac')) return ModuleNames.RBAC;
    if (path.includes('/organizations')) return ModuleNames.ORGANIZATION;
    if (path.includes('/employees')) return ModuleNames.EMPLOYEE;
    if (path.includes('/students')) return ModuleNames.STUDENT;
    if (path.includes('/courses')) return ModuleNames.COURSE;
    if (path.includes('/cohorts')) return ModuleNames.COHORT;
    if (path.includes('/classes')) return ModuleNames.CLASS;
    if (path.includes('/enrollments')) return ModuleNames.ENROLLMENT;
    if (path.includes('/enquiries')) return ModuleNames.ENQUIRY;
    if (path.includes('/feedbacks')) return ModuleNames.FEEDBACK;
    if (path.includes('/payments')) return ModuleNames.PAYMENT;
    if (path.includes('/expenses')) return ModuleNames.EXPENSE;
    if (path.includes('/audit-logs')) return ModuleNames.AUDIT_LOG;
    if (path.includes('/notifications')) return ModuleNames.NOTIFICATION;
    if (path.includes('/analytics')) return ModuleNames.ANALYTICS;
    if (path.includes('/worker')) return ModuleNames.WORKER;
    if (path.includes('/ws')) return ModuleNames.WS;
    if (path === '/') return ModuleNames.APP;
    return ModuleNames.APP;
  }
}
