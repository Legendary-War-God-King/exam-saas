import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    if (req.user && req.user.tenantId) {
      req.tenant = { id: req.user.tenantId };
    }
    return true;
  }
}
