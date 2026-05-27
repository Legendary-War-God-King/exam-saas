import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';

interface RequestWithUser {
  user?: { tenantId: string };
  tenant?: { id: string };
}

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<RequestWithUser>();
    if (req.user?.tenantId) {
      req.tenant = { id: req.user.tenantId };
    }
    return true;
  }
}
