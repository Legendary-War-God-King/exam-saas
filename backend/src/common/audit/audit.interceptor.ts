import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import type { Request } from 'express';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Audit');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context
      .switchToHttp()
      .getRequest<Request & { user?: { id?: string; tenantId?: string; role?: string } }>();
    const { method, url } = req;
    const userId = req.user?.id ?? 'anonymous';
    const tenantId = req.user?.tenantId ?? '-';
    const role = req.user?.role ?? '-';

    const start = Date.now();
    return next.handle().pipe(
      tap(() => {
        const ms = Date.now() - start;
        if (method !== 'GET') {
          this.logger.log(`[${role}] ${userId}@${tenantId} ${method} ${url} ${ms}ms`);
        }
      }),
    );
  }
}
